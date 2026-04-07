import requests
import json
from datetime import datetime
from ..config import config
from .logger import logger

class DiscordNotifier:
    """
    Sends real-time trading alerts to Discord via Webhooks.
    No VPN required for Discord in most regions!
    """
    def __init__(self, webhook_url: str = None):
        self.webhook_url = webhook_url or config.DISCORD_WEBHOOK_URL
        self.bot_name = "Auto Crypto Bot"

    def send_message(self, content: str, embed: dict = None):
        if not self.webhook_url:
            return
        
        payload = {
            "username": self.bot_name,
            "avatar_url": "https://cdn-icons-png.flaticon.com/512/2091/2091665.png",
            "content": content
        }
        
        if embed:
            payload["embeds"] = [embed]
            
        try:
            resp = requests.post(self.webhook_url, json=payload, timeout=5)
            if resp.status_code not in [200, 204]:
                logger.error(f"Discord notify failed: {resp.text}")
        except Exception as e:
            logger.error(f"Discord connection error: {e}")

    def notify_trade_opened(self, trade_data: dict):
        embed = {
            "title": "🚀 Trade Opened",
            "color": 3066993,  # Green
            "fields": [
                {"name": "Symbol", "value": trade_data['symbol'], "inline": True},
                {"name": "Side", "value": trade_data['side'], "inline": True},
                {"name": "Entry", "value": f"${trade_data['entry_price']}", "inline": True},
                {"name": "Qty", "value": f"{trade_data.get('quantity', 0)}", "inline": True},
                {"name": "SL", "value": f"${trade_data['stop_loss']}", "inline": True},
                {"name": "TP", "value": f"${trade_data['take_profit']}", "inline": True}
            ],
            "footer": {"text": f"Strategy: {trade_data.get('strategy', 'N/A')} | {datetime.now().strftime('%H:%M:%S')}"}
        }
        self.send_message("", embed)

    def notify_trade_closed(self, trade_data: dict):
        pnl = trade_data.get('pnl', 0)
        color = 3066993 if pnl >= 0 else 15158332  # Green vs Red
        
        embed = {
            "title": "🏁 Trade Closed",
            "color": color,
            "fields": [
                {"name": "Symbol", "value": trade_data['symbol'], "inline": True},
                {"name": "Reason", "value": trade_data.get('reason', 'N/A'), "inline": True},
                {"name": "PnL", "value": f"${pnl:.4f}", "inline": True},
                {"name": "Exit Price", "value": f"${trade_data.get('exit_price', 0)}", "inline": True}
            ],
            "footer": {"text": f"Timestamp: {datetime.now().strftime('%H:%M:%S')}"}
        }
        self.send_message("", embed)

    def notify_error(self, message: str):
        self.send_message(f"⚠️ **BOT ERROR:** {message}")

notifier = DiscordNotifier()
