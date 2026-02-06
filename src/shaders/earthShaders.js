export const earthVertexShader = `
  uniform float uTime;
  uniform float uScrollProgress;
  attribute float aRandom;
  attribute float aPhase;
  varying float vAlpha;
  varying float vDistance;

  void main() {
    vec3 pos = position;

    // Subtle organic wobble
    float wobble = sin(uTime * 0.5 + aPhase) * 0.02;
    pos += normal * wobble;

    // Network expansion: particles lift off surface after 50%
    float orbitProgress = smoothstep(0.5, 1.0, uScrollProgress);
    float liftOff = orbitProgress * aRandom * 1.8;
    pos += normal * liftOff;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation
    float size = mix(1.5, 3.0, aRandom);
    gl_PointSize = size * (300.0 / -mvPosition.z);

    // Fade based on distance from surface
    vAlpha = mix(0.4, 1.0, smoothstep(0.0, 0.5, uScrollProgress)) - liftOff * 0.15;
    vDistance = length(mvPosition.xyz);
  }
`;

export const earthFragmentShader = `
  varying float vAlpha;
  varying float vDistance;

  void main() {
    // Circular point with soft edge
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

export const connectionVertexShader = `
  uniform float uScrollProgress;
  attribute float aConnectionPhase;
  varying float vLineAlpha;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Connections appear as scroll progresses 0->50%
    float appear = smoothstep(0.0, 0.5, uScrollProgress);
    vLineAlpha = appear * (0.3 + 0.3 * sin(aConnectionPhase));
  }
`;

export const connectionFragmentShader = `
  varying float vLineAlpha;

  void main() {
    gl_FragColor = vec4(1.0, 1.0, 1.0, vLineAlpha);
  }
`;
