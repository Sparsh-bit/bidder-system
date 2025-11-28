import torch
import os

MODEL_DIR = "models"
os.makedirs(MODEL_DIR, exist_ok=True)

def save_model(agent, filename="pretrained_agent.pth"):
    path = os.path.join(MODEL_DIR, filename)
    try:
        torch.save(agent.model.state_dict(), path)
        print(f"✅ Model saved at {path}")
        return True
    except Exception as e:
        print(f"❌ Failed to save model at {path}: {e}")
        return False

def load_model(agent, filename="pretrained_agent.pth"):
    path = os.path.join(MODEL_DIR, filename)
    if not os.path.exists(path):
        print("⚠️ No pretrained model found.")
        return False

    map_loc = None
    try:
        dev = getattr(agent, "device", None)
        if dev is not None:
            map_loc = dev if isinstance(dev, torch.device) else torch.device(str(dev))
    except Exception:
        map_loc = None

    try:
        state = torch.load(path, map_location=map_loc)
        agent.model.load_state_dict(state)
        print(f"✅ Loaded pretrained model from {path} (map_location={map_loc})")
        return True
    except Exception as e:
        print(f"❌ Failed to load model from {path}: {e}")
        return False
