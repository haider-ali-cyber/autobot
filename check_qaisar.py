import sys
import asyncio
from backend.database.db_manager import db_manager

u = db_manager.get_user_by_username("qaisar")
print("User found:" if u else "User NOT found")
if u:
    print(dict(u))
