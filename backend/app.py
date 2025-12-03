# backend/app.py
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# Initialize Supabase Client (optional check)
from backend.utils.supabase_client import supabase
if not supabase:
    logger.warning("Supabase client could not be initialized. Check .env")

# Create the SocketIO instance bound to the app immediately
# In development the default async_mode is fine. For production, consider eventlet or gevent.
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Socket handlers: clients join/leave auction-specific rooms ---
@socketio.on('join_auction')
def handle_join_auction(data):
    """Client requests to join a specific auction room."""
    auction_id = data.get('auction_id')
    if not auction_id:
        logger.warning("join_auction called without auction_id")
        return
    room_name = f"auction_{auction_id}"
    join_room(room_name)
    logger.info(f"Socket joined room: {room_name}")

@socketio.on('leave_auction')
def handle_leave_auction(data):
    """Client requests to leave a specific auction room."""
    auction_id = data.get('auction_id')
    if not auction_id:
        logger.warning("leave_auction called without auction_id")
        return
    room_name = f"auction_{auction_id}"
    leave_room(room_name)
    logger.info(f"Socket left room: {room_name}")

# Optional: simple ping/pong handlers for debugging
@socketio.on('connect')
def on_connect():
    logger.info("Socket connected")

@socketio.on('disconnect')
def on_disconnect():
    logger.info("Socket disconnected")


# Now import and register blueprints AFTER socketio/app exist
# Make sure your auction routes import socketio from this module when they need to emit.
# Now import and register blueprints AFTER socketio/app exist
from backend.routes.auction_routes import auction_bp
from backend.routes.auth_routes import auth_bp
from backend.routes.agent_routes import agent_bp

app.register_blueprint(auction_bp, url_prefix='/api/auction')
app.register_blueprint(auth_bp, url_prefix='/api/user')
app.register_blueprint(agent_bp, url_prefix='/api/agent')

@app.route('/health', methods=['GET'])
def health():
    return {"status": "ok", "message": "backend reachable"}


if __name__ == '__main__':
    # Allow running from backend/ directory by adding parent to sys.path
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # Use socketio.run to serve app with SocketIO support
    socketio.run(app, host='0.0.0.0', port=int(os.environ.get('PORT', 8000)), debug=True)
