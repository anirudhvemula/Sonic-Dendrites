#version 300 es
precision highp float;

in vec2 uv;
uniform sampler2D tex;
out vec4 outColor;

void main() {
  vec4 v = texture(tex, uv);
float age = v.g;

vec3 col = mix(
    vec3(0.2, 0.4, 1.0),   // old = blue
    vec3(1.0, 1.0, 1.0),   // new = white
    clamp(1.0 - age * 0.05, 0.0, 1.0)
);

outColor = vec4(col, 1.0);

}
