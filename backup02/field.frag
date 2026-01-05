#version 300 es
precision highp float;

uniform sampler2D field;
uniform sampler2D growth;
uniform vec2 resolution;

out vec4 outColor;

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 px = 1.0 / resolution;

    // ---- High-voltage boundary (edges) ----
    if (
        gl_FragCoord.x < 2.0 ||
        gl_FragCoord.y < 2.0 ||
        gl_FragCoord.x > resolution.x - 3.0 ||
        gl_FragCoord.y > resolution.y - 3.0
    ) {
        outColor = vec4(1.0, 1.0, 1.0, 1.0);
        return;
    }

    // ---- Grounded conductor ----
    float g = texture(growth, uv).r;
    if (g > 0.5) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // ---- Laplace relaxation ----
    float f =
        texture(field, uv + vec2(px.x, 0.0)).r +
        texture(field, uv - vec2(px.x, 0.0)).r +
        texture(field, uv + vec2(0.0, px.y)).r +
        texture(field, uv - vec2(0.0, px.y)).r;

    outColor = vec4(f * 0.25);
}
