precision highp float;

varying vec2 uv;
uniform sampler2D field;
uniform vec2 resolution;

void main() {
  vec2 px = 1.0 / resolution;

  float n = texture2D(field, uv + vec2(0.0, px.y)).r;
  float s = texture2D(field, uv - vec2(0.0, px.y)).r;
  float e = texture2D(field, uv + vec2(px.x, 0.0)).r;
  float w = texture2D(field, uv - vec2(px.x, 0.0)).r;

  float relaxed = (n + s + e + w) * 0.25;
  gl_FragColor = vec4(relaxed, 0.0, 0.0, 1.0);
}
