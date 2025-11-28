import datetime
import os

LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

def log_event(message, filename="auction_log.txt"):
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    entry = f"[{timestamp}] {message}"
    print(entry)
    with open(os.path.join(LOG_DIR, filename), "a") as f:
        f.write(entry + "\n")

def log_training(agent_id, episode, reward):
    log_event(f"Agent {agent_id} - Episode {episode} - Reward: {reward:.2f}", "training_log.txt")
