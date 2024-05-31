

const button = document.getElementById("sendbutton")
const spotifybutton = document.getElementById("spotifybutton")
const input = document.getElementById("textinput")
const wikiEndpoint = "https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&prop=categories&generator=search&gsrlimit=5&cllimit=1000&gsrsearch="
const mbzendpoint = "http://musicbrainz.org/ws/2/artist/?fmt=json&limit=1&query="

spotifybutton.addEventListener("click", async () => {
    const response = await fetch("/api/spotify/likes")
    const data = await response.json()
    // const artistArray = data.items.map( (t) => 
    //     t.track.artists.map( ((ar) => ar.name)))

    
    var complete = {}
    for(const artists of data.items) {
        // console.log("artist object", artists)
        for(const artist of artists?.track?.artists) {
            if(artist.name in complete) {
                complete[artist.name].count += 1
                continue
            }
            const res = await fetch(mbzendpoint + encodeURIComponent(artist.name))
            const d = await res.json()
            console.log(artist.name)
            
            complete[artist.name] = {count:1}
            if(d ){
                
                complete[artist.name].data = d.artists[0]
                
            }
            
            
            
        }
    }
    console.log(complete)
}) 


button.addEventListener("click", async() => {
    const searchTerm = input.value
    try {
        var response = await fetch(mbzendpoint + encodeURIComponent(searchTerm))
        var data = await response.json()
        console.log(data)
        
    }
    catch(error) {
        console.log("error", error)
    }

    input.value = ''
})