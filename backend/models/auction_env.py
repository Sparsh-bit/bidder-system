import numpy as np

class AuctionEnvironment:
    def __init__(self, num_agents=3, rounds=5, max_valuation=100, max_budget=100):
        self.num_agents = num_agents
        self.rounds = rounds
        self.max_valuation = max_valuation
        self.max_budget = max_budget
        self.reset()

    def reset(self):
        self.valuations = np.random.rand(self.num_agents) * self.max_valuation
        self.budgets = np.random.rand(self.num_agents) * self.max_budget
        self.current_round = 0
        return self._get_state()

    def _get_state(self):
        return {
            'valuations': self.valuations.tolist(),
            'budgets': self.budgets.tolist(),
            'round': self.current_round
        }

    def step(self, bids):
        self.current_round += 1
        valid_bids = np.minimum(bids, self.budgets)
        winner = int(np.argmax(valid_bids))
        sorted_bids = sorted(valid_bids, reverse=True)
        price = sorted_bids[1] if len(sorted_bids) > 1 else sorted_bids[0]
        self.budgets[winner] -= price
        rewards = [0.0] * self.num_agents
        rewards[winner] = self.valuations[winner] - price
        done = self.current_round >= self.rounds
        return self._get_state(), rewards, done, {'winner': winner, 'price': price}
