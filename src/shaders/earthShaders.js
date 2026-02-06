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
    float wobble = sin(uTime * 0.3 + aPhase) * 0.02;
    pos += normal * wobble;

    // Mouse attraction — particles near cursor bloom outward and glow
    vec4 proj = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 screen = proj.xy / proj.w;
    float mDist = length(screen - uMouse);
    float attract = smoothstep(0.7, 0.0, mDist) * 0.15;
    pos += normal * attract;

    // After 50% scroll: orbital drift
    float orbit = smoothstep(0.45, 1.0, uScrollProgress);
    float lift = orbit * aRandom * aRandom * 1.8;
    pos += normal * lift;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Clearly visible point size
    float size = mix(2.0, 3.5, aRandom) + attract * 5.0;
    gl_PointSize = size * (300.0 / -mvPos.z);

    // Strong alpha — particles must be VISIBLE
    float base = 0.3 + 0.35 * aRandom;
    float mouseGlow = attract * 3.0;
    float scrollBoost = smoothstep(0.0, 0.3, uScrollProgress) * 0.1;
    vAlpha = base + scrollBoost + mouseGlow - lift * 0.1;
  }
`;

export const earthFragmentShader = `
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    // Soft glow with bright center
    float alpha = smoothstep(0.5, 0.05, d) * clamp(vAlpha, 0.0, 0.9);
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;
