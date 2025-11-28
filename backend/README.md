# Auction AI Backend

This is a Flask-based backend for an Agentic AI auction system using multiple Deep Q-Network (DQN) agents.

## Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the Flask server:
   ```bash
   python app.py
   ```

The server will run on http://localhost:5000.

## API Endpoints
- **POST /api/auction/start** → start a new auction session
- **POST /api/auction/simulate** → simulate an entire auction between multiple agents
- **POST /api/auction/bid** → get a bid from a specific agent given the current auction state
