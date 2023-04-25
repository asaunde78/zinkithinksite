from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit


import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


app = Flask(__name__)
app.config['SECRET_KEY'] = 'testieseven'
socketio = SocketIO(app)
points = {}
@app.route("/")
@app.route("/mouse")
def mouse():
    return render_template('mouse.html')


@socketio.on('new data')
def take_data(msg):
    print(msg)
    if request.sid in points:
        points[request.sid] = (msg["x"],msg["y"])
    emit("boo", {
            "id":request.sid,
            "x":msg["x"],
            "y":msg["y"]
        }, broadcast=True)
@socketio.on("disconnect")
def disconnect():
    
    try:
        emit("remove", {
            "id":request.sid
        },broadcast=True)
        print("-------------DISCONNECT-------------")
    except:
        pass

if __name__ == "__main__": 
    socketio.run(app=app,host="0.0.0.0",port = 6868)
#gunicorn --bind 0.0.0.0:6868 mouse:app