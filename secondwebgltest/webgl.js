"use strict";
var socket = io();

let dot = null;
let myid = null
var playerObjects = {}
var gl;
var _x= 0
var _z= 0

var bytes = 0;
var jsonString ="";
var msg = "";
socket.on("conn", (buffer) => {
  
  bytes = new Uint8Array(buffer);

  // convert the bytes to a string
  jsonString = new TextDecoder().decode(bytes);

  // parse the JSON string into an object
  msg = JSON.parse(jsonString);
  // msg = JSON.parse(buffer.toString("utf8"))
  // playerName = msg.id
  if(msg){
    if(myid == null) {
      myid = msg.yourid
      // console.log(msg)
      // console.log(msg.yourid)
      msg.players
      playerObjects[msg.yourid] = false
      
      for (const [key, value] of Object.entries(msg.players)) {
        // console.log(key, value);
        if(value && key != myid) {
          playerObjects[key] = new cube(key,[1,1,1,1],20,gl,[value.z,value.y,value.x])
          
        }
      }
      console.log(playerObjects)
    }

    
  }

})
socket.on('update', (buffer) => {
  bytes = new Uint8Array(buffer);

  // convert the bytes to a string
  jsonString = new TextDecoder().decode(bytes);

  // parse the JSON string into an object
  msg = JSON.parse(jsonString);
  // console.log(msg);
  // console.log(!(msg.id in mouses))
  // console.log(msg.id, playerObjects)
  if(!(msg.id in playerObjects)) {
    //make a new object
    // console.log("made a new player lol")
    
    playerObjects[msg.id] = new cube(msg.id,[1,1,1,1],20,gl,[msg.z,msg.y,msg.x])
    // console.log(msg)
    
  }
  else {
    // console.log(msg)
    // console.log(playerObjects[msg.id])
    if(playerObjects[msg.id]) {
      //USE INTERPOLATION HERE??
      playerObjects[msg.id].setPos([msg.z,msg.y,msg.x])
    }
      // dot = mouses[msg.id]
    // console.log("used an existing circle")
  }
  //move the selected object


});
socket.on("remove", (msg) => {
  console.log("DISCONNECTED")
  console.log(msg.id,playerObjects,msg.id in playerObjects)
  
  if(msg.id in playerObjects){
    // console.log("TRYING TO DELETE")
    delete playerObjects[msg.id]
  }
  
});
window.addEventListener("beforeunload", function (e) {
  socket.emit("closing")
});


