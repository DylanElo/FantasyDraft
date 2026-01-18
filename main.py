import os
import sys
from jjk_bot.bot import run_bot

if __name__ == "__main__":
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Error: TELEGRAM_BOT_TOKEN environment variable is not set.")
        print("Please set it and try again.")
        sys.exit(1)

    print("Starting Jujutsu Kaisen Bot...")
    run_bot(token)
