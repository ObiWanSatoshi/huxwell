export const brainVertexShader = `
  uniform float uTime;
  uniform float uScrollProgress;
  attribute float aRandom;
  attribute float aPhase;
  attribute float aIsTransistor;
  varying float vAlpha;
  varying float vIsTransistor;

  void main() {
    vec3 pos = position;

    // Organic pulsation for brain particles
    if (aIsTransistor < 0.5) {
      float pulse = sin(uTime * 0.8 + aPhase) * 0.03;
      pos += pos * pulse;
    }

    // Transistors grow outward based on scroll
    if (aIsTransistor > 0.5) {
      float growProgress = smoothstep(0.1, 0.9, uScrollProgress);
      float scale = growProgress * aRandom;
      pos *= (1.0 + scale * 0.6);
    }

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    float baseSize = aIsTransistor > 0.5 ? 2.5 : 1.8;
    gl_PointSize = baseSize * (300.0 / -mvPosition.z);

    vAlpha = aIsTransistor > 0.5
      ? smoothstep(0.1, 0.4, uScrollProgress) * 0.9
      : 0.5 + 0.3 * sin(uTime + aPhase);
    vIsTransistor = aIsTransistor;
  }
`;

export const brainFragmentShader = `
  varying float vAlpha;
  varying float vIsTransistor;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);

    if (vIsTransistor > 0.5) {
      // Square/rectangular shape for transistors
      float box = max(abs(uv.x), abs(uv.y));
      if (box > 0.45) discard;
      float alpha = smoothstep(0.45, 0.3, box) * vAlpha;
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    } else {
      // Circular point for organic brain matter
      float dist = length(uv);
      if (dist > 0.5) discard;
      float alpha = smoothstep(0.5, 0.1, dist) * vAlpha;
      gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
    }
  }
`;
