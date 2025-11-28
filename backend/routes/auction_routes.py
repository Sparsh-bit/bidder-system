# backend/routes/auction_routes.py
from flask import Blueprint, request, jsonify
from backend.models.dqn_agent import DQNAgent
import numpy as np
import time
import threading
from uuid import uuid4
import torch
from datetime import datetime

auction_bp = Blueprint('auction_bp', __name__)
from backend.utils.supabase_client import supabase
from backend.utils.auth_middleware import require_auth



# ----------------------------
# In-memory stores
# ----------------------------
auctions = {}
user_agents = {}
running_threads = set() # Track active auction threads

# Instantiate a single DQNAgent for inference on the server (force CPU)
dqn_agent = DQNAgent(agent_id='dqn1', state_size=4, action_size=10, device=torch.device("cpu"))


# ----------------------------
# Helper Functions
# ----------------------------
def initialize_user_agents(user_id):
    """Initialize default AI agents per user if not already present."""
    if user_id not in user_agents:
        user_agents[user_id] = {
            "alpha": {
                "id": f"alpha_{user_id}",
                "name": "Alpha Bot",
                "budget": 10000,
                "remainingBudget": 10000,
                "totalSpent": 0,
                "isActive": True,
                "strategyType": "reinforcement_learning",
            },
            "beta": {
                "id": f"beta_{user_id}",
                "name": "Beta Bot",
                "budget": 8000,
                "remainingBudget": 8000,
                "totalSpent": 0,
                "isActive": True,
                "strategyType": "heuristic",
            },
            "gamma": {
                "id": f"gamma_{user_id}",
                "name": "Gamma Bot",
                "budget": 15000,
                "remainingBudget": 15000,
                "totalSpent": 0,
                "isActive": True,
                "strategyType": "reinforcement_learning",
            },
        }


# ----------------------------
# Create Auction
# ----------------------------
@auction_bp.route('/create', methods=['POST'])
@require_auth
def create_auction():
    data = request.get_json()
    print(f"📝 Received create_auction request: {data}")
    auction_id = str(uuid4())

    auctions[auction_id] = {
        'id': auction_id,
        'title': data.get('title'),
        'description': data.get('description'),
        'startingPrice': float(data.get('startingPrice', 0)),
        'reservePrice': float(data.get('reservePrice', 0)),
        'increment': float(data.get('increment', 1)),
        'startTime': time.time() * 1000,
        'endTime': time.time() * 1000 + float(data.get('duration', 60)) * 1000,
        'currentPrice': float(data.get('startingPrice', 0)),
        'status': 'pending',
        'participants': [],
        'selectedAgents': {},  # userId → agentId
        'bids': [],
        'winnerId': None,
        'winnerName': None,
        'winnerType': None,
        'winningPrice': None,
    }

    print(f"✅ Auction {auction_id} created in memory. Total auctions: {len(auctions)}")
    
    # Persist to Supabase using User Token (RLS)
    token = request.headers.get("Authorization").split(" ")[1]
    from backend.utils.supabase_client import get_authenticated_client
    
    try:
        auth_client = get_authenticated_client(token)
        print(f"💾 Persisting auction {auction_id} to Supabase (User Context)...")
        auth_client.table('auctions').insert({
            'id': auction_id,
            'title': data.get('title'),
            'description': data.get('description'),
            'starting_price': float(data.get('startingPrice', 0)),
            'current_price': float(data.get('startingPrice', 0)),
            'status': 'pending',
            'start_time': datetime.fromtimestamp(auctions[auction_id]['startTime']/1000).isoformat(),
            'end_time': datetime.fromtimestamp(auctions[auction_id]['endTime']/1000).isoformat(),
            'created_by': data.get('created_by')
        }).execute()
        print(f"✅ Auction {auction_id} persisted to Supabase.")
    except Exception as e:
        print(f"❌ Error creating auction in Supabase: {e}")

    return jsonify({'auction': auctions[auction_id]}), 201


