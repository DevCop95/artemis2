import * as THREE from 'three';
import anime from 'animejs/lib/anime.es.js';

// ══════════════════════════════════════════════
// GLOBAL STATE & i18n
// ══════════════════════════════════════════════
window.appLang = 'es';

function setLanguage(lang) {
  window.appLang = lang;
  
  // Update toggle buttons UI
  document.getElementById('btn-es').style.color = lang === 'es' ? 'var(--gold)' : 'var(--ink-35)';
  document.getElementById('btn-en').style.color = lang === 'en' ? 'var(--gold)' : 'var(--ink-35)';
  
  // Update all static HTML elements with data-lang attributes
  document.querySelectorAll('[data-es]').forEach(el => {
    if (el.tagName.toLowerCase() !== 'img') {
      el.innerHTML = el.getAttribute(`data-${lang}`);
    }
  });
  
  // Update dynamic telemetry
  if (typeof curPhase !== 'undefined' && curPhase >= 0) {
    updateTelemetry(curPhase);
  }
  
  // Update Crew Modal if it's currently open
  const modal = document.getElementById('crew-modal');
  if (modal && modal.style.display === 'flex' && window.activeCrewCard) {
    document.getElementById('modal-role').textContent = window.activeCrewCard.getAttribute(`data-role-${lang}`);
    document.getElementById('modal-desc').textContent = window.activeCrewCard.getAttribute(`data-desc-${lang}`);
  }
}

// Attach event listeners to language toggle buttons
document.addEventListener('DOMContentLoaded', () => {
  const btnEs = document.getElementById('btn-es');
  const btnEn = document.getElementById('btn-en');
  if (btnEs) btnEs.addEventListener('click', () => setLanguage('es'));
  if (btnEn) btnEn.addEventListener('click', () => setLanguage('en'));
});

// ══════════════════════════════════════════════
// GESTOR DE CARGA (LOADING MANAGER)
// ══════════════════════════════════════════════
THREE.DefaultLoadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
  const loadingTextEl = document.getElementById('loading-text');
  if (loadingTextEl) {
    const prefix = window.appLang === 'en' ? 'Initializing telemetry...' : 'Inicializando telemetría...';
    loadingTextEl.innerText = `${prefix} ${Math.round((itemsLoaded / itemsTotal) * 100)}%`;
  }
};

THREE.DefaultLoadingManager.onLoad = function() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.style.opacity = '0';
    setTimeout(() => {
      loadingEl.style.display = 'none';
      
      const uiLayer = document.getElementById('ui');
      if (uiLayer) {
        uiLayer.style.display = 'flex';
        uiLayer.style.opacity = 0;
        anime({ targets: uiLayer, opacity: 1, duration: 1500, easing: 'linear' });
      }
    }, 1000); // Bloquea 1 segundo para asegurar carga
  }
};

// ══════════════════════════════════════════════
// NOISE — fractal Brownian motion (unchanged)
// ══════════════════════════════════════════════
function h2(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}
function vn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = h2(ix, iy), b = h2(ix + 1, iy), c = h2(ix, iy + 1), d = h2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x, y, o) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < o; i++) { v += amp * vn(x * f, y * f); amp *= 0.5; f *= 2; }
  return v;
}

// ══════════════════════════════════════════════
// TEXTURE GENERATORS (Clouds only)
// ══════════════════════════════════════════════
function makeClouds() {
  const W = 1024, H = 512, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = fbm(x / W * 9 + 30, y / H * 4.5 + 30, 5);
    const a = n > 0.56 ? Math.min(255, Math.round((n - 0.56) * 5 * 255)) : 0;
    const i = (y * W + x) * 4;
    img.data[i] = 255; img.data[i+1] = 255; img.data[i+2] = 255; img.data[i+3] = a;
  }
  ctx.putImageData(img, 0, 0); return new THREE.CanvasTexture(cv);
}

