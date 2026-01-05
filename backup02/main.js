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

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1,
   1, -1,
  -1,  1,
  -1,  1,
   1, -1,
   1,  1
]), gl.STATIC_DRAW);

gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);



// ---- Vertex Shader ----
const vertexSrc = await fetch("shaders/vertex.glsl").then(r => r.text());


// ---- Load fragment shaders ----
const fieldSrc   = await fetch("shaders/field.frag").then(r=>r.text());
const displaySrc = await fetch("shaders/display.frag?v=3").then(r => r.text());

console.log(displaySrc);


const fieldProgram = createProgram(vertexSrc, fieldSrc);


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



// IMPORTANT: allow 1x1 pixel upload
gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

let texA = createTexture();
let texB = createTexture();
let ping = true;

// Framebuffer
const fb = gl.createFramebuffer();

const fbo = gl.createFramebuffer();

const seed = new Float32Array([0.2, 0.0, 0.0, 1.0]);

clearTexture(texA);
clearTexture(texB);

// ---- Seed initial discharge (ground) ----
//const seed = new Float32Array([1, 1, 1, 1]);

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


function fillTexture(tex, v) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.clearColor(v, v, v, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

fillTexture(fieldA, 0.0);
fillTexture(fieldB, 0.0);

// top = high voltage
gl.bindTexture(gl.TEXTURE_2D, fieldA);
gl.texSubImage2D(
  gl.TEXTURE_2D, 0,
  0, canvas.height - 1,
  canvas.width, 1,
  gl.RGBA, gl.FLOAT,
  new Float32Array(canvas.width * 4).fill(0.05)
);



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

  // --- Field relaxation (Laplace solve) ---
  let currentField = fieldA;

  for (let i = 0; i < 10; i++) {
    const fieldSrc = (i % 2 === 0) ? fieldA : fieldB;
    const fieldDst = (i % 2 === 0) ? fieldB : fieldA;
    currentField = fieldDst;

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      fieldDst,
      0
    );

    gl.useProgram(fieldProgram);
    gl.uniform2f(
      gl.getUniformLocation(fieldProgram, "resolution"),
      canvas.width,
      canvas.height
    );

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldSrc);
    gl.uniform1i(gl.getUniformLocation(fieldProgram, "field"), 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, src);
    gl.uniform1i(gl.getUniformLocation(fieldProgram, "growth"), 1);

    draw(fieldProgram);
  }

  

  // --- Display field for now ---
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(displayProgram);
  gl.bindTexture(gl.TEXTURE_2D, currentField);
  draw(displayProgram);

  requestAnimationFrame(step);
}


/*
function step() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(displayProgram);
  gl.bindTexture(gl.TEXTURE_2D, texA);
  draw(displayProgram);

  /*
  const src = ping ? texA : texB;
  const dst = ping ? texB : texA;

  // ---- Field Relaxation (NO FEEDBACK LOOPS) ----
  let currentField = fieldA;

  for (let i = 0; i < 2; i++) {
  const fieldSrc = (i % 2 === 0) ? fieldA : fieldB;
  const fieldDst = (i % 2 === 0) ? fieldB : fieldA;

  currentField = fieldDst;

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    fieldDst,
    0
  );

  gl.useProgram(fieldProgram);
  gl.uniform2f(
    gl.getUniformLocation(fieldProgram, "resolution"),
    canvas.width,
    canvas.height
  );

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fieldSrc);
  gl.uniform1i(gl.getUniformLocation(fieldProgram, "field"), 0);

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, src);
  gl.uniform1i(gl.getUniformLocation(fieldProgram, "growth"), 1);

  draw(fieldProgram);
  
}


  // ---- Attach growth destination BEFORE grow pass ----
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(
  gl.FRAMEBUFFER,
  gl.COLOR_ATTACHMENT0,
  gl.TEXTURE_2D,
  dst,
  0
);




  gl.useProgram(growProgram);
  gl.uniform2f(
  gl.getUniformLocation(growProgram, "resolution"),
  canvas.width,
  canvas.height
  );

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, src);
gl.uniform1i(gl.getUniformLocation(growProgram, "growth"), 0);

gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, currentField);
gl.uniform1i(gl.getUniformLocation(growProgram, "field"), 1);

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
*/




function draw(program) {
  gl.useProgram(program);
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
}



step();