# ----------------------------
# Get Auctions
# ----------------------------
@auction_bp.route('/get-auction', methods=['GET'])
def get_auctions():
    # print(f"🔍 get_auctions called. Total in memory: {len(auctions)}")
    current_time = time.time() * 1000
    for auction in list(auctions.values()):
        if auction['status'] == 'active' and current_time >= auction['endTime']:
            finalize_auction(auction['id'])
    return jsonify({'auctions': list(auctions.values())}), 200


# ----------------------------
# Get User Agents
# ----------------------------
@auction_bp.route('/get-agents/<user_id>', methods=['GET'])
def get_user_agents(user_id):
    initialize_user_agents(user_id)
    return jsonify({'agents': list(user_agents[user_id].values())}), 200


# ----------------------------
# Start Auction
# ----------------------------
@auction_bp.route('/start', methods=['POST'])
@require_auth
def start_auction():
    data = request.get_json()
    auction_id = data.get('auction_id')
    user_id = data.get('user_id')
    selected_agent = data.get('selected_agent')

    if not all([auction_id, user_id, selected_agent]):
        return jsonify({'error': 'Missing parameters'}), 400

    if auction_id not in auctions:
        return jsonify({'error': 'Auction not found'}), 404

    initialize_user_agents(user_id)
    auction = auctions[auction_id]
    
    # Update participants
    auction['selectedAgents'][user_id] = selected_agent
    if user_id not in auction['participants']:
        auction['participants'].append(user_id)

    # If auction was pending, activate it
    if auction['status'] == 'pending':
        auction['status'] = 'active'
        auction['startTime'] = time.time() * 1000
        print(f"🎬 Auction {auction_id} started by {user_id}")
        
        # Update Supabase status
        if supabase:
            try:
                supabase.table('auctions').update({'status': 'active'}).eq('id', auction_id).execute()
            except Exception as e:
                print(f"Error updating status: {e}")

    # Ensure thread is running if active
    if auction['status'] == 'active' and auction_id not in running_threads:
        print(f"🔄 Restarting bidding thread for {auction_id}")
        threading.Thread(target=run_auto_bidding, args=(auction_id,), daemon=True).start()
        
        # Trigger an initial simulated bid
        simulate_single_bid(auction_id)

    # Emit auction_update to interested clients
    from backend.app import socketio
    socketio.emit('auction_update', {'auction': auction}, room=f'auction_{auction_id}')

    return jsonify({'auction': auction}), 200


# ----------------------------
# Auto Bidding Thread
# ----------------------------
def run_auto_bidding(auction_id):
    """Automatically triggers bidding every few seconds within app context."""
    # Import socketio and flask app lazily to avoid circular import on module load
    from backend.app import socketio, app as flask_app
    
    running_threads.add(auction_id)
    print(f"🧵 Thread started for {auction_id}")

    with flask_app.app_context():
        # loop only while auction exists and is active
        while auction_id in auctions and auctions[auction_id]['status'] == 'active':
            try:
                # simulate_single_bid will perform the bid and emit
                simulate_single_bid(auction_id)
                time.sleep(4)
            except Exception as e:
                print(f"⚠️ Auto-bidding error: {e}")
                break
    
    running_threads.discard(auction_id)
    print(f"🧵 Thread stopped for {auction_id}")


