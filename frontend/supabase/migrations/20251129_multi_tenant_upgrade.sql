-- Migration: Multi-Tenant Upgrade
-- Description: Adds user_wallets, enforces RLS, and adds atomic bidding function.
-- Includes table creation to ensure robustness.

-- 0. Ensure Tables Exist (Idempotent)
CREATE TABLE IF NOT EXISTS public.auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  starting_price numeric NOT NULL DEFAULT 0,
  current_price numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  start_time timestamptz,
  end_time timestamptz,
  winner_id text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agents (
  id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  budget numeric NOT NULL DEFAULT 0,
  remaining_budget numeric NOT NULL DEFAULT 0,
  strategy text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 1. User Wallets Table
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 10000.00,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.user_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own wallet" -- In practice, backend usually handles this, but good for testing
  ON public.user_wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Ensure Agents Table has correct RLS
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;
CREATE POLICY "Users can view their own agents"
  ON public.agents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create/update their own agents" ON public.agents;
CREATE POLICY "Users can create/update their own agents"
  ON public.agents FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Auctions (Global Marketplace)
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view auctions" ON public.auctions;
CREATE POLICY "Anyone can view auctions"
  ON public.auctions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create auctions" ON public.auctions;
CREATE POLICY "Authenticated users can create auctions"
  ON public.auctions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 4. Bids (Global Visibility)
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view bids" ON public.bids;
CREATE POLICY "Anyone can view bids"
  ON public.bids FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can place bids" ON public.bids;
CREATE POLICY "Authenticated users can place bids"
  ON public.bids FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Logic handled by RPC usually

-- 5. Atomic Bidding Function
-- This function handles the transaction: Check Balance -> Deduct -> Insert Bid -> Update Auction
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id uuid,
  p_bidder_id text, -- Agent ID
  p_amount numeric,
  p_user_id uuid
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (to bypass strict RLS if needed for cross-table updates)
AS $$
DECLARE
  v_current_price numeric;
  v_wallet_balance numeric;
  v_agent_budget numeric;
  v_new_bid_id uuid;
BEGIN
  -- 1. Get Auction State (Lock row for update)
  SELECT current_price INTO v_current_price
  FROM public.auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found';
  END IF;

  IF p_amount <= v_current_price THEN
    RAISE EXCEPTION 'Bid must be higher than current price';
  END IF;

  -- 2. Get User Wallet Balance
  SELECT balance INTO v_wallet_balance
  FROM public.user_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- 3. Get Agent Budget (Optional: if agents have sub-budgets)
  SELECT remaining_budget INTO v_agent_budget
  FROM public.agents
  WHERE id = p_bidder_id
  FOR UPDATE;

  IF v_agent_budget < p_amount THEN
    RAISE EXCEPTION 'Insufficient agent budget';
  END IF;

  -- 4. Execute Updates
  -- Deduct from Wallet
  UPDATE public.user_wallets
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id;

  -- Deduct from Agent
  UPDATE public.agents
  SET remaining_budget = remaining_budget - p_amount,
      updated_at = now()
  WHERE id = p_bidder_id;

  -- Update Auction Price
  UPDATE public.auctions
  SET current_price = p_amount,
      updated_at = now()
  WHERE id = p_auction_id;

  -- Insert Bid
  INSERT INTO public.bids (auction_id, bidder_id, amount, created_at)
  VALUES (p_auction_id, p_bidder_id, p_amount, now())
  RETURNING id INTO v_new_bid_id;

  RETURN json_build_object(
    'success', true,
    'bid_id', v_new_bid_id,
    'new_price', p_amount,
    'new_balance', v_wallet_balance - p_amount
  );
END;
$$;

-- 6. Trigger to create wallet on user signup (Optional but helpful)
CREATE OR REPLACE FUNCTION public.handle_new_user_wallet()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (new.id, 10000.00);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_wallet();

-- Realtime
alter publication supabase_realtime add table public.user_wallets;
alter publication supabase_realtime add table public.agents;
