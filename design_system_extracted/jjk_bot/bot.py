import logging
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
)
from jjk_bot.game import GameManager

# Enable logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

game_manager = GameManager()

def escape_markdown(text: str) -> str:
    """Helper to escape markdown special characters."""
    # For MarkdownV2, there are many characters to escape.
    # For legacy Markdown, it's simpler.
    escape_chars = r"_*`["
    for char in escape_chars:
        text = text.replace(char, "\\" + char)
    return text

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    game_manager.reset_game(chat_id)
    await update.message.reply_text(
        "Welcome to the *Jujutsu Kaisen Card Game*! ⚔️\n\n"
        "*Rules*:\n"
        "1. Join the game using /join.\n"
        "2. Once everyone has joined, start with /start_game.\n"
        "3. On your turn, use /draw to get a character.\n"
        "4. You can /keep the character or /pass (once per game).\n"
        "5. If you pass, you must keep the next character drawn.\n"
        "6. Each player builds a team of 5 characters to see who is strongest!\n\n"
        "Use /join to begin!",
        parse_mode=ParseMode.MARKDOWN
    )

async def join(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user = update.effective_user
    game = game_manager.get_game(chat_id)

    # Escape user name to avoid breaking markdown
    safe_name = escape_markdown(user.first_name)
    success, msg = game.add_player(user.id, safe_name)
    await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)

async def start_game(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    game = game_manager.get_game(chat_id)

    success, msg = game.start_game()
    await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)

async def draw(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user = update.effective_user
    game = game_manager.get_game(chat_id)

    success, msg, char = game.draw(user.id)
    await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)

async def keep(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user = update.effective_user
    game = game_manager.get_game(chat_id)

    success, msg = game.keep(user.id)
    await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)

async def pass_card(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    user = update.effective_user
    game = game_manager.get_game(chat_id)

    success, msg, char = game.pass_card(user.id)
    await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)

async def result(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    game = game_manager.get_game(chat_id)

    success, msg = game.get_results()
    await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)

def run_bot(token: str):
    application = ApplicationBuilder().token(token).build()

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("join", join))
    application.add_handler(CommandHandler("start_game", start_game))
    application.add_handler(CommandHandler("draw", draw))
    application.add_handler(CommandHandler("keep", keep))
    application.add_handler(CommandHandler("pass", pass_card))
    application.add_handler(CommandHandler("result", result))

    application.run_polling()
