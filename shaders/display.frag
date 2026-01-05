#version 300 es
precision highp float;

uniform sampler2D aggregate;
out vec4 outColor;

void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  float v = texelFetch(aggregate, p, 0).r;
  outColor = vec4(v, v, v, 1.0);
}