# ----------------------------
# Single Bid Simulation Logic
# ----------------------------
def simulate_single_bid(auction_id):
    """Perform one DQN-based bid simulation round and emit results via socketio."""
    if auction_id not in auctions:
        return None
    auction = auctions[auction_id]
    if auction['status'] != 'active':
        return None

    participants = auction['selectedAgents']
    if not participants:
        return None

    highest_bid = auction['currentPrice']
    last_bidder = auction['bids'][-1]['bidderId'] if auction['bids'] else None

    best_agent = None
    best_bid = highest_bid

    for user_id, agent_id in participants.items():
        initialize_user_agents(user_id)
        agents = user_agents[user_id]

        # Find correct agent object by its id
        agent = next((a for a in agents.values() if a['id'] == agent_id), None)
        if not agent:
            print(f"⚠️ Agent not found for user {user_id}: {agent_id}")
            continue

        # skip self-rebidding or insufficient funds
        if agent['id'] == last_bidder or agent['remainingBudget'] <= highest_bid:
            continue

        # if only one participant and initial bid placed → stop
        # (Allow single agent to bid once to start, but not bid against self)
        if len(participants) == 1 and auction['bids'] and last_bidder == agent['id']:
            continue

        state = np.array([
            highest_bid,
            auction['increment'],
            agent['remainingBudget'],
            max(0, auction['endTime'] - time.time() * 1000)
        ], dtype=np.float32)

        _, bid_amount = dqn_agent.act(state)
        # Ensure bid respects increment and budget
        bid_amount = max(highest_bid + auction['increment'], min(agent['remainingBudget'], bid_amount))

        if bid_amount > best_bid:
            best_bid = bid_amount
            best_agent = (user_id, agent)

    if best_agent:
        user_id, agent = best_agent
        bid_obj = {
            'id': str(uuid4()),
            'bidderId': agent['id'],
            'bidderName': agent['name'],
            'bidderType': agent['strategyType'],
            'amount': best_bid,
            'timestamp': time.time() * 1000
        }

        # Update auction state
        auction['bids'].append(bid_obj)
        auction['currentPrice'] = best_bid
        print(f"🤖 {agent['name']} placed ${best_bid:.2f}")

        # Persist bid to Supabase
        if supabase:
            try:
                supabase.table('bids').insert({
                    'id': bid_obj['id'],
                    'auction_id': auction_id,
                    'bidder_id': agent['id'],
                    'amount': best_bid,
                    'created_at': datetime.fromtimestamp(bid_obj['timestamp']/1000).isoformat()
                }).execute()
                
                supabase.table('auctions').update({
                    'current_price': best_bid
                }).eq('id', auction_id).execute()
            except Exception as e:
                print(f"Error persisting bid: {e}")


        # Emit through socketio lazily (avoid top-level import)
        from backend.app import socketio
        room = f'auction_{auction_id}'

        # Emit a minimal bid_update message (preferred)
        socketio.emit('bid_update', {'auction_id': auction_id, 'bid': bid_obj}, room=room)

        # Also emit full auction_update so frontends that prefer the whole object can sync
        socketio.emit('auction_update', {'auction': auction}, room=room)

        return bid_obj

    return None


# ----------------------------
# Simulate Bid endpoint (manual trigger)
# ----------------------------
@auction_bp.route('/simulate-bid', methods=['POST'])
@require_auth
def simulate_bid_route():
    data = request.get_json() or {}
    auction_id = data.get('auction_id')
    if not auction_id:
        return jsonify({'error': 'Missing auction_id'}), 400

    if auction_id not in auctions:
        return jsonify({'error': 'Auction not found'}), 404

    bid_obj = simulate_single_bid(auction_id)
    if bid_obj:
        return jsonify({'success': True, 'bid': bid_obj, 'auction': auctions[auction_id]}), 200
    else:
        return jsonify({'success': False, 'message': 'No bid was placed'}), 200


