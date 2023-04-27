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
          // playerObjects[key] = new cube(key,[1,1,1,1],20,gl,[value.z,value.y,value.x])
          
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
    
    // playerObjects[msg.id] = new cube(msg.id,[1,1,1,1],20,gl,[msg.z,msg.y,msg.x])
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
    console.log(this.objOffset)
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

function update() {
    
}
const data ={
  height:5,
}
async function main() {
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  var canvas = document.querySelector("#canvas");
  gl = canvas.getContext("webgl");
  if (!gl) {
    return;
  }
  
  webglLessonsUI.setupUI(document.querySelector("#ui"), data, [
    { type: "slider",   key: "height", change:update, min: 0.000, max: 20, precision: 3, step: 0.001,},
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
  
  
  
  var response = await fetch('https://webglfundamentals.org/webgl/resources/models/chair/chair.obj');  
  const modelText = await response.text();
  response = await fetch("https://webglfundamentals.org/webgl/resources/models/book-vertex-chameleon-study/book.obj")
  
  const bookText = await response.text();
  response = await fetch("/models/plane.obj")
  const planeText = await response.text();
  console.log(planeText)

  var Chair = new model("chair",gl,[0,0,0],modelText,1)
  var Book = new model("book",gl,[0,0,0],bookText, 10)
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
    Book.setPos([z+1,0,x+1])
    Book.draw(programInfo,viewMatrix,projectionMatrix, m4.normalize([-1, 3, 5]))
    Plane.draw(programInfo,viewMatrix,projectionMatrix, m4.normalize([-1, 3, 5]))
    Chair.setPos([z,0,x])
    
    Chair.draw(programInfo, viewMatrix, projectionMatrix, m4.normalize([-1, 3, 5]))
    
    // console.log(playerObjects[Object.keys(playerObjects)[0]])
    
    // playerObjects.forEach( p => {
      
    //   console.log("1")
    //   console.log(p)
    //   playerObjects[p].draw(programInfo, viewProjectionMatrix)
    // })

    // for (const [key, value] of Object.entries(playerObjects)) {
    //   // console.log(key, value);
    //   if(value) {
    //     value.draw(programInfo, viewProjectionMatrix)
    //   }
    // }

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
  
  if(x_change != 0  && z_change != 0) {
    console.log("fixed")
    x_change /= 1.41
    z_change /= 1.41
  }
  x += x_change
  z -= z_change
  
  let y = 10
  socket.emit("new data",{"x":x,"y":y,"z":z});
  // console.log({x,y})
}
main();
