from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit
from engineio.payload import Payload

Payload.max_decode_packets = 500

import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)


app = Flask(__name__)
app.config['SECRET_KEY'] = 'testieseven'
socketio = SocketIO(app)
players = {}
@app.route("/")
@app.route("/index")
def index():
    return render_template('index.html')

@socketio.on("connect")
def connect(msg):
    print(f"USER CONNECTED")
    print(request.sid)
    # print(players)
    players[request.sid] = {"x":0,"y":0,"z":0}
    emit("connect", {"yourid":request.sid, "players":players}, broadcast = True)
    
@socketio.on('new data')
def take_data(msg):
    
    
    players[request.sid] = {"id":request.sid,"x":msg["x"],"y":msg["y"],"z":msg["z"]}
    # for point in points.values():
    emit("update", players[request.sid], broadcast=True)
    # print(points)
@socketio.on("closing")
def closing():

    if(request.sid in players):
        del players[request.sid]
    try:
        emit("remove", {
            "id":request.sid
        },broadcast=True)
        print("-------------DISCONNECT-------------")
        return
    except:
        pass
    print("-------------DISCONNECT-------------")
@socketio.on("disconnect")
def disconnect():

    if(request.sid in players):
        del players[request.sid]
    try:
        emit("remove", {
            "id":request.sid
        },broadcast=True)
        print("-------------DISCONNECT-------------")
        return
    except:
        pass
    print("-------------DISCONNECT-------------")

if __name__ == "__main__": 
    socketio.run(app=app,host="0.0.0.0",port = 6868)