import { RIPPLE_COUNT } from "./types";

const NOISE_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_*ns.x + ns.yyyy;
  vec4 y = y_*ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 fbmDisplace(vec3 p, float t, float strength){
  float n1 = snoise(p * 0.45 + vec3(t * 0.15));
  float n2 = snoise(p * 1.10 + vec3(t * 0.25)) * 0.45;
  float n3 = snoise(p * 2.40 + vec3(t * 0.40)) * 0.22;
  return p + normalize(p) * ((n1 + n2 + n3) * strength);
}

float heartbeat(float t){
  float breath = 0.55 + 0.25 * sin(t * 0.85);
  float p      = mod(t, 2.6);
  float surge  = exp(-pow((p - 1.0) * 2.2, 2.0)) * 0.45;
  return breath + surge;
}
`;

// Sums contributions from up to RIPPLE_COUNT concurrent click-ripples. Each
// slot's xyz is the clicked surface direction and w is its start time (or < 0
// if inactive). Distance is measured around the orb, so the wave travels
// through the structure instead of expanding from a flat proxy point.
const RIPPLE_GLSL = /* glsl */ `
const int RIPPLE_COUNT = ${RIPPLE_COUNT};
uniform vec4 uRipples[RIPPLE_COUNT];

vec3 rippleOffset(vec3 localPos, float t, out float energy){
  vec3 offset = vec3(0.0);
  energy = 0.0;
  vec3 surfaceDir = normalize(localPos);

  for (int i = 0; i < RIPPLE_COUNT; i++) {
    vec4 r = uRipples[i];
    if (r.w < 0.0) continue;
    float age = t - r.w;
    if (age < 0.0 || age > 1.35) continue;

    vec3 originDir  = normalize(r.xyz);
    float angle     = acos(clamp(dot(surfaceDir, originDir), -1.0, 1.0));
    float age01     = age / 1.35;
    float front     = age01 * 3.25;
    float travel    = angle - front;
    float fade      = pow(1.0 - age01, 1.35);
    float sigma     = 0.30 + 0.08 * (1.0 - age01);
    float crest     = exp(-(travel * travel) / (sigma * sigma));
    float troughAt  = travel + sigma * 1.7;
    float trough    = exp(-(troughAt * troughAt) / ((sigma * 1.35) * (sigma * 1.35)));
    float impact    = exp(-(angle * angle) / 0.10) * exp(-age * 3.2);
    float wave      = ((crest - trough * 0.62) * fade) + impact * 0.85;
    vec3 tangentDir = surfaceDir - originDir * dot(surfaceDir, originDir);
    float tangentLen = length(tangentDir);
    if (tangentLen > 0.0001) tangentDir /= tangentLen;

    offset += surfaceDir * wave + tangentDir * wave * 0.85;
    energy += abs(wave);
  }

  energy = min(energy, 2.2);
  return offset;
}
`;

export const SHELL_PT_VERT = /* glsl */ `
uniform float uTime;
uniform float uMorphStrengthShell;
uniform vec3  uFg;
varying float vAlpha;
varying vec3  vColor;

${NOISE_GLSL}
${RIPPLE_GLSL}

void main(){
  // Per-vertex phase so different points on the sphere breathe on their own timing.
  float spatialPhase = position.x * 1.3 + position.y * 0.9 + position.z * 1.1;
  float localMorph   = uMorphStrengthShell + 0.08 * sin(uTime * 0.40 + spatialPhase);
  vec3  displaced    = fbmDisplace(position, uTime, localMorph);

  float rippleEnergy;
  displaced += rippleOffset(position, uTime, rippleEnergy) * 4.25;

  vec3  toCam   = normalize(cameraPosition - displaced);
  float facing  = dot(normalize(displaced), toCam);
  float depth   = clamp((facing + 0.3) / 1.3, 0.0, 1.0);

  vAlpha = mix(0.18, 0.95, depth) * (1.0 + rippleEnergy * 4.2);
  vColor = uFg;

  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  float pulse = 0.048 + 0.022 * sin(uTime * 1.05 + position.x * 2.1 + position.y * 1.6 + position.z * 0.8);
  gl_PointSize = pulse * (300.0 / -mv.z) * (1.0 + rippleEnergy * 2.8);
  gl_Position  = projectionMatrix * mv;
}
`;

export const SHELL_PT_FRAG = /* glsl */ `
varying float vAlpha;
varying vec3  vColor;
void main(){
  vec2  uv = gl_PointCoord - 0.5;
  float d  = length(uv);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  gl_FragColor = vec4(vColor, a);
}
`;

export const SHELL_LINE_VERT = /* glsl */ `
uniform float uTime;
uniform float uMorphStrengthShell;
varying float vAlpha;

