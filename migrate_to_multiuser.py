import os
import sys
from dotenv import load_dotenv

# Ensure we can import from backend
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database.db_manager import db_manager
from backend.utils.auth import get_password_hash
from backend.config import config

def migrate():
    load_dotenv()
    
    print("Starting Phase 3 Migration: Creating Admin User...")
    
    # 1. Check if admin user already exists
    admin_user = db_manager.get_user_by_username("admin")
    if admin_user:
        print("Admin user already exists. Skipping creation.")
    else:
        # 2. Use a default password for first run
        # User should change this later
        default_pwd = "password123"
        hashed_pwd = get_password_hash(default_pwd)
        
        # 3. Create the user
        admin_user = db_manager.create_user(
            username="admin", 
            hashed_password=hashed_pwd, 
            is_admin=True
        )
        print(f"Admin user created with default password: {default_pwd}")
        print("FORGOT? PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGGING IN.")

    # 4. Migrate keys from .env if present
    api_key = os.getenv("BYBIT_API_KEY")
    api_secret = os.getenv("BYBIT_API_SECRET")
    webhook = os.getenv("DISCORD_WEBHOOK_URL")
    
    if api_key and api_secret:
        print("Moving API keys from .env to database...")
        db_manager.update_user_api_keys(
            admin_user.id, 
            api_key, 
            api_secret, 
            webhook
        )
        print("Keys migrated successfully.")
        print("You can now remove BYBIT_API_KEY and BYBIT_API_SECRET from your .env file.")
    else:
        print("No API keys found in .env to migrate.")

if __name__ == "__main__":
    migrate()
