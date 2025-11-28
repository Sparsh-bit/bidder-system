/*
  # Create User Profiles Table

  ## Overview
  This migration creates the profiles table for storing user information and balance.

  ## 1. New Tables
  
  ### `profiles`
  User profiles for authenticated users
  - `id` (uuid, primary key) - References auth.users(id)
  - `display_name` (text) - User's display name
  - `avatar_url` (text, optional) - Profile picture URL
  - `balance` (numeric) - User's available balance for bidding
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## 2. Security
  - Enable RLS on profiles table
  - Users can read all profiles (for display in auctions)
  - Users can only insert their own profile
  - Users can only update their own profile

  ## 3. Important Notes
  - Balance defaults to 1500.00 for new users
  - Profile is automatically created via trigger when user signs up
  - All monetary values use numeric type for precision
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  balance numeric NOT NULL DEFAULT 1500.00 CHECK (balance >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at_trigger
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_profiles_updated_at();
  END IF;
END $$;