class gameObject {
  constructor(ucolor, gl, name,startingPos){
    this.name = name
    this.gl = gl
    this.translation = startingPos;
    this.bufferinfo = null
    this.uniforms = {
      u_colorMult: ucolor,
      u_matrix: m4.identity(),
    };
    this.rotation = [0,0]
    this.matrix = null
  }
  setPos(position) {
    this.translation = position;

  }
  computeMatrix(viewProjectionMatrix, translation, xRotation, yRotation) {
    this.matrix = m4.translate(viewProjectionMatrix,
        translation[0],
        translation[1],
        translation[2]);
    this.matrix = m4.xRotate(this.matrix, xRotation);
    return m4.yRotate(this.matrix, yRotation);
  }
  draw(programInfo, viewProjectionMatrix) {
    // console.log(this.gl);
    // console.log(this.bufferinfo)
    webglUtils.setBuffersAndAttributes(this.gl, programInfo, this.bufferinfo);
    this.uniforms.u_matrix = this.computeMatrix(
        viewProjectionMatrix,
        this.translation,
        this.rotation[0],
        this.rotation[1]);

    // Set the uniforms we just computed
    webglUtils.setUniforms(programInfo, this.uniforms);

    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.bufferinfo.numElements);
  }
  
}
class plane extends gameObject {
  constructor(name,ucolor, dimensions, gl,startingPos) {
    super(ucolor,gl,name,startingPos)
    this.bufferinfo = primitives.createPlaneWithVertexColorsBufferInfo(gl,dimensions[0],dimensions[1],120,120);
  }
}
class cube extends gameObject {
  constructor(name,ucolor, size, gl,startingPos) {
    super(ucolor,gl,name,startingPos)
    this.bufferinfo = primitives.createCubeWithVertexColorsBufferInfo(this.gl,size)
  }
}
function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }

  // creates buffers with position, normal, texcoord, and vertex color
  // data for primitives by calling gl.createBuffer, gl.bindBuffer,
  // and gl.bufferData
  const sphereBufferInfo = primitives.createSphereWithVertexColorsBufferInfo(gl, 10, 12, 6);
  const cubeBufferInfo   = primitives.createCubeWithVertexColorsBufferInfo(gl, 20);
  const coneBufferInfo   = primitives.createTruncatedConeWithVertexColorsBufferInfo(gl, 10, 0, 20, 12, 1, true, false);
  const planeBufferInfo = primitives.createPlaneWithVertexColorsBufferInfo(gl,1120,1120,120,120);
  // setup GLSL program
  var programInfo = webglUtils.createProgramInfo(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  var cameraAngleRadians = degToRad(0);
  var fieldOfViewRadians = degToRad(90);
  var cameraHeight = 50;
  
  var objects = []
  objects.push(new plane("map",[1,1,1,1],[1120,1120],gl,[0,0,0]))
  
  var Player = new cube("player",[1, 0.5, 0.5, 1],20,gl,[0,10,0])
  
  requestAnimationFrame(drawScene);
  let then = 0
  let deltaTime = 0;
  const fpsElem = document.getElementById("fps");
  const positionElem = document.getElementById("position");
  // Draw the scene.
  function drawScene(now) {
    now *= 0.001;
    deltaTime = now - then;
    then = now;
    const fps = 1 / deltaTime;             // compute frames per second
    fpsElem.textContent = fps.toFixed(1);
    positionElem.textContent = JSON.stringify({x,z})
    checkKeys()
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Clear the canvas AND the depth buffer.
    gl.clearColor(0.0,0.0,0.0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Compute the projection matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix =
      // m4.perspective(Math.PI * Math.sin(time), aspect, 1, 2000);
      m4.perspective(fieldOfViewRadians*1.2, aspect, 1, 2000);

    // Compute the camera's matrix using look at.
    
    
    // console.log({_x,_y})
    // var cameraPosition = [_x, _y, 60];
    var cameraPosition = [50, 50, 60];
    // var target = [_x, _y, 50];
    var target = [0, 0, 50];
    
    var up = [0, 1, 0];
    var cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);

    var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  
    // ------ Draw the sphere --------

    gl.useProgram(programInfo.program);
    objects.forEach(object => {
      // console.log(object.name)
      
      object.draw(programInfo, viewProjectionMatrix)
    });
    Player.setPos([_z,10,_x])
    Player.draw(programInfo, viewProjectionMatrix);

    
    // console.log(playerObjects[Object.keys(playerObjects)[0]])
    
    // playerObjects.forEach( p => {
      
    //   console.log("1")
    //   console.log(p)
    //   playerObjects[p].draw(programInfo, viewProjectionMatrix)
    // })
    for (const [key, value] of Object.entries(playerObjects)) {
      // console.log(key, value);
      if(value) {
        value.draw(programInfo, viewProjectionMatrix)
      }
    }

    // Squire.draw(programInfo,viewProjectionMatrix);
    // Map.draw(programInfo,viewProjectionMatrix);
    // Setup all the needed attributes.
    
    
    requestAnimationFrame(drawScene);
  }
}
var x = 0;
var z = 0;
// document.onmousemove = (event) => {
//   x = event.pageX;
//   y = event.pageY;
//   // console.log({x,y})
// }
let keys = {};
window.onkeydown = function(e) {

  keys[e.keyCode ? e.keyCode : e.which] = true;

}
window.onkeyup = function(e) {
  
  keys[e.keyCode ? e.keyCode : e.which] = false;
}
function checkKeys() {
  let x_change = 0;
  let z_change = 0;
  let initSpeed = 5
  let speed = 0 
  if (keys[16]) {
      //shift
      speed = initSpeed * 2;
  } else {
      speed = initSpeed;
  }

  if (keys[87]) {
      //w
      z_change += speed;
  }
  if (keys[83]) {
      //s
      z_change -= speed;
  }
  if (keys[65]) {
      //a
      x_change += speed;
  }
  if (keys[68]) {
      //d
      x_change -= speed;
  }
  x -= x_change
  z -= z_change
  _x = -50*(x-gl.canvas.clientHeight/2)/gl.canvas.clientHeight;
  _z = 50*(z-gl.canvas.clientWidth/2)/gl.canvas.clientWidth;
  let y = 10
  socket.emit("new data",{"x":_x,"y":y,"z":_z});
  // console.log({x,y})
}
main();