// ══════════════════════════════════════════════
// THREE.JS SCENE
// ══════════════════════════════════════════════
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000608, 0.0005);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 5000);
camera.position.set(0, 5, 25);

// Lights
scene.add(new THREE.AmbientLight(0x0c0c22, 1.0));
const sun = new THREE.DirectionalLight(0xfff8f0, 2.2);
sun.position.set(100, 50, 50);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x182a50, 0.4);
rim.position.set(-80, 20, -40);
scene.add(rim);

// ── Stars ──
const sSprite = (() => {
  const c = document.createElement('canvas'); c.width = 32; c.height = 32;
  const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.15, 'rgba(200,220,255,.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c);
})();
const sPos = new Float32Array(6000 * 3);
for (let i = 0; i < 6000; i++) {
  const r = 200 + Math.random() * 300, t = Math.random() * Math.PI * 2, p = Math.acos(2 * Math.random() - 1);
  sPos[i * 3] = r * Math.sin(p) * Math.cos(t); sPos[i * 3 + 1] = r * Math.cos(p); sPos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
}
const sGeo = new THREE.BufferGeometry(); sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
const stars = new THREE.Points(sGeo, new THREE.PointsMaterial({
  color: 0xffffff, size: 1.3, map: sSprite,
  blending: THREE.AdditiveBlending, transparent: true, opacity: 0.82, depthWrite: false
}));
scene.add(stars);

// Shared Texture Loader
const textureLoader = new THREE.TextureLoader();

// ── Earth (High-Res Textures via URL) ──
const earthColorMap = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
const earthBumpMap = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png');

const earthGrp = new THREE.Group();
const earthMesh = new THREE.Mesh(
  new THREE.SphereGeometry(100, 64, 64),
  new THREE.MeshPhongMaterial({ 
    map: earthColorMap, 
    bumpMap: earthBumpMap,
    bumpScale: 0.8,
    specular: new THREE.Color(0x333333), 
    shininess: 15 
  })
);
earthGrp.add(earthMesh);
const cloudMesh = new THREE.Mesh(
  new THREE.SphereGeometry(101.5, 48, 48),
  new THREE.MeshPhongMaterial({ map: makeClouds(), transparent: true, opacity: .85, depthWrite: false })
);
earthGrp.add(cloudMesh);
earthGrp.add(new THREE.Mesh(
  new THREE.SphereGeometry(104, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0x2266ee, transparent: true, opacity: .07, blending: THREE.AdditiveBlending, side: THREE.BackSide })
));
earthGrp.position.set(0, -102, -10);
earthGrp.rotation.z = 0.41;
scene.add(earthGrp);

// ── Moon (High-Res Textures via URL) ──
const moonColorMap = textureLoader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/17271/lroc_color_poles_1k.jpg');
const moonDispMap = textureLoader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/17271/ldem_3_8bit.jpg');

const moonGrp = new THREE.Group();
const moonMesh = new THREE.Mesh(
  // Mucha mayor resolución (128x128) para que el displacementMap distorsione bien la malla
  new THREE.SphereGeometry(27, 128, 128),
  new THREE.MeshPhongMaterial({ 
    color: 0xffffff,
    map: moonColorMap,
    displacementMap: moonDispMap,
    displacementScale: 1.5, // Exagera los cráteres físicamente en la malla 3D
    bumpMap: moonDispMap,
    bumpScale: 1.0,         // Sombreado de los cráteres con la luz
    reflectivity: 0, 
    shininess: 0            // La luna es rocosa y mate, no brilla
  })
);
moonGrp.add(moonMesh);
moonGrp.position.set(60, -800, -2000);
scene.add(moonGrp);

// ── Rocket: Cohete Estilizado (Toon 3D) ──
const rGrp = new THREE.Group();

