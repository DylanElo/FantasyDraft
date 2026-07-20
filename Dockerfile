# Use an official Python runtime as a parent image, pinned by digest so a
# `python:3.11-slim` re-tag upstream can never silently change what this
# image builds from. Resolved from docker.io/library/python:3.11-slim
# (3.11.15-slim-trixie, multi-arch index) via
# `docker buildx imagetools inspect python:3.11-slim` on 2026-07-20.
# Re-validate and update this digest deliberately, not implicitly.
FROM python:3.11-slim@sha256:db3ff2e1800a8581e2c48a27c3995339d47bdf046da21c7627accd3d51053a93

# Set the working directory in the container
WORKDIR /app

# Copy the requirements/constraints files into the container
COPY requirements.txt constraints.txt .

# Install packages pinned to the exact versions in constraints.txt so the
# image is reproducible instead of resolving whatever is newest-compatible
# on build day. See constraints.txt for how to deliberately regenerate it.
RUN pip install --no-cache-dir -c constraints.txt -r requirements.txt

# Copy the rest of the application code into the container
COPY . .

ENV JJK_PRODUCTION=1 \
    JJK_WEB_WORKERS=1 \
    JJK_SOCKETIO_ASYNC_MODE=threading \
    JJK_DATABASE_PATH=/data/jjk_arena.sqlite3

RUN mkdir -p /data

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:' + os.getenv('PORT', os.getenv('JJK_PORT', '5000')) + '/readyz', timeout=3)" || exit 1

# One authoritative process with threaded SocketIO concurrency. The Gunicorn
# config fails closed if a deploy attempts more workers without a shared room coordinator.
CMD ["gunicorn", "-c", "gunicorn.conf.py", "web.app:app"]
