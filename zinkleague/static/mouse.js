var socket = io();
var mouses = {};
let dot = null;
document.onmousemove = (event) => {
    socket.emit("new data",{"x":event.pageX,"y":event.pageY});
} 

socket.on('update', (msg) => {
    // console.log(msg);
    // console.log(!(msg.id in mouses))
    if(!(msg.id in mouses)) {
        dot = document.createElement('div');
        dot.id = msg.id;
        dot.style.display = 'block';
        dot.style.position = 'absolute';
        dot.style.height = '20px';
        dot.style.width = '20px';
        dot.style.backgroundColor = 'blue';
        dot.style.borderRadius = '50%';
        document.body.append(dot);
        mouses[msg.id] = dot
        // console.log("created a new circle")
    }
    else {
        dot = mouses[msg.id]
        // console.log("used an existing circle")
    }

    dot.style.left = (msg.x - 10) + 'px';
    dot.style.top = (msg.y - 10) + 'px';


});
socket.on("remove", (msg) => {
    console.log("DISCONNECTED")
    dot = mouses[msg.id]
    if (dot != null) {
        dot.remove()
    }
    if(msg.id in mouses){
        delete mouses[msg.id]
    }
});
