"use strict";

// import { emit } from "process";

var socket = io();


let myid = null
var playerObjects = {}
var preload;
var gl;
var _x= 0
var _z= 0

var bytes = 0;
var jsonString ="";
var msg = "";

var canvas = document.querySelector("#canvas");
gl = canvas.getContext("webgl");

socket.on("conn", (buffer) => {
  console.log("connecting")
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
      console.log("INITIAL LOAD IN")
      // console.log(msg)
      // console.log(msg.yourid)
      
      playerObjects[msg.yourid] = false
      preload = msg.players
      
      // console.log(playerObjects)
    }

    
  }
})

class gameObject {
  constructor(gl, name,startingPos){
    this.name = name
    this.gl = gl
    this.translation = startingPos;
    this.bufferinfo = null
    this.matrix = null
    this.rotation = [0,0]
    
  }
  setPos(position) {
    this.translation = position;

  }
  setScale(scale) {
    this.scale = scale
  }
  setRot(rotation){
    this.rotation = rotation
  }
  computeMatrix(matrixin, translation, xRotation, yRotation) {
    this.matrix = m4.translate(matrixin,
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
class model extends gameObject {
  constructor(name,gl,startingPos, modelText, scale) {
    super(gl,name,startingPos)
    if(scale == null) {
      this.scale = 1
    }
    else {
      this.scale = scale
    }
    this.obj = this.parseOBJ(modelText)
    this.parts = this.obj.geometries.map(({data}) => {
      if (data.color) {
        if (data.position.length === data.color.length) {
          // it's 3. The our helper library assumes 4 so we need
          // to tell it there are only 3.
          data.color = { numComponents: 3, data: data.color };
        }
      } else {
        // there are no vertex colors so just use constant white
        data.color = { value: [1, 1, 1, 1] };
      }
      // console.log(data)
      
      const bufferinfo = webglUtils.createBufferInfoFromArrays(this.gl, data);
      return {
        material: {
          //random materials for now
          u_diffuse: [1, 1, 1, 1]//[Math.random(), Math.random(), Math.random(), 1],
        },
        bufferinfo,
      };
    });
    this.extents = this.getGeometriesExtents(this.obj.geometries);
    this.range =  m4.subtractVectors(this.extents.max, this.extents.min);
    // console.log(this.extents.min)
    this.objOffset = m4.scaleVector(
      m4.addVectors(
        this.extents.min,
        m4.scaleVector(this.range, 0.5)),
      -1);
    // console.log(this.objOffset)
  }
  draw(programInfo, view, projection, lightDirection) {
    const sharedUniforms = {
      u_lightDirection: lightDirection,//m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
      u_scale: [this.scale,this.scale,this.scale,1],
    };
    // sharedUniforms.u_projection = this.computeMatrix(
    //   sharedUniforms.u_projection,
    //   this.translation,
    //   this.rotation[0],
    //   this.rotation[1]);
    // sharedUniforms.u_view = this.computeMatrix(
    //   sharedUniforms.u_view,
    //   this.translation,
    //   this.rotation[0],
    //   this.rotation[1]);
    webglUtils.setUniforms(programInfo, sharedUniforms);
    // console.log(this.parts)
    var u_world = m4.identity()
    u_world = this.computeMatrix(
      u_world,
      this.translation,
      this.rotation[0],
      this.rotation[1]);
    for (const {bufferinfo, material} of this.parts) {
      
      // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
      webglUtils.setBuffersAndAttributes(this.gl, programInfo, bufferinfo);
      // calls gl.uniform
      webglUtils.setUniforms(programInfo, {
        u_world,
        u_diffuse: material.u_diffuse,
      });
      // calls gl.drawArrays or gl.drawElements
      webglUtils.drawBufferInfo(this.gl, bufferinfo);
    }
  }
  getExtents(positions) {
    const min = positions.slice(0, 3);
    const max = positions.slice(0, 3);
    for (let i = 3; i < positions.length; i += 3) {
      for (let j = 0; j < 3; ++j) {
        const v = positions[i + j];
        min[j] = Math.min(v, min[j]);
        max[j] = Math.max(v, max[j]);
      }
    }
    return {min, max};
  }

  getGeometriesExtents(geometries) {
    return geometries.reduce(({min, max}, {data}) => {
      const minMax = this.getExtents(data.position);
      return {
        min: min.map((min, ndx) => Math.min(minMax.min[ndx], min)),
        max: max.map((max, ndx) => Math.max(minMax.max[ndx], max)),
      };
    }, {
      min: Array(3).fill(Number.POSITIVE_INFINITY),
      max: Array(3).fill(Number.NEGATIVE_INFINITY),
    });
  }
  parseOBJ(text) {
    // because indices are base 1 let's just fill in the 0th data
    const objPositions = [[0, 0, 0]];
    const objTexcoords = [[0, 0]];
    const objNormals = [[0, 0, 0]];
    const objColors = [[0, 0, 0]];

    // same order as `f` indices
    const objVertexData = [
      objPositions,
      objTexcoords,
      objNormals,
      objColors,
    ];
  
    // same order as `f` indices
    let webglVertexData = [
      [],   // positions
      [],   // texcoords
      [],   // normals
      [], //colors
    ];
  
    const materialLibs = [];
    const geometries = [];
    let geometry;
    let groups = ['default'];
    let material = 'default';
    let object = 'default';
  
    const noop = () => {};
  
    function newGeometry() {
      // If there is an existing geometry and it's
      // not empty then start a new one.
      if (geometry && geometry.data.position.length) {
        geometry = undefined;
      }
    }
  
    function setGeometry() {
      if (!geometry) {
        const position = [];
        const texcoord = [];
        const normal = [];
        const color = [];
        webglVertexData = [
          position,
          texcoord,
          normal,
          color,
        ];
        geometry = {
          object,
          groups,
          material,
          data: {
            position,
            texcoord,
            normal,
            color,
          },
        };
        geometries.push(geometry);
      }
    }
  
    function addVertex(vert) {
      const ptn = vert.split('/');
      ptn.forEach((objIndexStr, i) => {
        if (!objIndexStr) {
          return;
        }
        const objIndex = parseInt(objIndexStr);
        const index = objIndex + (objIndex >= 0 ? 0 : objVertexData[i].length);
        webglVertexData[i].push(...objVertexData[i][index]);
        if (i === 0 && objColors.length > 1) {
          geometry.data.color.push(...objColors[index]);
        }
      });
    }
  
    const keywords = {
      v(parts) {
        if (parts.length > 3) {
          objPositions.push(parts.slice(0, 3).map(parseFloat));
          objColors.push(parts.slice(3).map(parseFloat));
        } else {
          objPositions.push(parts.map(parseFloat));
        }
      },
      vn(parts) {
        objNormals.push(parts.map(parseFloat));
      },
      vt(parts) {
        // should check for missing v and extra w?
        objTexcoords.push(parts.map(parseFloat));
      },
      f(parts) {
        setGeometry();
        const numTriangles = parts.length - 2;
        for (let tri = 0; tri < numTriangles; ++tri) {
          addVertex(parts[0]);
          addVertex(parts[tri + 1]);
          addVertex(parts[tri + 2]);
        }
      },
      s: noop,    // smoothing group
      mtllib(parts, unparsedArgs) {
        // the spec says there can be multiple filenames here
        // but many exist with spaces in a single filename
        materialLibs.push(unparsedArgs);
      },
      usemtl(parts, unparsedArgs) {
        material = unparsedArgs;
        newGeometry();
      },
      g(parts) {
        groups = parts;
        newGeometry();
      },
      o(parts, unparsedArgs) {
        object = unparsedArgs;
        newGeometry();
      },
    };
  
    const keywordRE = /(\w*)(?: )*(.*)/;
    
    const lines = text.split('\n');
    for (let lineNo = 0; lineNo < lines.length; ++lineNo) {
      const line = lines[lineNo].trim();
      if (line === '' || line.startsWith('#')) {
        continue;
      }
      const m = keywordRE.exec(line);
      if (!m) {
        continue;
      }
      const [, keyword, unparsedArgs] = m;
      const parts = line.split(/\s+/).slice(1);
      const handler = keywords[keyword];
      if (!handler) {
        console.warn('unhandled keyword:', keyword);  // eslint-disable-line no-console
        continue;
      }
      handler(parts, unparsedArgs);
    }
  
    // remove any arrays that have no entries.
    for (const geometry of geometries) {
      geometry.data = Object.fromEntries(
          Object.entries(geometry.data).filter(([, array]) => array.length > 0));
    }
    
    return {
      geometries,
      materialLibs,
    };
  }
  
}
let prevSize = 0
let prevRot = []
function update() {
  if(prevSize != data.scale){
    socket.emit("new data", {scale:data.scale})
    prevSize = data.scale
  }
  if(prevRot != data.rotation) {
    socket.emit("new data", {rotation:[0,data.rotation]})
  }
}
const data ={
  height:5,
  scale:1,
  rotation:0,
}
async function main() {
  await pre()
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  
  
  webglLessonsUI.setupUI(document.querySelector("#ui"), data, [
    { type: "slider",   key: "height", change:update, min: 0.001, max: 20, precision: 3, step: 0.001,},
    { type: "slider",   key: "scale", change:update, min: 0.01, max: 5, precision: 3, step: 0.001,},
    { type: "slider",   key: "rotation", change:update, min: 0.01, max: 2*Math.PI, precision: 3, step: 0.001,},
  ]);

  // creates buffers with position, normal, texcoord, and vertex color
  // data for primitives by calling gl.createBuffer, gl.bindBuffer,
  // and gl.bufferData
  
  // setup GLSL program
  var programInfo = webglUtils.createProgramInfo(gl, ["vertex-shader-3d", "fragment-shader-3d"]);

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  var cameraAngleRadians = degToRad(0);
  var fieldOfViewRadians = degToRad(90);
  var cameraHeight = 50;
  
  

  for (const [key, value] of Object.entries(preload)) {
    // console.log(key, value);
    if(value && key != myid ) {
      // console.log(value,key)
      
      playerObjects[value.id] = new model(value.id,gl,value.data.position ,modelText,1)
      
    }
  }
  console.log("After loading: ",playerObjects)
  var Chair = new model("chair",gl,[0,0,0],modelText,1)
  var Book = new model("book",gl,[0,1,0],bookText, 10)
  // Book.setRot([0,Math.PI/2])
  var Plane = new model("plane", gl,[0,0,0],planeText, 10)
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
      m4.perspective(fieldOfViewRadians/.9, aspect, .001, 1000);

    
    // var target = [_x, _y, 50];
    
    
    var up = [0, 1, 0];
    var cameraPosition = [10, data.height, 10];
    // var target = [_z, 10, _x];
    var target = [0,0,0];
    var cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);

    // var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  
    // ------ Draw the sphere --------

    gl.useProgram(programInfo.program);
    // objects.forEach(object => {
    //   // console.log(object.name)
      
    //   object.draw(programInfo, viewProjectionMatrix)
    // });
    // Player.setPos([_z,10,_x])
    // Player.draw(programInfo, viewProjectionMatrix);
    Book.setPos([x,4,z])
    var lighting =  m4.normalize([-1, 3, 5])
    Book.draw(programInfo,viewMatrix,projectionMatrix,lighting)
    Plane.draw(programInfo,viewMatrix,projectionMatrix,lighting)
    Chair.setPos([x,0,z])
    Chair.setRot([0,data.rotation])
    Chair.setScale(data.scale)
    
    Chair.draw(programInfo, viewMatrix, projectionMatrix,lighting)
    
    // console.log(playerObjects[Object.keys(playerObjects)[0]])
    
    // playerObjects.forEach( p => {
      
    //   console.log("1")
    //   console.log(p)
    //   playerObjects[p].draw(programInfo, viewProjectionMatrix)
    // })

    for (const [key, value] of Object.entries(playerObjects)) {
      // console.log(key, value);
      if(value) {
        value.draw(programInfo, viewMatrix, projectionMatrix,lighting)
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
  let initSpeed = 0.2
  let speed = 0 
  if (keys[16]) {
      //shift
      speed = initSpeed * 2;
  } else {
      speed = initSpeed;
  }

  if (keys[87]) {
      //w
      x_change += speed;
  }
  if (keys[83]) {
      //s
      x_change -= speed;
  }
  if (keys[65]) {
      //a
      z_change += speed;
  }
  if (keys[68]) {
      //d
      z_change -= speed;
  }
  
  if(x_change != 0  && z_change != 0) {
    x_change /= 1.41
    z_change /= 1.41
  }
  z += z_change
  x -= x_change
  
  let y = 0
  socket.emit("new data",{position:[x,y,z]});
  // console.log({x,y})
}
var modelText= ""
var bookText = ""
var planeText; 
async function pre() {
  var response = await fetch('https://webglfundamentals.org/webgl/resources/models/chair/chair.obj');  
  modelText = await response.text();
  response = await fetch("https://webglfundamentals.org/webgl/resources/models/book-vertex-chameleon-study/book.obj")
  
  bookText= await response.text();
  response = await fetch("/models/plane.obj")
  planeText = await response.text();
  // console.log(planeText)
  
  
  socket.on('update', (buffer) => {
    bytes = new Uint8Array(buffer);

    // convert the bytes to a string
    jsonString = new TextDecoder().decode(bytes);

    // parse the JSON string into an object
    msg = JSON.parse(jsonString);
    // console.log(msg);
    // console.log(!(msg.id in mouses))
    // console.log(msg.id, playerObjects)
    if(msg.id && !(msg.id in playerObjects) && msg.id != myid) {
      //make a new object
      // console.log("made a new player lol")
      console.log("update",msg.data)
      playerObjects[msg.id] = new model(msg.id,gl,msg.data.position,modelText,1)
      // console.log(msg)
      
    }
    else {
      // console.log(msg)
      // console.log(playerObjects[msg.id])
      if(playerObjects[msg.id]) {
        //USE INTERPOLATION HERE??
        
        if(msg.data.position){
          playerObjects[msg.id].setPos(msg.data.position)
        }
        if(msg.data.scale) {
          playerObjects[msg.id].setScale(msg.data.scale)
        }
        if(msg.data.rotation) {
          playerObjects[msg.id].setRot(msg.data.rotation)
        }
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
    
    
}
main()

