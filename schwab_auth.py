"""OptionDesk 98 — Schwab OAuth Setup.

Run this ONCE to authenticate with your Schwab developer account.
It will open a browser for you to log in, then save the token for the app.

Prerequisites:
1. Register at https://developer.schwab.com
2. Create an app with callback URL: https://127.0.0.1
3. Set SCHWAB_API_KEY and SCHWAB_API_SECRET environment variables
"""
import os
import sys

def main():
    api_key = os.environ.get("SCHWAB_API_KEY", "")
    api_secret = os.environ.get("SCHWAB_API_SECRET", "")
    
    if not api_key or not api_secret:
        # Try loading from settings.json
        try:
            import json
            with open("settings.json") as f:
                settings = json.load(f)
                api_key = settings.get("schwab_key", "")
                api_secret = settings.get("schwab_secret", "")
        except Exception:
            pass
    
    if not api_key or not api_secret:
        print("❌ Schwab API credentials not found!")
        print()
        print("To set up Schwab API access:")
        print("1. Go to https://developer.schwab.com")
        print("2. Create a new app (Individual Trader API)")
        print("3. Set callback URL to: https://127.0.0.1")
        print("4. Either:")
        print("   a) Set environment variables:")
        print('      export SCHWAB_API_KEY="your-app-key"')
        print('      export SCHWAB_API_SECRET="your-app-secret"')
        print("   b) Or enter them in Settings.exe and save first")
        sys.exit(1)
    
    try:
        import schwab
    except ImportError:
        print("❌ schwab-py not installed. Run:")
        print("   pip install schwab-py")
        sys.exit(1)
    
    token_path = os.path.join(os.path.dirname(__file__), ".schwab_token.json")
    
    print("🔐 Starting Schwab OAuth flow...")
    print("   A browser window will open for you to log in to Schwab.")
    print("   After login, you'll be redirected to a localhost URL.")
    print("   Copy that FULL URL and paste it back here.")
    print()
    
    try:
        client = schwab.auth.client_from_manual_flow(
            api_key=api_key,
            app_secret=api_secret,
            callback_url="https://127.0.0.1",
            token_path=token_path
        )
        print()
        print("✅ Authentication successful! Token saved to", token_path)
        print("   You can now start OptionDesk 98 with Schwab data.")
        print("   Run: python3 start.py")
        
        # Quick test
        import httpx
        resp = client.get_quote("AAPL")
        if resp.status_code == httpx.codes.OK:
            data = resp.json()
            price = data.get("AAPL", {}).get("quote", {}).get("lastPrice", "N/A")
            print(f"   Test: AAPL = ${price}")
        
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
