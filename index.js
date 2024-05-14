const favicon = require('serve-favicon');
const express = require('express');
const path = require("path");
const { MongoClient, SecureApiVersion } = require("mongodb")

const client = new MongoClient( "mongodb://localhost:27017");
client.connect()
    .then( () => {
        console.log("MongoDB Connected!")
        // client.db("details").collection("pokemon").findOne().then( (poke) => console.log(poke))
        
    })
// var gzipStatic = require('connect-gzip-static');
// var oneDay = 86400000;

// connect()
//   .use(gzipStatic(__dirname + '/public'))

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);


app.get('/', function(req, res) {
    console.log(req)
    res.sendFile(__dirname + '/index.html');
});


//FIGURE OUT HOW TO OPTIMIZE SOCKET
////UNITY
app.get("/unity/Build/*.gz", function(req,res) {
    // console.log(req)
    // res.send("HI")
    console.log("Filename:",path.basename(req.path))
    if(path.basename(req.path).includes(".data")) {
        
        console.log("Encoding for .data")
        res.set('Content-Type', 'application/octet-stream');
    }
    if(path.basename(req.path).includes(".wasm")) {
        console.log("Encoding for .wasm")
        res.set('Content-Type', 'application/wasm');
        
    }
    // if(extensionFile === '.data' || extensionFile === '.mem'){
    //     res.header('Content-Type', 'application/octet-stream');
    // }
    res.set('Content-Encoding', 'gzip');
    // console.log("RESOLVE?", __dirname +req.path)
    // console.log(res)
    res.sendFile(__dirname + req.path);
});
app.use("/unity", express.static('unity'), function(req,res) {
    console.log(req)
});
// app.get("/unity", function(req,res) {
//     console.log(req)
//     res.sendFile(__dirname + '/unity/index.html');
// });


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
app.get("/pokemon/search/",  (req, res) => {
    // client.db("details").collection("pokemon").aggregate(
    //     [{$sample: {size:1}}]
    // ).toArray().then( (arr) => {
    //     // console.log(arr)
    //     res.send(arr)
    // })
    console.log("search", req.params, req.query)
    
    console.log(req.query.type)
    query = {
        type: {$all:Array(req.query.type)}
    }
    if(req.query.onetype != null) {
        query.type.$size = 1
    }
    console.log(query)
    client.db("details").collection("pokemon").find(
        query
    ).toArray().then( (arr) => {
        // console.log(arr)
        res.send(arr.map( (elem) => elem.name))
    })
    
        //.then( (poke) => res.send(poke))
    
    
    
}) 

app.get("/pokemon/:pokename",  (req, res) => {
    // client.db("details").collection("pokemon").aggregate(
    //     [{$sample: {size:1}}]
    // ).toArray().then( (arr) => {
    //     // console.log(arr)
    //     res.send(arr)
    // })
    console.log(req.params, req.query)
    console.log(req.params.pokename)

    query = {

    }
    client.db("details").collection("pokemon").find(
        {name: req.params.pokename}
    ).toArray().then( (arr) => {
        // console.log(arr)
        res.send(arr)
    })
    
        //.then( (poke) => res.send(poke))
    
    
    
}) 

const port = 6868;
server.listen(port, function() {
    console.log(`Server started on port ${port}`);
});