// Shader de contorno estilo cómic (Outline)
const OutlineShader = {
  uniforms: {
    offset: { type: 'f', value: 0.3 },
    color: { type: 'v3', value: new THREE.Color('#000000') },
    alpha: { type: 'f', value: 1.0 },
  },
  vertexShader: `
    uniform float offset;
    void main() {
      vec4 pos = modelViewMatrix * vec4( position + normal * offset, 1.0 );
      gl_Position = projectionMatrix * pos;
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform float alpha;
    void main() { gl_FragColor = vec4( color, alpha ); }
  `,
};

// Función helper para crear objetos con contorno (Multimaterial)
function createMultiMat(geometry, materials) {
  const group = new THREE.Group();
  materials.forEach(m => group.add(new THREE.Mesh(geometry, m)));
  return group;
}

const rocket = new THREE.Group();
rocket.position.y = 1.5; // Centrar verticalmente
rGrp.add(rocket);

// 1. Cuerpo del Cohete (Lathe 3D)
const points = [];
points.push(new THREE.Vector2(0, 0));
for (let i = 0; i < 11; i++) {
  points.push(new THREE.Vector2(Math.cos(i * 0.227 - 0.75) * 8, i * 4.0));
}
points.push(new THREE.Vector2(0, 40));

const rocketGeo = new THREE.LatheGeometry(points, 32);
const rocketMat = new THREE.MeshStandardMaterial({ 
  color: 0xffffff, // Blanco puro 
  roughness: 0.4, 
  metalness: 0.1 
}); 
const rocketOutlineMat = new THREE.ShaderMaterial({
  uniforms: THREE.UniformsUtils.clone(OutlineShader.uniforms),
  vertexShader: OutlineShader.vertexShader,
  fragmentShader: OutlineShader.fragmentShader,
  side: THREE.BackSide, 
});
const rocketObj = createMultiMat(rocketGeo, [rocketMat, rocketOutlineMat]);
rocketObj.scale.setScalar(0.1);
rocket.add(rocketObj);

// 2. Ventana (Portal)
const portalGeo = new THREE.CylinderGeometry(0.26, 0.26, 1.6, 32);
const portalMat = new THREE.MeshStandardMaterial({ 
  color: 0x004488, 
  roughness: 0.1, 
  metalness: 0.8 
}); 
const portalOutlineMat = rocketOutlineMat.clone();
portalOutlineMat.uniforms.offset.value = 0.03;
const portal = createMultiMat(portalGeo, [portalMat, portalOutlineMat]);
portal.position.y = 2;
portal.rotation.x = Math.PI / 2;
rocket.add(portal);

// Borde rojo de la ventana
const circle = new THREE.Shape();
circle.absarc(0, 0, 3.5, 0, Math.PI * 2);
const hole = new THREE.Path();
hole.absarc(0, 0, 3, 0, Math.PI * 2);
circle.holes.push(hole);

const tubeGeo = new THREE.ExtrudeGeometry(circle, { depth: 17, steps: 1, bevelEnabled: false });
tubeGeo.computeVertexNormals();
tubeGeo.center();

const tubeMat = new THREE.MeshStandardMaterial({ 
  color: 0xcc0000, // Rojo intenso
  roughness: 0.5 
}); 
const tubeOutlineMat = rocketOutlineMat.clone();
tubeOutlineMat.uniforms.offset.value = 0.2;
const tube = createMultiMat(tubeGeo, [tubeMat, tubeOutlineMat]);
tube.position.y = 2;
tube.scale.setScalar(0.1);
rocket.add(tube);

// 3. Aletas (Wings)
const shape = new THREE.Shape();
shape.moveTo(3, 0);
shape.quadraticCurveTo(25, -8, 15, -37);
shape.lineTo(14.8, -37);
shape.quadraticCurveTo(13, -21, 0, -20);
shape.lineTo(3, 0);

const wingGeo = new THREE.ExtrudeGeometry(shape, { 
  steps: 1, depth: 4, bevelEnabled: true, bevelThickness: 2, bevelSize: 2, bevelSegments: 5 
});
wingGeo.computeVertexNormals(); 

