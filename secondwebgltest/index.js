const favicon = require('serve-favicon');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
//FIGURE OUT HOW TO OPTIMIZE SOCKET
const players = {};
var buffer;
var buf;

app.use(favicon(__dirname + '/square.ico'));

app.use(express.static(__dirname + 'public'));
app.use(express.static(__dirname + 'public/models'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});
app.get('/webgl.js', function(req, res) {
    res.sendFile(__dirname + '/webgl.js');
});
app.get('/models/plane.obj', function(req, res) {
    res.sendFile(__dirname + '/models/plane.obj');
});

io.on('connection', function(socket) {
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
    io.emit('conn', buffer);
    
    socket.on('new data', function(msg) {
        
        for (const [key, value] of Object.entries(msg)) {
            // console.log(key, value);
            players[socket.id].data[key] = value
        }
        // players[socket.id] = {id: socket.id, data:msg.data};
        buf = Buffer.from(JSON.stringify(players[socket.id]), "utf8")
        // console.log(Object.keys(players).length)
        io.emit('update', buf);
    });
    
    socket.on('disconnect', function() {
        if (socket.id in players) {
            delete players[socket.id];
        }
        io.emit('remove', {id: socket.id});
        console.log('-------------DISCONNECT-------------');
        console.log(Object.keys(players).length)
    });
});

const port = 6868;
server.listen(port, function() {
    console.log(`Server started on port ${port}`);
});