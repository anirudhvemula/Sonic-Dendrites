#version 300 es
precision highp float;

uniform sampler2D tex;
in vec2 uv;
out vec4 outColor;

void main() {
    float v = texture(tex, uv).r;
    v = clamp(v * 5.0, 0.0, 1.0); // force visibility
    outColor = vec4(v, v, v, 1.0);
}