const wingMat = new THREE.MeshStandardMaterial({ 
  color: 0xcc0000, // Rojo intenso para combinar con la ventana
  roughness: 0.5 
}); 
const wingOutlineMat = rocketOutlineMat.clone();
wingOutlineMat.uniforms.offset.value = 1;

const wingGroup = new THREE.Group();
rocket.add(wingGroup);

const wing = createMultiMat(wingGeo, [wingMat, wingOutlineMat]);
wing.scale.setScalar(0.03);
wing.position.set(0.6, 0.9, 0);
wingGroup.add(wing);

// Clonar aletas alrededor del cohete
const wing2 = wingGroup.clone(); wing2.rotation.y = Math.PI; rocket.add(wing2);
const wing3 = wingGroup.clone(); wing3.rotation.y = Math.PI / 2; rocket.add(wing3);
const wing4 = wingGroup.clone(); wing4.rotation.y = -Math.PI / 2; rocket.add(wing4);

// 4. PROPULSOR — Sistema de llama multicapa real
const thrusterGrp = new THREE.Group();
thrusterGrp.position.y = 0.05; // Justo en la base del cohete

// Helper: cono con la BASE (parte ancha) en y=0 (boquilla), apex (punta) apuntando hacia -Y
function makePlumeCone(radius, height, color, opacity) {
  const geo = new THREE.ConeGeometry(radius, height, 32);
  const mat = new THREE.MeshBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI;          // voltear: base arriba (boquilla), punta abajo
  mesh.position.y = -(height / 2);    // desplazar para que la base quede en y=0
  return mesh;
}

// Capa 1 — Resplandor exterior amplio (rojo-naranja, muy transparente)
thrusterGrp.add(makePlumeCone(1.6, 4.5, 0xff2200, 0.18));
// Capa 2 — Llama exterior (naranja)
thrusterGrp.add(makePlumeCone(1.1, 3.8, 0xff5500, 0.35));
// Capa 3 — Llama media (naranja brillante)
thrusterGrp.add(makePlumeCone(0.7, 3.0, 0xff8800, 0.55));
// Capa 4 — Núcleo caliente (amarillo)
thrusterGrp.add(makePlumeCone(0.38, 2.0, 0xffcc33, 0.75));
// Capa 5 — Núcleo interior (blanco caliente)
thrusterGrp.add(makePlumeCone(0.16, 1.2, 0xffffff, 0.9));

// Sprite de resplandor en la boquilla del motor
const nzCanvas = document.createElement('canvas');
nzCanvas.width = nzCanvas.height = 128;
const nzCtx = nzCanvas.getContext('2d');
const nzGrd = nzCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
nzGrd.addColorStop(0,   'rgba(255,240,200,1)');
nzGrd.addColorStop(0.25,'rgba(255,160,40,0.85)');
nzGrd.addColorStop(0.6, 'rgba(255,60,0,0.4)');
nzGrd.addColorStop(1,   'rgba(0,0,0,0)');
nzCtx.fillStyle = nzGrd;
nzCtx.fillRect(0, 0, 128, 128);
const nzTex = new THREE.CanvasTexture(nzCanvas);
const nzSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: nzTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
}));
nzSprite.scale.setScalar(2.8);
nzSprite.position.y = -0.2;
thrusterGrp.add(nzSprite);

thrusterGrp.scale.setScalar(0); // Oculto al inicio
window.exFire = thrusterGrp;
rocket.add(thrusterGrp);

// Luz interna del fuego que ilumina el cohete desde abajo
const fireLight = new THREE.PointLight(0xff7b00, 4, 15, 2);
fireLight.position.set(0, -1, 0);
rocket.add(fireLight);


// Escalar el grupo final para que encaje con la cámara actual
rGrp.scale.setScalar(1.5);
rGrp.position.set(0, 0, 0);
scene.add(rGrp);

