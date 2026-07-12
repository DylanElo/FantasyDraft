from web.app import DEBUG_MODE, HOST, PORT, PRODUCTION_MODE, app, socketio


if __name__ == "__main__":
    print(f"Starting JJK Fantasy Draft on http://{HOST}:{PORT}...")
    socketio.run(
        app,
        debug=DEBUG_MODE,
        host=HOST,
        port=PORT,
        allow_unsafe_werkzeug=not PRODUCTION_MODE,
    )
