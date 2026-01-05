#version 300 es
precision highp float;

uniform sampler2D growth;
uniform sampler2D field;
uniform vec2 resolution;

in vec2 uv;
out vec4 outColor;

float rand(vec2 p) {
    return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}

void main() {
    float g = texture(growth, uv).r;
    float f = texture(field, uv).r;

    // already grown → stay grown
    if (g > 0.5) {
        outColor = vec4(1.0, 0.0, 0.0, 1.0);
        return;
    }

    // probability-controlled growth
    float p = clamp(f * 0.02, 0.0, 1.0);

    if (rand(gl_FragCoord.xy) < p) {
        outColor = vec4(1.0, 0.0, 0.0, 1.0);
    } else {
        outColor = vec4(0.0);
    }
}
