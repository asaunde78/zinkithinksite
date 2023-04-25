var socket = io();

document.onmousemove = (event) => {
    socket.emit("new data",{"x":event.pageX,"y":event.pageY});
} 

socket.on('boo', (msg) => {
    // console.log(msg);
    let dot = document.getElementById(msg.id);

    if (dot === null) {
        // create dot
        dot = document.createElement('div');
        dot.id = msg.id;
        dot.style.display = 'block';
        dot.style.position = 'absolute';
        dot.style.height = '20px';
        dot.style.width = '20px';
        dot.style.backgroundColor = 'blue';
        dot.style.borderRadius = '50%';
        document.body.append(dot);
    }

    dot.style.left = (msg.x - 10) + 'px';
    dot.style.top = (msg.y - 10) + 'px';


});
