from web.app import app, socketio

if __name__ == "__main__":
    print("Starting Jujutsu Kaisen Web Server...")
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)