// ══════════════════════════════════════════════
// ANIMATION PROXIES
// ══════════════════════════════════════════════
const cam = { x: 0, y: 5, z: 25, lx: 0, ly: 0, lz: -10 };
const fireScale = { s: 0 }; // Proxy for engine fire scale

// ══════════════════════════════════════════════
// RENDER LOOP
// ══════════════════════════════════════════════
let t = 0;
function loop() {
  requestAnimationFrame(loop);
  t += 0.003;

  earthMesh.rotation.y  = t * 0.40;
  cloudMesh.rotation.y  = t * 0.38;
  moonMesh.rotation.y   = t * 0.08;
  stars.rotation.y      = t * 0.004;

  // Flicker del propulsor — mantener escala base 1.0 con variación orgánica
  if (exFire.scale.y > 0.1) {
    const fx = 1.0 + Math.random() * 0.12 - 0.06;
    const fy = 1.0 + Math.random() * 0.22 - 0.06; // más variación en Y (largo de la llama)
    const fz = 1.0 + Math.random() * 0.12 - 0.06;
    exFire.scale.set(fx, fy, fz);
  }

  camera.position.set(cam.x, cam.y, cam.z);
  camera.lookAt(cam.lx, cam.ly, cam.lz);
  renderer.render(scene, camera);
}
loop();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ══════════════════════════════════════════════
// PHASE DATA
// ══════════════════════════════════════════════
const PHASE_DATA = [
  { earth: '0 km',        moon: '384,400 km', vel: '0 km/h',      met: 'T-0:00',   status: 'PREPARANDO LANZAMIENTO' },
  { earth: '310,000 km',  moon: '74,400 km',  vel: '3,862 km/h',  met: 'T+48h',    status: 'TRÁNSITO INTERLUNAR' },
  { earth: '354,000 km',  moon: '30,400 km',  vel: '4,210 km/h',  met: 'T+96h',    status: 'ESFERA DE INFLUENCIA' },
  { earth: '406,667 km',  moon: '6,545 km',   vel: '5,130 km/h',  met: 'T+132h',   status: 'SOBREVUELO LUNAR' },
  { earth: '251,900 km',  moon: '132,500 km', vel: '40,000 km/h', met: 'T+192h',   status: 'RETORNO A LA TIERRA' },
  { earth: '0 km',        moon: '384,400 km', vel: '0 km/h',      met: 'T+241h',   status: 'MISIÓN COMPLETADA' },
];
const PHASE_AT = [0, 17, 34, 51, 68, 85];
let curPhase = -1;

function getPhase(p) {
  for (let i = PHASE_AT.length - 1; i >= 0; i--) if (p >= PHASE_AT[i]) return i;
  return 0;
}

function updateTelemetry(idx) {
  const d = PHASE_DATA[idx];
  [['tl-earth','earth'], ['tl-moon','moon'], ['tl-vel','vel'], ['tl-met','met']].forEach(([id, key]) => {
    const el = document.getElementById(id); if (!el) return;
    el.style.opacity = '0';
    setTimeout(() => { el.textContent = d[key]; el.style.opacity = '1'; }, 230);
  });
  const sl = document.getElementById('live-label');
  if (sl) sl.textContent = d.status;
}

function activatePhase(np) {
  if (np === curPhase) return;
  const op = curPhase; curPhase = np;

  // Update nav dots
  document.querySelectorAll('.snav-item').forEach((el, i) => el.classList.toggle('active', i === np));

  // Animate phase blocks using direct AnimeJS removal of previous animations
  document.querySelectorAll('.phase').forEach((el, i) => {
    anime.remove(el); // Detener cualquier animación en curso en este elemento
    
    if (i === np) {
      anime({ targets: el, opacity: [0, 1], translateY: ['-45%', '-50%'], duration: 400, easing: 'easeOutQuad' });
      if (el.classList.contains('phase-center')) el.style.pointerEvents = 'auto';
    } else {
      // Ocultar rápidamente todos los demás bloques para evitar solapamientos
      anime({ targets: el, opacity: 0, translateY: ['-50%', '-55%'], duration: 200, easing: 'easeOutQuad' });
      if (el.classList.contains('phase-center')) el.style.pointerEvents = 'none';
    }
  });

  updateTelemetry(np);
}

