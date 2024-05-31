

const button = document.getElementById("sendbutton")
const spotifybutton = document.getElementById("spotifybutton")
const input = document.getElementById("textinput")
const wikiEndpoint = "https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&prop=categories&generator=search&gsrlimit=5&cllimit=1000&gsrsearch="


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
            const res = await fetch(wikiEndpoint + encodeURIComponent(artist.name))
            const d = await res.json()
            console.log(artist.name)
            
            complete[artist.name] = {count:1}
            if(d ){
                // console.log(d)
                const articles = Object.values(d?.query?.pages || {}).sort(  (a,b) => {
                    // console.log(a, b);
                    return a.index < b.index ? -1 : 1
                })
                complete[artist.name].data = articles[0].title
                // complete[artist.name].data = articles.map( (li) => {
                //     let musician_score = 0
                //     let band_score = 0
                //     for(const cat of li.categories) {
                //         let musicianmatches = cat.title.match(/singer|musician|artist/g)
                //         let bandmatches = cat.title.match(/music group|group|band|supergroup/g)
                        
                //         if(musicianmatches != null) {
                //             musician_score += musicianmatches.length
                //         }
                //         if(bandmatches != null) {
                //             band_score += bandmatches.length
                //         }

                //     }

                //     // return {musician_score:li.categories.map( (cat) => cat.title)
                //     //     .reduce( (acc, curr) => {
                //     //         // console.log(curr.match(/singer|musician|artist/g));
                //     //         let matches = curr.match(/singer|musician|artist/g)
                //     //         // console.log(matches == null)
                //     //         let out = 0
                //     //         if(matches != null) {
                //     //             out = matches.length
                //     //         }
                //     //         return acc + out}, 0), title:li.title
                //     //     }
                //     // }
                //     return {musician_score:musician_score, band_score, title:li.title}
                //     }
                // )
            }
            
            
            
        }
    }
    console.log(complete)
}) 


button.addEventListener("click", async() => {
    const searchTerm = input.value
    try {
        var response = await fetch(wikiEndpoint + encodeURIComponent(searchTerm))
        var data = await response.json()
        // console.log(Object.values(data?.query?.pages))
        const articles = Object.values(data?.query?.pages).sort(  (a,b) => {
            // console.log(a, b);
            return a.index < b.index ? -1 : 1
        })
        console.log(articles)
        // const titles = articles.map( (a) => encodeURIComponent(a.title))
        // const titlesearch = titles.join("|")
        // console.log(titles)
        // console.log("title", titlesearch)
        // const second_endpoint = `https://en.wikipedia.org/w/api.php?action=query&origin=*&format=json&titles=${titlesearch}&gsrlimit=10`

        // response = await fetch(second_endpoint)
        // data = await response.json()
        // console.log(data)
    }
    catch(error) {
        console.log("error", error)
    }

    input.value = ''
})