import torch
import torch.nn as nn
import torch.optim as optim
import random
import numpy as np
from collections import deque
from typing import Tuple, List, Optional

# Keep your existing save/load and logger imports (they were used in original).
from backend.utils.model_utils import save_model, load_model
from backend.utils.logger import log_training

# ---------- Configuration / Defaults ----------
DEFAULT_DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ---------- Model ----------
class DQN(nn.Module):
    def __init__(self, state_size: int, action_size: int, hidden: int = 128):
        super(DQN, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(state_size, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.ReLU(),
            nn.Linear(hidden, action_size)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# ---------- Simple Replay Buffer ----------
class ReplayBuffer:
    def __init__(self, capacity: int = 5000):
        self.buffer = deque(maxlen=capacity)

    def push(self, state, action, reward, next_state, done):
        self.buffer.append((state, action, reward, next_state, done))

    def sample(self, batch_size: int):
        batch = random.sample(self.buffer, batch_size)
        states, actions, rewards, next_states, dones = zip(*batch)
        return (
            np.array(states, dtype=np.float32),
            np.array(actions, dtype=np.int64),
            np.array(rewards, dtype=np.float32),
            np.array(next_states, dtype=np.float32),
            np.array(dones, dtype=np.float32),
        )

    def __len__(self):
        return len(self.buffer)


# ---------- DQN Agent (corrected) ----------
class DQNAgent:
    def __init__(
        self,
        agent_id: str,
        state_size: int = 4,
        action_size: int = 10,
        lr: float = 1e-3,
        gamma: float = 0.99,
        epsilon: float = 1.0,
        epsilon_min: float = 0.05,
        epsilon_decay: float = 0.995,
        batch_size: int = 32,
        buffer_capacity: int = 5000,
        device: torch.device = DEFAULT_DEVICE,
        target_update_freq: int = 1000,  # steps
        grad_clip: Optional[float] = 10.0,
        seed: Optional[int] = None,
    ):
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
            torch.manual_seed(seed)
            if device.type == "cuda":
                torch.cuda.manual_seed_all(seed)

        self.agent_id = agent_id
        self.state_size = state_size
        self.action_size = action_size
        self.gamma = gamma
        self.epsilon = epsilon
        self.epsilon_min = epsilon_min
        self.epsilon_decay = epsilon_decay
        self.batch_size = batch_size
        self.device = device
        self.target_update_freq = target_update_freq
        self.grad_clip = grad_clip

        # core networks
        self.model = DQN(state_size, action_size).to(self.device)
        self.target_model = DQN(state_size, action_size).to(self.device)
        # copy initial weights
        self.target_model.load_state_dict(self.model.state_dict())
        self.target_model.eval()

        self.optimizer = optim.Adam(self.model.parameters(), lr=lr)
        self.loss_fn = nn.MSELoss()

        # replay
        self.memory = ReplayBuffer(capacity=buffer_capacity)
        self.learn_step_counter = 0

        # try to load pretrained weights (keeps your original behavior)
        try:
            load_model(self, f"{agent_id}_pretrained.pth")
            # After loading, ensure model is on correct device
            self.model.to(self.device)
            self.target_model.to(self.device)
            print(f"[DQNAgent] Loaded pretrained model {agent_id}_pretrained.pth")
        except Exception as e:
            # If load_model signature expects different args or file not found, ignore gracefully
            print(f"[DQNAgent] No pretrained model loaded: {e}")

    # -------- action selection --------
    def act(self, state: np.ndarray) -> Tuple[int, float]:
        """
        Returns (action_index, bid_amount).
        Expects `state` as 1D numpy array or list. Does not perform normalization here —
        normalize upstream or add preprocessing if needed.
        """
        state_np = np.array(state, dtype=np.float32)
        if np.random.rand() <= self.epsilon:
            action = random.randrange(self.action_size)
        else:
            # forward pass (ensure shape [1, state_size])
            state_t = torch.from_numpy(state_np).unsqueeze(0).to(self.device)  # [1, S]
            with torch.no_grad():
                q_values = self.model(state_t)  # [1, action_size]
                action = int(torch.argmax(q_values, dim=1).item())

        # mapping action -> bid_amount (keeps your original mapping)
        # assume state[0] = current_price, state[1] = increment
        try:
            current_price = float(state_np[0])
            increment = float(state_np[1])
        except Exception:
            # fallback if state doesn't contain these indices
            current_price = float(state_np[0]) if state_np.size > 0 else 0.0
            increment = float(1.0) if state_np.size > 1 else 1.0

        bid_amount = current_price + increment * (action + 1)
        return action, bid_amount

    # -------- memory --------
    def remember(self, state, action, reward, next_state, done):
        self.memory.push(state, action, reward, next_state, done)

    # -------- learning (batched) --------
    def replay(self):
        if len(self.memory) < self.batch_size:
            return None  # nothing learned

        # sample batch and convert to tensors
        states_np, actions_np, rewards_np, next_states_np, dones_np = self.memory.sample(self.batch_size)

        states = torch.from_numpy(states_np).to(self.device)                # [B, S]
        actions = torch.from_numpy(actions_np).long().to(self.device)       # [B]
        rewards = torch.from_numpy(rewards_np).to(self.device)             # [B]
        next_states = torch.from_numpy(next_states_np).to(self.device)     # [B, S]
        dones = torch.from_numpy(dones_np).to(self.device)                 # [B] (0.0 or 1.0)

        # current Q values: Q(s, a) for taken actions
        q_values = self.model(states)                                      # [B, A]
        q_pred = q_values.gather(1, actions.unsqueeze(1)).squeeze(1)       # [B]

        # compute target Q using target network for stability
        with torch.no_grad():
            q_next = self.target_model(next_states)                        # [B, A]
            q_next_max = q_next.max(1)[0]                                  # [B]
            q_target = rewards + (1.0 - dones) * (self.gamma * q_next_max) # [B]

        # loss & optimize
        loss = self.loss_fn(q_pred, q_target)
        self.optimizer.zero_grad()
        loss.backward()
        # optional gradient clipping
        if self.grad_clip is not None:
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.grad_clip)
        self.optimizer.step()

        # increment step counter and update target periodically
        self.learn_step_counter += 1
        if self.learn_step_counter % self.target_update_freq == 0:
            self.target_model.load_state_dict(self.model.state_dict())

        # epsilon decay
        if self.epsilon > self.epsilon_min:
            self.epsilon = max(self.epsilon_min, self.epsilon * self.epsilon_decay)

        return loss.item()

    # -------- training loop for episodes --------
    def train(self, env, episodes: int = 100, max_steps_per_episode: int = 1000, log_every: int = 1):
        """
        env must implement reset() -> state and step(action) -> (next_state, reward, done) OR (next_state, reward, done, info).
        Training saves the model after each episode using your save_model utility.
        """
        for e in range(1, episodes + 1):
            state = env.reset()
            done = False
            total_reward = 0.0
            steps = 0
            episode_losses: List[float] = []

            while not done and steps < max_steps_per_episode:
                action, _ = self.act(state)
                # Some envs return 4-tuple from step; support both
                step_result = env.step(action)
                if len(step_result) == 4:
                    next_state, reward, done, _info = step_result
                else:
                    next_state, reward, done = step_result

                # store transition & learn
                self.remember(state, action, reward, next_state, float(done))
                loss_val = self.replay()
                if loss_val is not None:
                    episode_losses.append(loss_val)

                state = next_state
                total_reward += float(reward)
                steps += 1

            # logging and checkpoint
            avg_loss = float(np.mean(episode_losses)) if episode_losses else 0.0
            log_training(self.agent_id, e, total_reward)
            # Attempt to save via your save_model utility; fall back to saving model.state_dict
            try:
                save_model(self, f"{self.agent_id}_pretrained.pth")
            except Exception as ex:
                # fallback: save model state dict locally
                torch.save(self.model.state_dict(), f"{self.agent_id}_pretrained_fallback.pth")
                print(f"[DQNAgent] save_model failed: {ex}. Saved fallback state dict.")

            if e % log_every == 0:
                print(
                    f"[DQNAgent] Episode {e}/{episodes} | Reward: {total_reward:.3f} | "
                    f"Steps: {steps} | Epsilon: {self.epsilon:.4f} | AvgLoss: {avg_loss:.6f}"
                )

    # -------- load pretrained (explicit) --------
    def load_pretrained(self, filename: str = "pretrained_agent.pth"):
        try:
            load_model(self, filename)
            # ensure model and target on device
            self.model.to(self.device)
            self.target_model.load_state_dict(self.model.state_dict())
            self.target_model.to(self.device)
            print(f"[DQNAgent] Loaded pretrained from {filename}")
        except Exception as e:
            print(f"[DQNAgent] load_pretrained failed: {e}")

    # convenience: save model manually
    def save(self, filename: str):
        try:
            save_model(self, filename)
        except Exception as ex:
            torch.save(self.model.state_dict(), filename)
            print(f"[DQNAgent] save_model fallback used: {ex}")

