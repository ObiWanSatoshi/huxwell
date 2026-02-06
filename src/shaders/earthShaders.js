export const earthVertexShader = `
  uniform float uTime;
  uniform float uScrollProgress;
  uniform vec2 uMouse;
  attribute float aRandom;
  attribute float aPhase;
  varying float vAlpha;

  void main() {
    vec3 pos = position;

    // Subtle organic drift
    float wobble = sin(uTime * 0.3 + aPhase) * 0.015;
    pos += normal * wobble;

    // Mouse attraction: particles near cursor get a slight pull
    vec4 projected = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 screenPos = projected.xy / projected.w;
    float mouseDist = length(screenPos - uMouse);
    float attraction = smoothstep(0.8, 0.0, mouseDist) * 0.12;
    pos += normal * attraction;

    // After 50% scroll: particles drift outward into orbit
    float orbitProgress = smoothstep(0.45, 1.0, uScrollProgress);
    float liftOff = orbitProgress * aRandom * aRandom * 2.0;
    pos += normal * liftOff;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Point size — slightly larger near mouse
    float size = mix(1.2, 2.0, aRandom) + attraction * 3.0;
    gl_PointSize = size * (250.0 / -mvPosition.z);

    // Alpha — brighter near mouse
    float baseAlpha = 0.15 + 0.2 * aRandom;
    float scrollBoost = smoothstep(0.0, 0.4, uScrollProgress) * 0.15;
    float mouseGlow = attraction * 2.0;
    vAlpha = baseAlpha + scrollBoost + mouseGlow - liftOff * 0.08;
  }
`;

export const earthFragmentShader = `
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float alpha = smoothstep(0.5, 0.15, dist) * clamp(vAlpha, 0.0, 0.6);
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;
