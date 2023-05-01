const favicon = require('serve-favicon');
const express = require('express');

// var gzipStatic = require('connect-gzip-static');
// var oneDay = 86400000;

// connect()
//   .use(gzipStatic(__dirname + '/public'))

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);


app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});


//FIGURE OUT HOW TO OPTIMIZE SOCKET
////UNITY
app.use("/unity", express.static('unity'))
app.get("/unity", function(req,res) {
    // console.log(req)
    res.sendFile(__dirname + '/unity/index.html');
});

////PET
app.use("/pet", express.static('pet'))
app.get('/pet', function(req, res) {
    res.sendFile(__dirname + '/pet/index.html');
});

////CHAIRS 
app.use(favicon(__dirname + '/chairs/square.ico'));
app.get('/chairs/square.ico', function(req, res) {
    res.sendFile(__dirname + '/chairs/square.ico');
});

app.use("/chairs", express.static("chairs"))
app.get('/chairs', function(req, res) {
    res.sendFile(__dirname + '/chairs/index.html');
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