${NOISE_GLSL}
${RIPPLE_GLSL}

void main(){
  // Per-vertex phase so different points on the sphere breathe on their own timing.
  float spatialPhase = position.x * 1.3 + position.y * 0.9 + position.z * 1.1;
  float localMorph   = uMorphStrengthShell + 0.08 * sin(uTime * 0.40 + spatialPhase);
  vec3  displaced    = fbmDisplace(position, uTime, localMorph);

  float rippleEnergy;
  displaced += rippleOffset(position, uTime, rippleEnergy) * 4.25;

  vec3  toCam   = normalize(cameraPosition - displaced);
  float facing  = dot(normalize(displaced), toCam);
  vAlpha = mix(0.10, 0.45, clamp((facing + 0.3) / 1.3, 0.0, 1.0)) * (1.0 + rippleEnergy * 4.2);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

export const SHELL_LINE_FRAG = /* glsl */ `
uniform vec3 uFg;
varying float vAlpha;
void main(){
  gl_FragColor = vec4(uFg, vAlpha);
}
`;

export const CORE_PT_VERT = /* glsl */ `
uniform float uTime;
uniform float uMorphStrengthCore;
uniform vec3  uPink;
uniform vec3  uBlue;
uniform vec3  uViolet;
varying float vAlpha;
varying vec3  vColor;

${NOISE_GLSL}
${RIPPLE_GLSL}

void main(){
  // Per-vertex phase so different points on the sphere breathe on their own timing.
  float spatialPhase = position.x * 1.6 + position.y * 1.2 + position.z * 0.8;
  float localMorph   = uMorphStrengthCore + 0.08 * sin(uTime * 0.55 + spatialPhase);
  vec3  displaced    = fbmDisplace(position, uTime * 1.5, localMorph);

  float rippleEnergy;
  displaced += rippleOffset(position, uTime, rippleEnergy) * 2.25;

  vec3  toCam   = normalize(cameraPosition - displaced);
  float facing  = dot(normalize(displaced), toCam);
  float depth   = clamp((facing + 0.3) / 1.3, 0.0, 1.0);

  float beat       = heartbeat(uTime);
  vec3  deepViolet = uViolet * 0.55;
  float hue        = sin(displaced.x * 0.50 + displaced.y * 0.30 + uTime * 0.25) * 0.5 + 0.5;
  vec3  warm       = mix(uPink, uBlue, hue);
  vColor = mix(deepViolet, warm, depth);
  vAlpha = mix(0.32, 1.00, depth) * beat * (1.0 + rippleEnergy * 3.4);

  vec4 mv = modelViewMatrix * vec4(displaced, 1.0);
  float dotPulse = 0.055 + 0.025 * sin(uTime * 1.3 + position.x * 2.2 + position.y * 1.7);
  gl_PointSize = dotPulse * (300.0 / -mv.z) * (1.0 + rippleEnergy * 2.3);
  gl_Position  = projectionMatrix * mv;
}
`;

export const CORE_PT_FRAG = /* glsl */ `
varying float vAlpha;
varying vec3  vColor;
void main(){
  vec2  uv = gl_PointCoord - 0.5;
  float d  = length(uv);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  gl_FragColor = vec4(vColor, a);
}
`;

export const CORE_LINE_VERT = /* glsl */ `
uniform float uTime;
uniform float uMorphStrengthCore;
uniform vec3  uPink;
uniform vec3  uBlue;
varying float vAlpha;
varying vec3  vColor;

${NOISE_GLSL}
${RIPPLE_GLSL}

void main(){
  // Per-vertex phase so different points on the sphere breathe on their own timing.
  float spatialPhase = position.x * 1.6 + position.y * 1.2 + position.z * 0.8;
  float localMorph   = uMorphStrengthCore + 0.08 * sin(uTime * 0.55 + spatialPhase);
  vec3  displaced    = fbmDisplace(position, uTime * 1.5, localMorph);

  float rippleEnergy;
  displaced += rippleOffset(position, uTime, rippleEnergy) * 2.25;

  vec3  toCam   = normalize(cameraPosition - displaced);
  float facing  = dot(normalize(displaced), toCam);

  float hue  = sin(displaced.x * 0.50 + displaced.y * 0.30 + uTime * 0.25) * 0.5 + 0.5;
  vColor     = mix(uPink, uBlue, hue);
  vAlpha     = mix(0.12, 0.55, clamp((facing + 0.3) / 1.3, 0.0, 1.0)) * heartbeat(uTime) * (1.0 + rippleEnergy * 3.4);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

export const CORE_LINE_FRAG = /* glsl */ `
varying float vAlpha;
varying vec3  vColor;
void main(){
  gl_FragColor = vec4(vColor, vAlpha);
}
`;
