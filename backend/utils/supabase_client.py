import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_ANON_KEY")

supabase: Client = None

if url and key:
    try:
        supabase = create_client(url, key)
        print("✅ Supabase client initialized (Anon Key)")
    except Exception as e:
        print(f"❌ Failed to initialize Supabase client: {e}")
else:
    print("⚠️ Supabase credentials missing in .env")

def get_authenticated_client(token: str) -> Client:
    """
    Returns a Supabase client instance authenticated as the user.
    This allows RLS policies to work correctly.
    """
    if not url or not key:
        raise Exception("Supabase credentials missing")
    
    # Create a new client instance for this request
    # We pass the user's access token in the headers
    client = create_client(url, key)
    client.postgrest.auth(token)
    return client