# ----------------------------
# Finalize Auction
# ----------------------------
def finalize_auction(auction_id):
    """Marks auction as completed and updates winner budgets."""
    if auction_id not in auctions:
        return
    auction = auctions[auction_id]
    auction['status'] = 'completed'

    if not auction['bids']:
        auction['winnerName'] = 'No Bids'
        auction['winnerType'] = None
        auction['winningPrice'] = 0

        # emit completion to room
        from backend.app import socketio
        socketio.emit('auction_complete', {'auction': auction}, room=f'auction_{auction_id}')
        return

    highest_bid = max(auction['bids'], key=lambda b: b['amount'])
    auction['winnerId'] = highest_bid['bidderId']
    auction['winnerName'] = highest_bid['bidderName']
    auction['winnerType'] = highest_bid.get('bidderType')
    auction['winningPrice'] = highest_bid['amount']

    # Deduct from winning agent
    for user_id, agents in user_agents.items():
        for agent in agents.values():
            if agent['id'] == highest_bid['bidderId']:
                agent['remainingBudget'] -= highest_bid['amount']
                agent['totalSpent'] += highest_bid['amount']

    print(f"🏁 Auction {auction_id} completed. Winner: {auction['winnerName']} (${auction['winningPrice']})")

    # Update Supabase
    if supabase:
        try:
            update_data = {
                'status': 'completed',
                'winner_id': auction['winnerId'] if auction['winnerId'] else None
            }
            supabase.table('auctions').update(update_data).eq('id', auction_id).execute()
        except Exception as e:
            print(f"Error finalizing auction in Supabase: {e}")


    from backend.app import socketio
    socketio.emit('auction_complete', {'auction': auction}, room=f'auction_{auction_id}')

# ----------------------------
# Load Auctions from Supabase (Persistence)
# ----------------------------
def load_auctions_from_supabase():
    """Load pending/active auctions from Supabase into memory on startup."""
    print("🔄 Loading auctions from Supabase...", flush=True)
    if not supabase:
        print("⚠️ Supabase client not available. Starting with empty auction list.", flush=True)
        return

    try:
        # Fetch auctions that are not completed
        response = supabase.table('auctions').select('*').neq('status', 'completed').execute()
        db_auctions = response.data
        
        count = 0
        for db_auc in db_auctions:
            auction_id = db_auc['id']
            
            # Helper to parse ISO string safely
            def parse_ts(iso_str):
                if not iso_str: return time.time() * 1000
                try:
                    # Replace Z with +00:00 for Python < 3.11 compatibility
                    iso_str = iso_str.replace('Z', '+00:00')
                    dt = datetime.fromisoformat(iso_str)
                    return dt.timestamp() * 1000
                except Exception:
                    return time.time() * 1000

            start_ts = parse_ts(db_auc.get('start_time'))
            end_ts = parse_ts(db_auc.get('end_time'))
            
            auctions[auction_id] = {
                'id': auction_id,
                'title': db_auc['title'],
                'description': db_auc.get('description', ''),
                'startingPrice': float(db_auc['starting_price']),
                'reservePrice': 0, 
                'increment': 10,
                'startTime': start_ts,
                'endTime': end_ts,
                'currentPrice': float(db_auc['current_price']),
                'status': db_auc['status'],
                'participants': [],
                'selectedAgents': {},
                'bids': [],
                'winnerId': db_auc.get('winner_id'),
                'winnerName': None,
                'winnerType': None,
                'winningPrice': None,
            }
            
            # Load bids
            try:
                bids_resp = supabase.table('bids').select('*').eq('auction_id', auction_id).order('created_at').execute()
                for db_bid in bids_resp.data:
                    bid_ts = parse_ts(db_bid['created_at'])
                    auctions[auction_id]['bids'].append({
                        'id': db_bid['id'],
                        'bidderId': db_bid['bidder_id'],
                        'bidderName': 'Unknown',
                        'bidderType': 'ai',
                        'amount': float(db_bid['amount']),
                        'timestamp': bid_ts
                    })
            except Exception as e:
                print(f"⚠️ Error loading bids for {auction_id}: {e}", flush=True)
            
            # Restart thread if active
            if auctions[auction_id]['status'] == 'active':
                print(f"🔄 Restarting bidding thread for restored auction {auction_id}")
                threading.Thread(target=run_auto_bidding, args=(auction_id,), daemon=True).start()

            count += 1
            
        print(f"📦 Loaded {count} active auctions from Supabase.", flush=True)
        
    except Exception as e:
        print(f"❌ Error loading auctions from Supabase: {e}", flush=True)

# Call immediately
load_auctions_from_supabase()

