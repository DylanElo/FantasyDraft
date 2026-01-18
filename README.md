# Jujutsu Kaisen Telegram Bot Game

A simple Telegram bot game where players draw random Jujutsu Kaisen character cards to build the strongest team.

## Game Rules

1. **Turn Order**: Players take turns in a Telegram group chat.
2. **Drawing a Card**: On a player’s turn, they use `/draw`. The bot randomly draws a character card.
3. **Keep or Pass**: The player can choose to `/keep` that card or use their one-time `/pass`. If they pass, they must accept the next card they draw.
4. **Building the Team**: Each player repeats this until they have five characters.
5. **Game End**: Once all players have five characters, use `/result` to compare teams and announce the winner.

## Setup Instructions

1. **Get a Telegram Bot Token**:
   - Message [@BotFather](https://t.me/botfather) on Telegram.
   - Use `/newbot` and follow the instructions to get your API token.

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set Environment Variable**:
   Set your bot token as an environment variable:
   ```bash
   export TELEGRAM_BOT_TOKEN="your_token_here"
   ```

4. **Run the Bot**:
   ```bash
   python main.py
   ```

## Online Deployment

### Deploying to Heroku / Railway
1. Push this repository to GitHub.
2. Connect your GitHub account to Heroku or Railway.
3. Create a new "Worker" or "Service".
4. Set the `TELEGRAM_BOT_TOKEN` environment variable in the platform's settings.
5. The `Procfile` will tell the platform to run `python main.py`.

### Deploying with Docker
1. Build the image:
   ```bash
   docker build -t jjk-bot .
   ```
2. Run the container:
   ```bash
   docker run -e TELEGRAM_BOT_TOKEN="your_token" jjk-bot
   ```

### Deploying to Render
1. Create a new "Background Worker" on Render.
2. Connect your GitHub repository.
3. Set the Runtime to `Python`.
4. Set the Start Command to `python main.py`.
5. Add the `TELEGRAM_BOT_TOKEN` environment variable in the "Environment" section.

## Commands

- `/start` - Initialize/Reset the game in the current chat.
- `/join` - Join the game.
- `/start_game` - Start the game once all players have joined.
- `/draw` - Draw a character card (on your turn).
- `/keep` - Keep the drawn character.
- `/pass` - Pass the drawn character and get a new one (once per game).
- `/result` - Show the current standings and teams.
