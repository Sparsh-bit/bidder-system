import requests
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

BASE_URL = 'http://127.0.0.1:5000/api/auction'

# We need a valid token to test create_auction. 
# Since we can't easily generate one without logging in, we'll try to hit a public endpoint first.
# get-auction is public in my code? No, I didn't add @require_auth to get-auction.

def test_get_auctions():
    try:
        print(f"Testing GET {BASE_URL}/get-auction...")
        res = requests.get(f"{BASE_URL}/get-auction")
        print(f"Status: {res.status_code}")
        print(f"Response: {res.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_get_auctions()
