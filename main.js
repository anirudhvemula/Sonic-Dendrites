const canvas = document.getElementById("gl");
const gl = canvas.getContext("webgl2");
if (!gl) {
  alert("WebGL2 not supported");
}

if (!gl.getExtension("EXT_color_buffer_float")) {
  alert("EXT_color_buffer_float not supported");
}



canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

gl.viewport(0, 0, canvas.width, canvas.height);

// ---- Utilities ----
function createShader(type, source) {
  const s = gl.createShader(type);
  gl.shaderSource(s, source);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
  }
  return s;
}

function createProgram(vsSrc, fsSrc) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSrc);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vs));
  }

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSrc);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fs));
  }

  const p = gl.createProgram();
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(p));
  }
  return p;
}


// ---- Fullscreen Quad ----
const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1,-1, 1,-1, -1,1,
  -1,1, 1,-1, 1,1
]), gl.STATIC_DRAW);

// ---- Vertex Shader ----
const vertexSrc = await fetch("shaders/vertex.glsl").then(r => r.text());


// ---- Load fragment shaders ----
const fieldSrc   = await fetch("shaders/field.frag").then(r=>r.text());
const displaySrc = await fetch("shaders/display.frag").then(r=>r.text());

const growSrc = await fetch("shaders/grow.frag").then(r => r.text());
const growProgram = createProgram(vertexSrc, growSrc);


//const fieldProgram   = createProgram(vertexSrc, fieldSrc);
//const growthProgram  = createProgram(vertexSrc, growthSrc);
const displayProgram = createProgram(vertexSrc, displaySrc);

// ---- Bind sampler uniforms ----



// display.frag
gl.useProgram(displayProgram);
gl.uniform1i(gl.getUniformLocation(displayProgram, "tex"), 0);


// ---- Texture Helper ----
function createTexture() {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA32F,
    canvas.width,
    canvas.height,
    0,
    gl.RGBA,
    gl.FLOAT,
    null
  );

  return t;
}

function clearTexture(tex) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
  );
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}


const fieldA  = createTexture();
const fieldB  = createTexture();
const growthA = createTexture();
const growthB = createTexture();

// ---- Seed initial discharge ----
gl.bindTexture(gl.TEXTURE_2D, growthA);

// IMPORTANT: allow 1x1 pixel upload
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

let texA = createTexture();
let texB = createTexture();
let ping = true;

// Framebuffer
const fb = gl.createFramebuffer();

const fbo = gl.createFramebuffer();

const seed = new Float32Array([1, 1, 1, 1]);
clearTexture(texA);
clearTexture(texB);



gl.bindTexture(gl.TEXTURE_2D, texA);
gl.texSubImage2D(
  gl.TEXTURE_2D,
  0,
  Math.floor(canvas.width / 2),
  Math.floor(canvas.height / 2),
  1,
  1,
  gl.RGBA,
  gl.FLOAT,
  seed
);

if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
  console.error("Framebuffer incomplete");
}







//let ping = true;

// ---- Main Loop ----
function step() {
  const src = ping ? texA : texB;
  const dst = ping ? texB : texA;

  // ---- Grow ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    dst,
    0
  );

  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.useProgram(growProgram);
gl.uniform2f(
  gl.getUniformLocation(growProgram, "resolution"),
  canvas.width,
  canvas.height
);

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, src);
gl.uniform1i(gl.getUniformLocation(growProgram, "src"), 0);

draw(growProgram);


  // ---- Display ----
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  gl.useProgram(displayProgram);

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, dst);
gl.uniform1i(gl.getUniformLocation(displayProgram, "tex"), 0);

draw(displayProgram);


  ping = !ping;
  requestAnimationFrame(step);
}





function draw(program) {
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  const loc = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
}


step();
