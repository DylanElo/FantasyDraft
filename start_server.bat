@echo off
cd /d C:\Users\dylan\OneDrive\Documents\Game
python -m flask --app web/app.py run --host=0.0.0.0 --port=5000
pause
