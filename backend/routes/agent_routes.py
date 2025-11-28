from flask import Blueprint, jsonify
from backend.routes.auction_routes import initialize_user_agents, user_agents

agent_bp = Blueprint('agent_bp', __name__)

@agent_bp.route('/get-agents/<user_id>', methods=['GET'])
def get_agents(user_id):
    """
    Get AI agents for a specific user.
    """
    initialize_user_agents(user_id)
    if user_id in user_agents:
        return jsonify({'agents': list(user_agents[user_id].values())}), 200
    return jsonify({'agents': []}), 200
