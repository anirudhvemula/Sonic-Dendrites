// [1]
const canvas = document.getElementById("gl");
const gl = canvas.getContext("webgl2");

// [5]
if (!gl) alert("WebGL2 not supported");
if (!gl.getExtension("EXT_color_buffer_float")) {
  alert("EXT_color_buffer_float not supported");
}

// [10]
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

// ============================================================
// SHADER UTILS
// ============================================================

// [18]
function compile(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(s));
  }
  return s;
}

// [28]
function program(vsSrc, fsSrc) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(p));
  }
  return p;
}

// [38]
async function loadShader(url) {
  const r = await fetch(url);
  return await r.text();
}

// ============================================================
// AGGREGATE TEXTURE
// ============================================================

// [46]
function createAggregateTexture(w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
  gl.texImage2D(
  gl.TEXTURE_2D, 0, gl.R8,
  w, h, 0, gl.RED, gl.UNSIGNED_BYTE, null
    );

  
  return tex;
}

// ============================================================
// CPU DLA STATE
// ============================================================

// [66]
const aggregateCPU = new Uint8Array(canvas.width * canvas.height);
const walkers = [];
const MAX_WALKERS = 800;

// [70]
const cx = canvas.width >> 1;
const cy = Math.floor(canvas.height * 0.9); // bottom seed
aggregateCPU[cy * canvas.width + cx] = 255;

// [74]
function spawnWalker() {
  walkers.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height * 0.15 // top 15%
  });
}


// [83]
function stepWalkers() {
  for (let i = walkers.length - 1; i >= 0; i--) {
    const w = walkers[i];

    // random walk
    w.x += Math.floor(Math.random() * 11) - 5;
    w.y += Math.floor(Math.random() * 7) - 2; // downward bias


    const x = w.x | 0;
    const y = w.y | 0;

    // vertical kill zone
    if (y < 0 || y > canvas.height) {
    walkers.splice(i, 1);
    continue;
    }



    const idx = y * canvas.width + x;

    /*
    // stick if touching aggregate
    if (
      aggregateCPU[idx + 1] ||
      aggregateCPU[idx - 1] ||
      aggregateCPU[idx + canvas.width] ||
      aggregateCPU[idx - canvas.width]
    ) {
      aggregateCPU[idx] = 255;
      walkers.splice(i, 1);
    }
      */

    let stuck = false;
    for (let dy = -1; dy <= 1 && !stuck; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
        if (aggregateCPU[(y + dy) * canvas.width + (x + dx)]) {
        stuck = true;
        break;
        }
    }
    }

    let neighbors = 0;
    for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (aggregateCPU[(y + dy) * canvas.width + (x + dx)]) {
        neighbors++;
        }
    }
    }

    if (neighbors > 2) {
    walkers.splice(i, 1);
    continue;
    }


    if (neighbors === 1 && Math.random() < 0.25) {
    aggregateCPU[idx] = 255;
    walkers.splice(i, 1);
    }



  }
}

// ============================================================
// MAIN
// ============================================================

// [120]
async function main() {
  const vs = await loadShader("./shaders/quad.vert");
  const fs = await loadShader("./shaders/display.frag");

  const prog = program(vs, fs);
  gl.useProgram(prog);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);


  const aggTex = createAggregateTexture(canvas.width, canvas.height);
  const fbo = gl.createFramebuffer();

  const uAgg = gl.getUniformLocation(prog, "aggregate");
  gl.uniform1i(uAgg, 0);

  // [134]
  function frame() {
    // spawn walkers
    if (walkers.length < MAX_WALKERS) {
        for (let i = 0; i < 25; i++) spawnWalker();
    }


    // advance walkers
    for (let i = 0; i < 25; i++) stepWalkers();

    // upload aggregate to GPU
    gl.bindTexture(gl.TEXTURE_2D, aggTex);

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.texSubImage2D(
      gl.TEXTURE_2D, 0, 0, 0,
      canvas.width, canvas.height,
      gl.RED, gl.UNSIGNED_BYTE, aggregateCPU
    );

    // draw
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, aggTex);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(frame);
  }

  frame();
}

// [166]
main();