// ══════════════════════════════════════════════
// MASTER ANIME.JS TIMELINE
// ══════════════════════════════════════════════
const TL = anime.timeline({ autoplay: false, duration: 10000, easing: 'linear' });

// ─── Phase 0: Launch (0-20%) ───
TL
  .add({ targets: '#scroll-hint', opacity: 0, duration: 400 }, 0)
  .add({ targets: exFire.scale, x: 1, y: 1, z: 1, duration: 800, easing: 'easeOutQuad' }, 0)
  .add({ targets: rGrp.position, x: [-.1, .1, -.07, .07, 0], duration: 650, easing: 'easeInOutSine' }, 0)
  .add({ targets: rGrp.position, y: 20, duration: 1900, easing: 'easeOutQuad' }, 500)
  .add({ targets: earthGrp.position, y: -300, z: -50, duration: 1900, easing: 'easeInOutQuad' }, 500)
  .add({ targets: window.speedLinesMat, opacity: 0.35, duration: 1000, easing: 'easeInQuad' }, 1000)
  .add({ targets: cam, x: 0, y: 25, z: 50, lx: 0, ly: 20, lz: 0, duration: 1800, easing: 'easeInOutQuad' }, 700);

// ─── Phase 1: Interlunar Transit (20-40%) ───
TL
  .add({ targets: exFire.scale, x: 0, y: 0, z: 0, duration: 80 }, 2000)
  // Cohete apunta a la derecha (+X)
  .add({ targets: rGrp.rotation, x: 0, y: 0, z: -Math.PI / 2, duration: 1500, easing: 'easeInOutCubic' }, 2000)
  // Tierra a la izquierda (-X)
  .add({ targets: earthGrp.position, x: -800, y: -200, z: -200, duration: 2000, easing: 'easeOutQuad' }, 2000)
  // Luna se asoma por la derecha (+X)
  .add({ targets: moonGrp.position, x: 800, y: 0, z: -200, duration: 2000, easing: 'easeOutQuad' }, 2000)
  .add({ targets: cam, x: 0, y: 0, z: 80, lx: 0, ly: 0, lz: 0, duration: 2000, easing: 'easeInOutCubic' }, 2000);

// ─── Phase 2: Lunar Sphere of Influence (40-60%) ───
TL
  // Luna se acerca desde la derecha (+X)
  .add({ targets: moonGrp.position, x: 120, y: 0, z: -50, duration: 2000, easing: 'easeOutQuad' }, 4000)
  // Cohete sigue apuntando a la derecha (+X)
  .add({ targets: rGrp.rotation, x: 0, y: 0, z: -Math.PI / 2.5, duration: 1500, easing: 'easeInOutQuad' }, 4000)
  // Tierra huye por la izquierda (-X)
  .add({ targets: earthGrp.position, x: -1500, duration: 2000, easing: 'linear' }, 4000)
  .add({ targets: cam, x: 0, y: 0, z: 70, lx: 20, ly: 0, lz: -20, duration: 2000, easing: 'easeInOutQuad' }, 4000);

