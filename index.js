const favicon = require('serve-favicon');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
//FIGURE OUT HOW TO OPTIMIZE SOCKET

////CHAIRS 
app.use(favicon(__dirname + '/chairs/square.ico'));

app.use(express.static(__dirname + 'public/chairs'));
app.use(express.static(__dirname + 'public/chairs/models'));

app.get('/chairs', function(req, res) {
    res.sendFile(__dirname + '/chairs/index.html');
});
app.get('/chairs/webgl.js', function(req, res) {
    res.sendFile(__dirname + '/chairs/webgl.js');
});
app.get('/chairs/models/plane.obj', function(req, res) {
    res.sendFile(__dirname + '/chairs/models/plane.obj');
});
const chairsNamespace = io.of("/chairs")
const players = {};
var buffer;
var buf;
chairsNamespace.on('connection', function(socket) {
    console.log('USER CONNECTED');
    console.log(players)
    console.log(socket.id);
    
    players[socket.id] = {id:socket.id, 
        data:{
            position: [0,0,0],
            scale:1,
            rotation:[0,0],
            }};
    //SEND DICTIONARIES AS BINARY INSTEAD OF DICTIONARIES AND PARSE IT LATER
    buffer = Buffer.from(JSON.stringify({yourid: socket.id, players: players}), "utf8")
    // console.log(buffer)
    chairsNamespace.emit('conn', buffer);
    
    socket.on('new data', function(msg) {
        
        for (const [key, value] of Object.entries(msg)) {
            // console.log(key, value);
            players[socket.id].data[key] = value
        }
        // players[socket.id] = {id: socket.id, data:msg.data};
        buf = Buffer.from(JSON.stringify(players[socket.id]), "utf8")
        // console.log(Object.keys(players).length)
        chairsNamespace.emit('update', buf);
    });
    
    socket.on('disconnect', function() {
        if (socket.id in players) {
            delete players[socket.id];
        }
        chairsNamespace.emit('remove', {id: socket.id});
        console.log('-------------DISCONNECT-------------');
        console.log(Object.keys(players).length)
    });
});

////END CHAIRS



const port = 6868;
server.listen(port, function() {
    console.log(`Server started on port ${port}`);
});