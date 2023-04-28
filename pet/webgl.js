"use strict";

// import { emit } from "process";


var gl;


var canvas = document.querySelector("#canvas");
gl = canvas.getContext("webgl");
function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}
function parseMapArgs(unparsedArgs) {
  // TODO: handle options
  console.log(unparsedArgs)
  return unparsedArgs;
}
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
  
  
}
class model extends gameObject {
  constructor(name,gl,startingPos, modelText,matText, scale) {
    super(gl,name,startingPos)
    if(scale == null) {
      this.scale = 1
    }
    else {
      this.scale = scale
    }
    this.obj = this.parseOBJ(modelText)
    const matTexts = matText
    // console.log(matText)
    const materials = this.parseMTL(matTexts);
    console.log(materials)
    const textures = {
      defaultWhite: this.create1PixelTexture(this.gl, [255, 255, 255, 255]),
    };
  
    // load texture for materials
    for (const material of Object.values(materials)) {
      Object.entries(material)
        .filter(([key]) => key.endsWith('Map'))
        .forEach(([key, filename]) => {
          console.log("key: ",key,"filename: ",filename)
          let texture = textures[filename];
          if (!texture) {
            // let baseHref = "models/"
            // console.log(baseHref,filename)
            // const textureHref = new URL(filename, baseHref).href;
            texture = this.createTexture(this.gl, filename);
            // console.log("texture:",texture)
            textures[filename] = texture;
          }

          material[key] = texture;
          console.log(texture)
        });
    }
    // console.log("textures: ",textures)
    const defaultMaterial = {
      diffuse: [1, 1, 1],
      diffuseMap: textures.defaultWhite,
      ambient: [0, 0, 0],
      specular: [1, 1, 1],
      shininess: 400,
      opacity: 1,
    };
    this.parts = this.obj.geometries.map(({material,data}) => {
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
          ...defaultMaterial,
          ...materials[material],
        },
        bufferinfo,
      };
    });
    console.log("parts: ",this.parts)
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
  
  draw(programInfo, view, projection, lightDirection,cameraPosition) {
    // console.log("drawing")
    const sharedUniforms = {
      u_lightDirection: lightDirection,//m4.normalize([-1, 3, 5]),
      u_view: view,
      u_projection: projection,
      u_viewWorldPosition: cameraPosition,
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
    u_world= m4.translate(u_world, ...this.objOffset)
    // console.log("u_world: ",u_world)
    for (const {bufferinfo, material} of this.parts) {
      
      // calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
      // console.log(bufferinfo)
      webglUtils.setBuffersAndAttributes(this.gl, programInfo, bufferinfo);
      // calls gl.uniform
      webglUtils.setUniforms(programInfo, {
        u_world,
      }, material);
      
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
  
  create1PixelTexture(gl, pixel) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array(pixel));
    return texture;
  }
  
  createTexture(gl, url) {
    const texture = this.create1PixelTexture(this.gl, [128, 192, 255, 255]);
    // Asynchronously load an image
    const image = new Image();
    image.src = "/pet/models/" + url;
    image.addEventListener('load', function() {
      // Now that the image has loaded make copy it to the texture.
      // console.log("loaded image")
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  
      // Check if the image is a power of 2 in both dimensions.
      if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
         // Yes, it's a power of 2. Generate mips.
         gl.generateMipmap(gl.TEXTURE_2D);
      } else {
         // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
         gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    });
    // console.log("returning texture")
    return texture;
  }
  
  
  parseMTL(text) {
    const materials = {};
    let material;
  
    const keywords = {
      newmtl(parts, unparsedArgs) {
        material = {};
        materials[unparsedArgs] = material;
      },
      /* eslint brace-style:0 */
      Ns(parts)       { material.shininess      = parseFloat(parts[0]); },
      Ka(parts)       { material.ambient        = parts.map(parseFloat); },
      Kd(parts)       { material.diffuse        = parts.map(parseFloat); },
      Ks(parts)       { material.specular       = parts.map(parseFloat); },
      Ke(parts)       { material.emissive       = parts.map(parseFloat); },
      map_Kd(parts, unparsedArgs)   { material.diffuseMap = parseMapArgs(unparsedArgs);},
      map_Ns(parts, unparsedArgs)   { material.specularMap = parseMapArgs(unparsedArgs); },
      map_Bump(parts, unparsedArgs) { material.normalMap = parseMapArgs(unparsedArgs); },
      Ni(parts)       { material.opticalDensity = parseFloat(parts[0]); },
      d(parts)        { material.opacity        = parseFloat(parts[0]); },
      illum(parts)    { material.illum          = parseInt(parts[0]); },
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
  
    return materials;
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
// let prevSize = 0
// let prevRot = []
// function update() {
//   if(prevSize != data.scale){
//     socket.emit("new data", {scale:data.scale})
//     prevSize = data.scale
//   }
//   if(prevRot != data.rotation) {
//     socket.emit("new data", {rotation:[0,data.rotation]})
//   }
// }
function update() {

}
const data ={
  scale:1.3,
  rotation:0,
  distance:80,
}
async function main() {
  await pre()
  // Get A WebGL context
  /** @type {HTMLCanvasElement} */
  
  
  webglLessonsUI.setupUI(document.querySelector("#ui"), data, [
    { type: "slider",   key: "scale", change:update, min: 0.01, max: 5, precision: 3, step: 0.001,},
    { type: "slider",   key: "rotation", change:update, min: 0.01, max: 2*Math.PI, precision: 3, step: 0.001,},
    { type: "slider",   key: "distance", change:update, min: 10, max: 100, precision: 3, step: 0.001,},
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
  
  

  
  var Dog = new model("dog",gl,[0,0,0],dogText,matText,1)
  
  requestAnimationFrame(drawScene);

  let then = 0
  let deltaTime = 0;
  // const fpsElem = document.getElementById("fps");
  // const positionElem = document.getElementById("position");
  // Draw the scene.
  function drawScene(now) {
    now *= 0.001;
    deltaTime = now - then;
    then = now;
    // const fps = 1 / deltaTime;             // compute frames per second
    // fpsElem.textContent = fps.toFixed(1);
    
    webglUtils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Clear the canvas AND the depth buffer.
    gl.clearColor(1.0,1.0,1.0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Compute the projection matrix
    var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    var projectionMatrix =
      // m4.perspective(Math.PI * Math.sin(time), aspect, 1, 2000);
      m4.perspective(fieldOfViewRadians/.2, aspect, .001, 1000);

    
    var up = [0, 1, 0];
    var s = data.distance
    var cameraPosition = [s,100,s]//[s*Math.cos(now),100, s*Math.sin(now)];
    // var target = [_z, 10, _x];
    var target = [0,0,0];
    var cameraMatrix = m4.lookAt(cameraPosition, target, up);

    // Make a view matrix from the camera matrix.
    var viewMatrix = m4.inverse(cameraMatrix);

    // var viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    // ------ Draw the sphere --------

    gl.useProgram(programInfo.program);
    
    var lighting =  m4.normalize([-1, 3, 5])
    
    Dog.setPos([0,0,0])
    Dog.setRot([0,data.rotation])
    Dog.setScale(data.scale)
    Dog.draw(programInfo, viewMatrix, projectionMatrix,lighting,cameraPosition)
    
    requestAnimationFrame(drawScene);
  }
}

// document.onmousemove = (event) => {
//   x = event.pageX;
//   y = event.pageY;
//   // console.log({x,y})
// }


var dogText; 
var matText;

async function pre() {
  
  var response = await fetch("/pet/models/dog.obj")

  dogText = await response.text();
  response = await fetch("/pet/models/dog.mtl")
  matText = await response.text();
  // console.log(planeText)
  
  
    
}
main()