// ─── Phase 3: Lunar Flyby (60-80%) ───
TL
  .add({ targets: window.speedLinesMat, opacity: 0, duration: 500 }, 6000)
  // Bajar el cohete para que se mantenga en cuadro durante el sobrevuelo y el retorno
  .add({ targets: rGrp.position, y: 0, duration: 2000, easing: 'easeInOutQuad' }, 6000)
  // Luna pasa por debajo y a la derecha (+X)
  .add({ targets: moonGrp.position, x: 30, y: -30, z: 20, duration: 2000, easing: 'easeInOutSine' }, 6000)
  // Cohete realiza sobrevuelo (orbita - gira suavemente su nariz hacia nosotros)
  .add({ targets: rGrp.rotation, x: 0.5, y: -Math.PI / 4, z: -Math.PI / 2, duration: 2000, easing: 'easeInOutCubic' }, 6000)
  .add({ targets: cam, x: -20, y: 10, z: 40, lx: 20, ly: -10, lz: 0, duration: 2000, easing: 'easeInOutCubic' }, 6000)
  
  // ★ Comm blackout
  .add({ targets: '#blackout', opacity: 1, duration: 350, easing: 'linear' }, 6600)
  
  // En lugar de teletransportar la Tierra en 1ms (lo que rompe el scroll inverso), 
  // la movemos de forma invisible y continua detrás de la Luna durante el blackout
  .add({ targets: earthGrp.position, x: -100, y: -50, z: -800, duration: 700, easing: 'linear' }, 6600)
  
  .add({ targets: '#blackout', opacity: 0, duration: 700, easing: 'linear' }, 7300)
  
  // ★ Earthrise — Tierra emerge suavemente por arriba a la izquierda del horizonte lunar (-X, +Y)
  .add({ targets: earthGrp.position, x: -150, y: 50, z: -400, duration: 1500, easing: 'easeOutSine' }, 7300);

// ─── Phase 4: Return (80-85%) ───
TL
  .add({ targets: window.exFire.scale, x: 1, y: 1, z: 1, duration: 500, easing: 'easeOutQuad' }, 8000)
  .add({ targets: window.speedLinesMat, opacity: 0.4, duration: 500 }, 8000)
  // Cohete termina de girar. Estaba en -Math.PI/2 (Derecha). Gira fluidamente hasta Math.PI/2 (Izquierda)
  .add({ targets: rGrp.rotation, x: 0, y: 0, z: Math.PI / 2, duration: 1400, easing: 'easeInOutSine' }, 8000)
  // Bajar el cohete para mantenerlo visible y centrado tras salir de la órbita lunar
  .add({ targets: rGrp.position, y: 0, duration: 1700, easing: 'easeInOutQuad' }, 8000)
  // Luna se aleja rápidamente por la derecha (+X)
  .add({ targets: moonGrp.position, x: 1000, y: -100, z: -200, duration: 1700, easing: 'easeInQuad' }, 8000)
  // Tierra se acerca de frente desde la izquierda (-X)
  .add({ targets: earthGrp.position, x: -250, y: -60, z: -100, duration: 1700, easing: 'easeInOutCubic' }, 8000)
  .add({ targets: cam, x: 0, y: 0, z: 80, lx: -50, ly: 0, lz: 0, duration: 1700, easing: 'easeInOutQuad' }, 8000);

// ─── Phase 5: Splashdown (85-100%) ───
TL
  // Speedlines apagadas (Entrando a atmósfera)
  .add({ targets: window.speedLinesMat, opacity: 0, duration: 500 }, 8500)
  // Propulsor apagado (Caída libre)
  .add({ targets: window.exFire.scale, x: 0, y: 0, z: 0, duration: 500 }, 8500)
  // Tierra ocupa toda la izquierda de la pantalla
  .add({ targets: earthGrp.position, x: -70, y: -60, z: -40, duration: 1500, easing: 'easeOutQuad' }, 8500)
  // Cohete se ladea con el escudo térmico por delante (Inclinación final)
  .add({ targets: rGrp.position, x: -30, y: 0, z: -5, duration: 1500, easing: 'easeInOutQuad' }, 8500)
  .add({ targets: rGrp.rotation, x: 0, y: 0, z: Math.PI * 0.8, duration: 1500, easing: 'easeInOutQuad' }, 8500)
  // Cámara encuadra el lado izquierdo para dar espacio a la UI derecha
  .add({ targets: cam, x: -10, y: 10, z: 30, lx: -40, ly: 0, lz: -10, duration: 1500, easing: 'easeInOutQuad' }, 8500);

