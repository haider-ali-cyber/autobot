import discord
from discord.ext import commands
import asyncio
from ..config import config
from ..database.db_manager import db_manager
from ..trading.order_manager import order_manager
from ..utils.logger import logger

class DiscordBot:
    def __init__(self):
        intents = discord.Intents.default()
        intents.message_content = True
        self.bot = commands.Bot(command_prefix='/', intents=intents)
        self.token = config.DISCORD_BOT_TOKEN
        self._setup_commands()

    def _setup_commands(self):
        @self.bot.command(name='start')
        async def start(ctx):
            user = db_manager.get_user_by_username(ctx.author.name)
            if not user:
                await ctx.send("❌ You are not registered in the system. Use your dashboard username.")
                return
            db_manager.update_user_bot_status(user.id, True)
            await ctx.send(f"✅ Bot STARTED for user **{user.username}**")

        @self.bot.command(name='stop')
        async def stop(ctx):
            user = db_manager.get_user_by_username(ctx.author.name)
            if not user:
                await ctx.send("❌ User not found.")
                return
            db_manager.update_user_bot_status(user.id, False)
            await ctx.send(f"🛑 Bot STOPPED for user **{user.username}**")

        @self.bot.command(name='status')
        async def status(ctx):
            user = db_manager.get_user_by_username(ctx.author.name)
            if not user:
                await ctx.send("❌ User not found.")
                return
            stats = db_manager.get_stats(user.id)
            status_str = "RUNNING" if user.is_bot_running else "STOPPED"
            
            embed = discord.Embed(title=f"📊 Bot Status: {user.username}", color=0x00ff00 if user.is_bot_running else 0xff0000)
            embed.add_field(name="Engine", value=status_str, inline=True)
            embed.add_field(name="Open Trades", value=stats['open_trades'], inline=True)
            embed.add_field(name="Daily PnL", value=f"${stats['daily_pnl']:.2f}", inline=True)
            embed.add_field(name="Total PnL", value=f"${stats['total_pnl']:.2f}", inline=True)
            embed.add_field(name="Win Rate", value=f"{stats['win_rate']}%", inline=True)
            await ctx.send(embed=embed)

        @self.bot.command(name='closeall')
        async def closeall(ctx):
            user = db_manager.get_user_by_username(ctx.author.name)
            if not user: return
            
            # Stop the bot loop first
            db_manager.update_user_bot_status(user.id, False)
            
            trades = db_manager.get_open_trades(user.id)
            count = len(trades)
            for trade in trades:
                order_manager.close_trade(trade, reason='discord_emergency')
            
            await ctx.send(f"🚨 **EMERGENCY STOP**: {count} trades closed for **{user.username}**. Bot is now OFF.")

    async def start_bot(self):
        if not self.token:
            logger.warning("Discord Bot Token not found. Remote control disabled.")
            return
        try:
            await self.bot.start(self.token)
        except Exception as e:
            logger.error(f"Discord Bot failed to start: {e}")

discord_bot_handler = DiscordBot()
