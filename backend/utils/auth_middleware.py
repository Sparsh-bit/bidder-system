from functools import wraps
from flask import request, jsonify
from backend.utils.supabase_client import supabase

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not supabase:
            return jsonify({"error": "Supabase client not initialized"}), 500

        token = request.headers.get("Authorization")
        if not token:
            return jsonify({"error": "Missing Authorization header"}), 401

        try:
            # Remove 'Bearer ' prefix if present
            if token.startswith("Bearer "):
                token = token.split(" ")[1]
            
            # Verify token
            # With Anon Key, we can still verify the token using get_user
            user = supabase.auth.get_user(token)
            if not user:
                return jsonify({"error": "Invalid token"}), 401
            
            # Attach user to request (optional, or just pass)
            # request.user = user
            
        except Exception as e:
            return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated
