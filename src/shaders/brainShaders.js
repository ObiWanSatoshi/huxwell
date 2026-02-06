export const brainVertexShader = `
  uniform float uTime;
  uniform float uScrollProgress;
  uniform vec2 uMouse;
  attribute float aRandom;
  attribute float aPhase;
  attribute float aIsTransistor;
  attribute float aIsSurface;
  varying float vAlpha;
  varying float vIsTransistor;

  void main() {
    vec3 pos = position;

    // Organic pulse for brain matter
    if (aIsTransistor < 0.5) {
      float pulse = sin(uTime * 0.5 + aPhase) * 0.02;
      pos += normalize(pos) * pulse;
    }

    // Transistors emerge and grow on scroll
    if (aIsTransistor > 0.5) {
      float grow = smoothstep(0.1, 0.8, uScrollProgress);
      pos *= (1.0 + grow * aRandom * 0.6);
    }

    // Mouse attraction
    vec4 proj = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 screen = proj.xy / proj.w;
    float mDist = length(screen - uMouse);
    float attract = smoothstep(0.7, 0.0, mDist) * 0.12;
    pos += normalize(pos) * attract;

    vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Size: transistors are slightly larger, surface particles larger than interior
    float baseSize = aIsTransistor > 0.5 ? 2.5 : (aIsSurface > 0.5 ? 2.0 : 1.2);
    baseSize += attract * 4.0;
    gl_PointSize = baseSize * (300.0 / -mvPos.z);

    // Alpha: clearly visible
    float mouseGlow = attract * 3.0;
    if (aIsTransistor > 0.5) {
      vAlpha = smoothstep(0.1, 0.5, uScrollProgress) * 0.6 + mouseGlow;
    } else {
      float surfaceBoost = aIsSurface > 0.5 ? 0.15 : 0.0;
      vAlpha = 0.2 + surfaceBoost + 0.15 * sin(uTime * 0.4 + aPhase) + mouseGlow;
    }
    vIsTransistor = aIsTransistor;
  }
`;

export const brainFragmentShader = `
  varying float vAlpha;
  varying float vIsTransistor;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);

    if (vIsTransistor > 0.5) {
      // Geometric square for transistors
      float box = max(abs(uv.x), abs(uv.y));
      if (box > 0.4) discard;
      float alpha = smoothstep(0.4, 0.15, box) * clamp(vAlpha, 0.0, 0.85);
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    } else {
      // Soft circle for organic brain
      float d = length(uv);
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.05, d) * clamp(vAlpha, 0.0, 0.8);
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }
  }
`;
