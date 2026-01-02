#version 300 es
precision highp float;

uniform sampler2D src;
uniform vec2 resolution;

out vec4 outColor;

float rand(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    vec2 px = 1.0 / resolution;

    float c = texture(src, uv).r;

    // Count active neighbors (binary)
    float neighbors = 0.0;
    neighbors += step(0.5, texture(src, uv + vec2( px.x,  0.0)).r);
    neighbors += step(0.5, texture(src, uv + vec2(-px.x,  0.0)).r);
    neighbors += step(0.5, texture(src, uv + vec2( 0.0,  px.y)).r);
    neighbors += step(0.5, texture(src, uv + vec2( 0.0, -px.y)).r);
    neighbors += step(0.5, texture(src, uv + vec2( px.x,  px.y)).r);
    neighbors += step(0.5, texture(src, uv + vec2(-px.x,  px.y)).r);
    neighbors += step(0.5, texture(src, uv + vec2( px.x, -px.y)).r);
    neighbors += step(0.5, texture(src, uv + vec2(-px.x, -px.y)).r);

    // Frontier: exactly 1–2 neighbors (CRITICAL)
    float tip = step(0.5, neighbors) * step(neighbors, 1.5);


    // Randomized tip selection
    //float noise = rand(gl_FragCoord.xy * 0.15 + neighbors * 10.0);
    float noise = rand(gl_FragCoord.xy * 0.12 + neighbors * 20.0);



    // Only empty pixels can grow
    float grow = step(0.55, tip - noise) * (1.0 - step(0.5, c));



    outColor = vec4(grow, c + grow, 0.0, 1.0);

}
