#version 300 es
precision highp float;

uniform sampler2D growth;
uniform sampler2D field;
uniform vec2 resolution;

out vec4 outColor;

// Hash-based RNG (deterministic, no uniforms needed)
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);

    float g = texelFetch(growth, p, 0).r;

    // Already grown stays grown
    if (g > 0.0) {
        outColor = vec4(1.0, 0.0, 0.0, 1.0);
        return;
    }

    // Count neighbors
    int n = 0;
    if (texelFetch(growth, p + ivec2( 1, 0), 0).r > 0.0) n++;
    if (texelFetch(growth, p + ivec2(-1, 0), 0).r > 0.0) n++;
    if (texelFetch(growth, p + ivec2( 0, 1), 0).r > 0.0) n++;
    if (texelFetch(growth, p + ivec2( 0,-1), 0).r > 0.0) n++;

    // Tip-only
    if (n != 1) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }

    // Field gradient magnitude (approx)
    float fx =
        texelFetch(field, p + ivec2(1,0), 0).r -
        texelFetch(field, p + ivec2(-1,0), 0).r;

    float fy =
        texelFetch(field, p + ivec2(0,1), 0).r -
        texelFetch(field, p + ivec2(0,-1), 0).r;

    float grad = length(vec2(fx, fy));

    // DBM probability: grad^η (η ≈ 1)
    float prob = smoothstep(0.0, 1.0, pow(grad, 6.0) * 1e6);



    // Random selection
    //float r = hash(vec2(p));

    //if (r < prob) {
    //    outColor = vec4(1.0, 0.0, 0.0, 1.0);
    //} else {
    //    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    //}
    outColor = vec4(prob, 0.0, 0.0, 1.0);
}
