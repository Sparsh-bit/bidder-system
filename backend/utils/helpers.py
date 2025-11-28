import numpy as np
import random
import torch

def set_seed(seed=42):
    np.random.seed(seed)
    random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def normalize_reward(reward, scale=1.0):
    return float(np.clip(reward / scale, -1.0, 1.0))

def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()

def calculate_average_reward(reward_list):
    if not reward_list:
        return 0.0
    return float(sum(reward_list) / len(reward_list))
