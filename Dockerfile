# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

ENV JJK_PRODUCTION=1 \
    JJK_WEB_WORKERS=1 \
    JJK_SOCKETIO_ASYNC_MODE=threading \
    JJK_DATABASE_PATH=/data/jjk_arena.sqlite3

RUN mkdir -p /data

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:' + __import__('os').getenv('PORT', '5000') + '/readyz', timeout=3)" || exit 1

# One authoritative process with threaded SocketIO concurrency. The Gunicorn
# config fails closed if a deploy attempts more workers without a shared room coordinator.
CMD ["gunicorn", "-c", "gunicorn.conf.py", "web.app:app"]
