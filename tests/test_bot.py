import unittest
from unittest.mock import AsyncMock, MagicMock, patch
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import ContextTypes

from jjk_bot.bot import (
    escape_markdown,
    start,
    join,
    start_game,
    draw,
    keep,
    pass_card,
    result,
    game_manager,
)


class TestBotHelpers(unittest.TestCase):
    def test_escape_markdown(self):
        self.assertEqual(escape_markdown("Hello_World*123`[test]"), "Hello\\_World\\*123\\`\\[test]")
        self.assertEqual(escape_markdown("No special chars"), "No special chars")
        self.assertEqual(escape_markdown("All_*`["), "All\\_\\*\\`\\[")


class TestBotHandlers(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Reset the global game manager before each test to ensure clean state
        game_manager.games.clear()
        self.chat_id = 12345
        self.user_id = 98765
        self.user_name = "TestUser"

        # Create mock update and context
        self.update = MagicMock(spec=Update)
        self.update.effective_chat.id = self.chat_id

        # Setup mock user
        self.user = MagicMock()
        self.user.id = self.user_id
        self.user.first_name = self.user_name
        self.update.effective_user = self.user

        # Setup mock reply_text
        self.update.message.reply_text = AsyncMock()

        self.context = MagicMock(spec=ContextTypes.DEFAULT_TYPE)

    async def test_start_handler(self):
        await start(self.update, self.context)

        # Verify game is reset
        self.assertIn(self.chat_id, game_manager.games)

        # Verify welcome message was sent
        self.update.message.reply_text.assert_called_once()
        args, kwargs = self.update.message.reply_text.call_args
        self.assertIn("Welcome to the *Jujutsu Kaisen Card Game*", args[0])
        self.assertEqual(kwargs.get("parse_mode"), ParseMode.MARKDOWN)

    async def test_join_handler(self):
        await join(self.update, self.context)

        game = game_manager.get_game(self.chat_id)
        self.assertIn(self.user_id, game.players)

        self.update.message.reply_text.assert_called_once()
        args, kwargs = self.update.message.reply_text.call_args
        self.assertIn("joined the game", args[0])
        self.assertEqual(kwargs.get("parse_mode"), ParseMode.MARKDOWN)

    async def test_start_game_handler(self):
        game = game_manager.get_game(self.chat_id)
        game.add_player(1, "Player 1")
        game.add_player(2, "Player 2")

        await start_game(self.update, self.context)

        self.update.message.reply_text.assert_called_once()
        args, kwargs = self.update.message.reply_text.call_args
        self.assertIn("Game started!", args[0])
        self.assertEqual(kwargs.get("parse_mode"), ParseMode.MARKDOWN)

    @patch("jjk_bot.game.Game.draw")
    async def test_draw_handler(self, mock_draw):
        mock_draw.return_value = (True, "Drew a character", None)
        await draw(self.update, self.context)

        self.update.message.reply_text.assert_called_once()
        args, kwargs = self.update.message.reply_text.call_args
        self.assertIn("Drew a character", args[0])
        self.assertEqual(kwargs.get("parse_mode"), ParseMode.MARKDOWN)

    @patch("jjk_bot.game.Game.keep")
    async def test_keep_handler(self, mock_keep):
        mock_keep.return_value = (True, "Kept the character")
        await keep(self.update, self.context)

        self.update.message.reply_text.assert_called_once()
        args, kwargs = self.update.message.reply_text.call_args
        self.assertIn("Kept the character", args[0])
        self.assertEqual(kwargs.get("parse_mode"), ParseMode.MARKDOWN)

    @patch("jjk_bot.game.Game.pass_card")
    async def test_pass_card_handler(self, mock_pass_card):
        mock_pass_card.return_value = (True, "Passed the character", None)
        await pass_card(self.update, self.context)

        self.update.message.reply_text.assert_called_once()
        args, kwargs = self.update.message.reply_text.call_args
        self.assertIn("Passed the character", args[0])
        self.assertEqual(kwargs.get("parse_mode"), ParseMode.MARKDOWN)

    @patch("jjk_bot.game.Game.get_results")
    async def test_result_handler(self, mock_get_results):
        mock_get_results.return_value = (True, "Game Results")
        await result(self.update, self.context)

        self.update.message.reply_text.assert_called_once()
        args, kwargs = self.update.message.reply_text.call_args
        self.assertIn("Game Results", args[0])
        self.assertEqual(kwargs.get("parse_mode"), ParseMode.MARKDOWN)

if __name__ == "__main__":
    unittest.main()
