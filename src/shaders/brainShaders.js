export const brainVertexShader = `
  uniform float uTime;
  uniform float uScrollProgress;
  uniform vec2 uMouse;
  attribute float aRandom;
  attribute float aPhase;
  attribute float aIsTransistor;
  varying float vAlpha;
  varying float vIsTransistor;

  void main() {
    vec3 pos = position;

    // Gentle organic pulsation for brain particles
    if (aIsTransistor < 0.5) {
      float pulse = sin(uTime * 0.5 + aPhase) * 0.015;
      pos += pos * pulse;
    }

    // Transistors emerge and grow outward on scroll
    if (aIsTransistor > 0.5) {
      float growProgress = smoothstep(0.1, 0.85, uScrollProgress);
      float scale = growProgress * aRandom;
      pos *= (1.0 + scale * 0.5);
    }

    // Mouse attraction
    vec4 projected = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    vec2 screenPos = projected.xy / projected.w;
    float mouseDist = length(screenPos - uMouse);
    float attraction = smoothstep(0.8, 0.0, mouseDist) * 0.1;
    vec3 outDir = normalize(pos);
    pos += outDir * attraction;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float baseSize = aIsTransistor > 0.5 ? 2.0 : 1.4;
    baseSize += attraction * 3.0;
    gl_PointSize = baseSize * (250.0 / -mvPosition.z);

    // Keep everything subtle, boost near mouse
    float mouseGlow = attraction * 2.5;
    vAlpha = aIsTransistor > 0.5
      ? smoothstep(0.1, 0.5, uScrollProgress) * 0.35 + mouseGlow
      : 0.12 + 0.12 * sin(uTime * 0.4 + aPhase) + mouseGlow;
    vIsTransistor = aIsTransistor;
  }
`;

export const brainFragmentShader = `
  varying float vAlpha;
  varying float vIsTransistor;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);

    if (vIsTransistor > 0.5) {
      float box = max(abs(uv.x), abs(uv.y));
      if (box > 0.4) discard;
      float alpha = smoothstep(0.4, 0.2, box) * clamp(vAlpha, 0.0, 0.55);
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    } else {
      float dist = length(uv);
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.15, dist) * clamp(vAlpha, 0.0, 0.5);
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }
  }
`;
