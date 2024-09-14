const favicon = require('serve-favicon');
const express = require('express');
const path = require("path");
const axios = require("axios")

const querystring = require("node:querystring")
require("dotenv").config()

const cookieParser =require("cookie-parser")

const { MongoClient, SecureApiVersion } = require("mongodb");
const { setMaxIdleHTTPParsers } = require('http');
const { addAbortListener } = require('events');

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
app.use(cookieParser())
const server = require('http').createServer(app);
const io = require('socket.io')(server);


app.get('/', function(req, res) {
    // console.log(req)
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
app.use("/pokemon", express.static('pokemon'))
app.get('/pokemon', function(req, res) {
    res.sendFile(__dirname + '/pokemon/index.html');
});


app.get("/api/pokemon/search/",  (req, res) => {
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
    
    client.db("details").collection("pokemon").find().toArray().then( (arr) => {
        // console.log(arr)
        res.send(arr.map( (elem) => {
            let i = ""
            try {
                // i = elem.sprites.other["official-artwork"].front_default
                i = elem.card_data[0].images.large
                // console.log(i)
            }
            catch {
                i = "Not Found."
            }
            return {
                name : elem.name, 
                type : elem.type,
                image: i

            }
        }))
    })
    
        //.then( (poke) => res.send(poke))
    
    
    
}) 

app.get("/api/pokemon/:pokename",  (req, res) => {
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
app.get("/auth/youtube", async(req, res) => {
    
})
app.get("/youtube/login", async(req, res)=> {
    
    const params = new URLSearchParams()
    params.append("client_id", process.env.GOOGLE_CLIENT_ID)
    // console.log(process.env.GOOGLE_CLIENT_ID)
    params.append("response_type", "token")
    params.append("redirect_uri", "http://localhost:6868/youtube")
    params.append("scope","https://www.googleapis.com/auth/youtube.readonly")
    try {
        let u = "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString()
        console.log(u)
        res.redirect(u)
        // const response = await axios.get("https://accounts.google.com/o/oauth2/v2/auth", params)
        // console.log(response)
        // res.send(response)

    }catch(error) {
        console.log("Error",error)
        return res.send("Some error occured")
    } 
})
app.get("/auth/discord", async(req, res)=> {
    // console.log(res)
    const code = req.query.code
    const params = new URLSearchParams()
    let user 
    params.append("client_id", process.env.CLIENT_ID)
    params.append("client_secret", process.env.CLIENT_SECRET)
    params.append("grant_type", "authorization_code")
    params.append("code", code)
    params.append("redirect_uri", "http://zink.apicius.local:6868/auth/discord")
    try {
        const response = await axios.post("https://discord.com/api/oauth2/token", params)
        console.log(response)
        const {access_token, token_type}= response.data
        console.log(access_token, token_type)
        const userRes = await axios.get("https://discord.com/api/users/@me", {
            headers: {
                authorization: `${token_type} ${access_token}` 
            }
        })
        console.log("Data: ", userRes)
        let body = `<img src="https://cdn.discordapp.com/avatars/${userRes.data.id}/${userRes.data.avatar}">`
        res.writeHead(200, {
            "Content-Length":Buffer.byteLength(body),
            "Content-Type":"text/html",
            "Set-Cookie": `token=${access_token}; Path=/; HttpOnly;`
        })
            .end(body)

    }catch(error) {
        console.log("Error",error)
        return res.send("Some error occured")
    } 
})

app.get("/spotify/login", async(req, res)=> {
    // console.log(res)
    const scope = "user-library-read user-read-email playlist-read-private"
    
    // params.append("client_secret", process.env.SPOTIFY_CLIENT_SECRET)
    
    try {
        res.redirect("https://accounts.spotify.com/authorize?" + 
            querystring.stringify({
                response_type: 'code',
                client_id: process.env.SPOTIFY_CLIENT_ID,
                scope: scope,
                redirect_uri: "http://zink.apicius.local:6868/auth/spotify",
            })
        )

    }catch(error) {
        console.log("Error",error)
        return res.send("Some error occured")
    } 
})

app.get("/auth/spotify", async(req, res)=> {
    var code = req.query.code || null;
    // console.log(code)
    // var state = req.query.state || null;
    const headers = {
        'content-type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'))
    }
    // console.log(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET)
    const params = {
        code: code,
        redirect_uri: "http://zink.apicius.local:6868/auth/spotify",
        grant_type: 'authorization_code',
        
    }
    
    try {
        console.log(params)
        const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify(params), {headers:headers})
        const access_token = response.data.access_token
        
        res.writeHead(200, {
            "Set-Cookie": `spotify_token=${access_token}; Path=/; HttpOnly;`,
    
        })
            .send()
        console.log(response)
    }
    catch(error) {
        console.log(error)
        return res.send("some error occured")
    }
    
    
    
})
app.get("/spotify/account", async (req, res) => {
    let token_type = "Bearer"
    try {
        const userRes = await axios.get("https://api.spotify.com/v1/me/tracks", {
            headers: {
                authorization: `${token_type} ${req.cookies.spotify_token}` 
            }
        })
        res.send(userRes.data)
    }
    catch(error) {
        console.log(error)
        return res.send("some error occured")
    }
}) 

async function addArtistDB(artist) {
    const spotifydb = client.db("details").collection("spotify")

    const mbzendpoint = "http://musicbrainz.org/ws/2/artist/?fmt=json&limit=1&query="

    const q = await spotifydb.findOne({name:artist.name})
    if(q !== null) {
        console.log("has", artist.name)

    }
    else {
        if(artist.name == "") {
            return
        }
        console.log("doesn't have", artist.name, "yet")
        await new Promise(resolve => setTimeout(resolve, 1000))
        const res = await fetch(mbzendpoint + encodeURIComponent(artist.name), {
            headers: new Headers({
                "Accept":"application/json",
                "Content-Type":"application/json",
                "User-Agent":"SpotifyLikedDemographics/1.0.1 ( zinkithink@gmail.com )"
            })
        })
        const d = await res.json()
        console.log(artist.name, d)
        if(d) {
            d.artists[0].name = artist.name
            // console.log(d.artists[0])
            spotifydb.insertOne(d.artists[0])    
        }
        else {
            spotifydb.insertOne({name:artist.name})
        }
    }
}
app.get("/api/spotify/grablikes", async (req, res) => {
    let token_type = "Bearer"
    try {
        
        const spotifyusers = client.db("details").collection("spotifyusers")

        const userData = await axios.get("https://api.spotify.com/v1/me", {
            headers: {
                authorization: `${token_type} ${req.cookies.spotify_token}` 
            }
        })
        const email = userData.data.email
        console.log("email:", email)
        var start = "https://api.spotify.com/v1/me/tracks?limit=50"
        var song_list = []
        while(start !== null) {
            const userRes = await axios.get(start, {
                headers: {
                    authorization: `${token_type} ${req.cookies.spotify_token}` 
                }
            })
            console.log("curr liked length: ",song_list.push(...userRes.data.items.map( (item) => 
                {
                    var n = {added_at:item.added_at}
                    Object.assign(n, item.track)
                    return n
                })))
            for (const artists of userRes.data.items) {
                for (const artist of artists?.track?.artists) {
                    await addArtistDB(artist)
                }
            }
        
            start = userRes.data.next
            
        }
        const user = await spotifyusers.findOne({email:email})
        if(user !== null) {
            console.log("users has ", user.email)
            spotifyusers.updateOne({email:email}, {$set: {likes:song_list}})
            
        }
        else {
            console.log("users doesn't have ", email)
            spotifyusers.insertOne({email:email, likes:song_list})
        }
        res.send(`Done! :D ${email}` )
        // res.send(userRes.data)
    }
    catch(error) {
        console.log(error)
        return res.send("some error occured")
    }
})
app.get("/api/spotify/likes", async (req, res) => {
    let token_type = "Bearer"
    const spotifyusers = client.db("details").collection("spotifyusers")
    
    try {
        const userData = await axios.get("https://api.spotify.com/v1/me", {
            headers: {
                authorization: `${token_type} ${req.cookies.spotify_token}` 
            }
        })
        const email = userData.data.email
        console.log(email)
        res.send(await spotifyusers.findOne({email:email}))
    }
    catch(error) {
        res.send("error")
    }
    

})
app.get("/api/spotify/likedata", async ( req, res) => {
    let token_type = "Bearer"
    const spotifyusers = client.db("details").collection("spotifyusers")
    const spotifydb = client.db("details").collection("spotify")
    try {
        const userData = await axios.get("https://api.spotify.com/v1/me", {
            headers: {
                authorization: `${token_type} ${req.cookies.spotify_token}` 
            }
        })
        const email = userData.data.email
        // console.log(email)
        const user = await spotifyusers.findOne({email:email})
        // const a = Object.values(user.likes).map( (e) => {
        //     const artist = await spotifydb.findOne({name:e.track.artists[0]})
        // })
        var songs = Object.values(user.likes)
        for (const [ind, song] of user.likes.entries()) {
            // console.log(song.track)
            for (const [aind, artist] of song.track.artists.entries()) {
                // console.log(song, ind)
                // console.log(aind, artist)
                // console.log()
                songs[ind].track.artists[aind] = await spotifydb.findOne({name:artist.name})
                continue
            }
        }
        res.send(songs)
    }
    catch(error) {
        res.send(`error${error}`)
    }

})
app.get("/api/spotify/fixdb", async (req, res)=> {
    const spotifydb = client.db("details").collection("spotify")
    // const data = await spotifydb.find().toArray()
    // for (const artist of data) {
    //     spotifydb.updateOne({name:artist.name}, {$set:artist.data, $unset:{data:""}})

    // }
    // spotifydb.aggregate([ {$unset:"data"}])
    // // console.log(data)
    res.send(await spotifydb.find().toArray())
})

app.get("/api/spotify/senddb", async (req, res)=> {
    const spotifydb = client.db("details").collection("spotify")
    // const data = await spotifydb.find().toArray()
    // for (const artist of data) {
    //     spotifydb.updateOne({name:artist.name}, {$set:artist.data, $unset:{data:""}})

    // }
    // spotifydb.aggregate([ {$unset:"data"}])
    // // console.log(data)
    res.send(await spotifydb.find().toArray())
})
// app.get("/api/spotify/cleardb", async (req, res) => {
//     client.db("details").collection("spotify").drop()
//     res.send("cleared")
// })

app.use("/spotify", express.static('spotify'))
app.get('/spotify', function(req, res) {
    res.sendFile(__dirname + '/spotify/index.html', {headers:{
        "Access-Control-Allow-Origin":"https://en.wikipedia.org"}
    });
});

//store discord user id in database then grab user data from database based on id 
//implement token referesh? 
//use views/template for account stuff

//https://stackoverflow.com/questions/5998694/how-to-create-an-https-server-in-node-js need this for https


app.get("/account", async(req, res) => {
    let token_type = "Bearer"
    const userRes = await axios.get("https://discord.com/api/users/@me", {
        headers: {
            authorization: `${token_type} ${req.cookies.token}` 
        }
    })
    res.send(`<img src="https://cdn.discordapp.com/avatars/${userRes.data.id}/${userRes.data.avatar}">`)
})
const port = 6868;
server.listen(port, function() {
    console.log(`Server started on port ${port}`);
});
