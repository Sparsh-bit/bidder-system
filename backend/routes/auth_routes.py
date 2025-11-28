from flask import Blueprint, request, jsonify
from backend.utils.supabase_client import supabase

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/auth', methods=['POST'])
def auth_user():
    """
    Authenticate user via Supabase token or credentials.
    For now, we'll assume the frontend handles login via Supabase Auth
    and sends the session/user data. This endpoint can be used to sync user data.
    """
    data = request.get_json()
    user = data.get('user')
    if not user:
        return jsonify({'error': 'Missing user data'}), 400
    
    # Sync user to local DB or just acknowledge
    return jsonify({'status': 'success', 'user': user}), 200

@auth_bp.route('/wallet', methods=['GET'])
def get_wallet():
    """
    Get user wallet balance.
    Expects Authorization header with Bearer token.
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'error': 'Missing Authorization header'}), 401
    
    token = auth_header.split(" ")[1]
    
    try:
        # Get user from Supabase using the token
        user_resp = supabase.auth.get_user(token)
        user = user_resp.user
        if not user:
             return jsonify({'error': 'Invalid token'}), 401
             
        # Fetch profile/wallet from 'profiles' table
        profile_resp = supabase.table('profiles').select('*').eq('id', user.id).single().execute()
        profile = profile_resp.data
        
        return jsonify({
            'balance': profile.get('balance', 0) if profile else 0,
            'currency': 'USD'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
