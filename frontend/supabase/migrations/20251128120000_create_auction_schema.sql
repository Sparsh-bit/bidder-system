/*
  # Create Auction System Tables

  ## 1. New Tables
  
  ### `auctions`
  - `id` (uuid, primary key)
  - `title` (text)
  - `description` (text)
  - `starting_price` (numeric)
  - `current_price` (numeric)
  - `status` (text) - pending, active, completed
  - `start_time` (timestamptz)
  - `end_time` (timestamptz)
  - `winner_id` (text) - can be user_id or agent_id
  - `created_by` (uuid) - references auth.users
  - `created_at` (timestamptz)

  ### `bids`
  - `id` (uuid, primary key)
  - `auction_id` (uuid) - references auctions
  - `bidder_id` (text) - user_id or agent_id
  - `amount` (numeric)
  - `created_at` (timestamptz)

  ### `agents`
  - `id` (text, primary key)
  - `user_id` (uuid) - references auth.users
  - `name` (text)
  - `budget` (numeric)
  - `remaining_budget` (numeric)
  - `strategy` (text)
  - `created_at` (timestamptz)

  ## 2. Security
  - Enable RLS on all tables
*/

-- Create Auctions Table
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

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auctions"
  ON public.auctions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create auctions"
  ON public.auctions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their auctions"
  ON public.auctions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create Agents Table
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

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agents"
  ON public.agents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create/update their own agents"
  ON public.agents FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create Bids Table
CREATE TABLE IF NOT EXISTS public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid REFERENCES public.auctions(id) ON DELETE CASCADE,
  bidder_id text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bids"
  ON public.bids FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users/agents can bid"
  ON public.bids FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Logic handled by backend/RLS functions usually, keeping open for now

-- Realtime
alter publication supabase_realtime add table public.auctions;
alter publication supabase_realtime add table public.bids;