// ══════════════════════════════════════════════
// SCROLL ENGINE  —  smooth Lerp + phase tracking
// ══════════════════════════════════════════════
let progress = 0, target = 0;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

window.addEventListener('wheel', e => {
  // Reducido significativamente de 0.045 a 0.02 para scroll más lento y estable
  target = clamp(target + e.deltaY * 0.02, 0, 100);
}, { passive: true });

let tY = null;
window.addEventListener('touchstart', e => { tY = e.touches[0].clientY; }, { passive: true });
window.addEventListener('touchmove', e => {
  if (tY === null) return;
  // Reducido de 0.12 a 0.08 para scroll táctil más controlable
  target = clamp(target + (tY - e.touches[0].clientY) * 0.08, 0, 100);
  tY = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', () => { tY = null; });

window.addEventListener('keydown', e => {
  if (e.key === 'ArrowUp'   || e.key === 'PageUp'   || e.key === ' ') target = clamp(target + 5, 0, 100);
  if (e.key === 'ArrowDown' || e.key === 'PageDown')                     target = clamp(target - 5, 0, 100);
});

function tick() {
  requestAnimationFrame(tick);
  
  // Factor de Lerp (Suavidad): Reducido de 0.07 a 0.03
  // Cuanto menor es este número, más inercia ("pesado") se siente el scroll
  progress += (target - progress) * 0.03; 
  
  // Evitar vibraciones microscópicas de cálculo al llegar al target
  if (Math.abs(target - progress) < 0.001) progress = target;

  TL.seek(TL.duration * (progress / 100));
  
  const progFill = document.getElementById('prog-fill');
  if (progFill) progFill.style.width = progress.toFixed(1) + '%';
  
  const p = getPhase(progress);
  if (p !== curPhase) activatePhase(p);
}

// Init
activatePhase(0);
tick();

// ══════════════════════════════════════════════
// CREW MODAL POPUP (ANIME.JS INTERFACE)
// ══════════════════════════════════════════════
const modal = document.getElementById('crew-modal');
const closeBtn = document.getElementById('close-modal');

document.querySelectorAll('.crew-member').forEach(card => {
  const openModal = () => {
    // Store globally for language toggle updates and returning focus
    window.activeCrewCard = card;
    const lang = window.appLang || 'es';
    
    // Populate Data based on current language
    document.getElementById('modal-img').src = card.dataset.img;
    document.getElementById('modal-name').textContent = card.dataset.name;
    document.getElementById('modal-role').textContent = card.getAttribute(`data-role-${lang}`);
    document.getElementById('modal-desc').textContent = card.getAttribute(`data-desc-${lang}`);
    
    // Animate In
    modal.style.display = 'flex';
    anime({ targets: modal, opacity: [0, 1], duration: 300, easing: 'easeOutQuad' });
    anime({
      targets: '.modal-content',
      scale: [0.95, 1], opacity: [0, 1], translateY: [20, 0],
      duration: 500, delay: 100, easing: 'easeOutExpo'
    });

    // Accesibility focus inside modal
    if (closeBtn) closeBtn.focus();
  };

  // Allow clicking or pressing Enter/Space to open
  card.addEventListener('click', openModal);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openModal();
    }
  });
});

function closeModal() {
  const cardToFocus = window.activeCrewCard;
  window.activeCrewCard = null;
  anime({
    targets: modal, opacity: [1, 0], duration: 300, easing: 'easeInQuad',
    complete: () => { 
      modal.style.display = 'none'; 
      // Return focus to the card that opened the modal
      if (cardToFocus) cardToFocus.focus();
    }
  });
  anime({ targets: '.modal-content', scale: [1, 0.95], translateY: [0, 10], duration: 300, easing: 'easeInQuad' });
}

if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (modal) {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
    closeModal();
  }
});