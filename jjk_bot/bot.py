import logging
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
)
from jjk_bot.game import GameManager
from jjk_bot.characters import CHARACTERS

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
    return "".join(f"\\{c}" if c in escape_chars else c for c in text)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    game_manager.reset_game(chat_id)
    await update.message.reply_text(
        "Welcome to the *Jujutsu Kaisen Fantasy Draft*! ⚔️\n\n"
        "1. /join — Enter the lobby.\n"
        "2. /start\\_game — Begin the draft once everyone is ready.\n"
        "3. /draw → /keep or /pass on your turn.\n"
        "4. Each player drafts 5 characters. Highest team power wins!\n\n"
        "📖 /manual — Full rules\n"
        "📋 /characters — Browse all characters\n\n"
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

async def manual(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = (
        "*JJK Fantasy Draft — Game Manual*\n\n"
        "*Objective*\n"
        "Draft a team of 5 JJK characters. The player whose team has the highest "
        "combined ability power wins.\n\n"
        "*Setup*\n"
        "1. /start — Reset and open a new game lobby.\n"
        "2. /join — Each player joins the lobby.\n"
        "3. /start\\_game — Begin the draft when all players are ready.\n\n"
        "*Draft Phase*\n"
        "Players alternate turns until each has 5 characters.\n"
        "• /draw — Draw a random character card.\n"
        "• /keep — Add the drawn character to your team.\n"
        "• /pass — Discard the drawn card and draw a replacement "
        "(you must keep the replacement). *Each player may only pass once per game.*\n\n"
        "*Scoring*\n"
        "Each character's power is the total energy cost of all their skills "
        "(number of energy tokens across all 4 skills). "
        "The player whose 5-character team has the highest combined energy cost wins. "
        "Ties are broken randomly.\n\n"
        "*Energy Types*\n"
        "🟢 Physical · 🔴 Bloodline · 🔵 Curse Energy · ⬜ Strategic · ⬛ General\n\n"
        "*Commands Reference*\n"
        "• /result — View standings at any time.\n"
        "• /characters — Browse all draftable characters.\n"
        "• /character <name> — See a character's full skill details."
    )
    await update.message.reply_text(msg, parse_mode=ParseMode.MARKDOWN)


async def characters(update: Update, context: ContextTypes.DEFAULT_TYPE):
    lines = [f"*Available Characters* ({len(CHARACTERS)} total)\n"]
    for char in CHARACTERS:
        lines.append(f"• {escape_markdown(char.name)}")
    lines.append("\n_Use /character <name> for full skill details._")
    await update.message.reply_text("\n".join(lines), parse_mode=ParseMode.MARKDOWN)


async def character_detail(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not context.args:
        await update.message.reply_text(
            "Usage: /character <name>\nExample: /character Gojo",
            parse_mode=ParseMode.MARKDOWN
        )
        return

    query = " ".join(context.args).lower()
    match = next((c for c in CHARACTERS if query in c.name.lower()), None)

    if not match:
        await update.message.reply_text(
            f"No character found matching '{escape_markdown(' '.join(context.args))}'. "
            "Use /characters to see all available characters.",
            parse_mode=ParseMode.MARKDOWN
        )
        return

    energy_icons = {"green": "🟢", "red": "🔴", "blue": "🔵", "white": "⬜", "black": "⬛"}

    msg = f"*{escape_markdown(match.name)}*\n"
    msg += f"_{escape_markdown(match.description)}_\n\n"
    msg += "*Skills:*"

    for skill in match.skills:
        energy_str = " ".join(energy_icons.get(e, e) for e in skill.energy)
        cd = f"CD {skill.cooldown}" if skill.cooldown != "None" else "No CD"
        msg += f"\n\n*{escape_markdown(skill.name)}* {energy_str} _{cd}_\n"
        msg += escape_markdown(skill.description)

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
    application.add_handler(CommandHandler("manual", manual))
    application.add_handler(CommandHandler("characters", characters))
    application.add_handler(CommandHandler("character", character_detail))

    application.run_polling()
