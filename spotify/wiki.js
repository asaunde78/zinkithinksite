

const button = document.getElementById("sendbutton")
const spotifybutton = document.getElementById("spotifybutton")
const input = document.getElementById("textinput")
const wikiEndpoint = "https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&prop=categories&generator=search&gsrlimit=5&cllimit=1000&gsrsearch="
const mbzendpoint = "http://musicbrainz.org/ws/2/artist/?fmt=json&limit=1&query="

spotifybutton.addEventListener("click", async () => {
    const response = await fetch("/api/spotify/likes")
    const data = await response.json()
    
    // console.log(new Map(Object.values(data.likes).filter( (a) => a.track.preview_url).map( (a) => {return [a.track.name, a.track.preview_url]})))
    
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