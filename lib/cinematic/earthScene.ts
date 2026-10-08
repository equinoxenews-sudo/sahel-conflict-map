// Scène 3D de l'introduction cinématique : Terre jour/nuit, atmosphère, étoiles.
// Code impératif isolé du reste du site ; `three` est fourni par l'appelant
// (import dynamique) pour ne rien ajouter au chargement des autres pages.
import type * as T from "three";

type Three = typeof T;

export interface SceneControl {
  /** Termine le travelling tout de suite (bouton « Passer »). */
  skip: boolean;
  /** Phase « Explorer le monde » : la caméra se rapproche légèrement. */
  explore: boolean;
  /** Pas de mouvement : une seule image fixe, sans boucle d'animation. */
  reducedMotion: boolean;
}

export interface SceneHandlers {
  /** Première image affichée (texture de base chargée) : l'introduction peut démarrer. */
  onReady: () => void;
  /** WebGL indisponible ou contexte perdu : l'appelant affiche l'alternative statique. */
  onFail: () => void;
}

const TEXTURES = {
  daySmall: "/cinematic/earth-day-sm.jpg",
  dayFull: "/cinematic/earth-day.jpg",
  nightSmall: "/cinematic/earth-night-sm.jpg",
  nightFull: "/cinematic/earth-night.jpg",
};

const INTRO_SECONDS = 9;
const SKIP_SECONDS = 0.9;
/** Face de la Terre tournée vers la caméra à la fin du travelling (≈ longitude 20° E). */
const END_SPIN = -1.92;
const DRIFT_PER_SECOND = 0.004;
const SUN = [1.0, 0.32, 0.28] as const;

const EARTH_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = cameraPosition - worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const EARTH_FRAGMENT = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(vViewDir);
    float ndl = dot(n, sunDir);
    float day = smoothstep(-0.10, 0.22, ndl);

    vec3 dayCol = texture2D(dayMap, vUv).rgb;
    float l = dot(dayCol, vec3(0.299, 0.587, 0.114));
    dayCol = mix(vec3(l), dayCol, 0.9) * vec3(0.93, 1.0, 1.07);
    dayCol *= 0.30 + 0.85 * clamp(ndl, 0.0, 1.0);

    vec3 nightTex = texture2D(nightMap, vUv).rgb;
    float lum = dot(nightTex, vec3(0.299, 0.587, 0.114));
    float lights = smoothstep(0.10, 0.55, lum);
    vec3 nightCol = vec3(0.008, 0.016, 0.034) + vec3(1.0, 0.76, 0.42) * lights * (0.35 + lum) * 1.25;

    vec3 color = mix(nightCol, dayCol, day);

    float twilight = exp(-pow(ndl / 0.14, 2.0));
    color += vec3(0.85, 0.5, 0.3) * twilight * 0.035;

    float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    float lit = 0.18 + 0.82 * smoothstep(-0.30, 0.35, ndl);
    color += vec3(0.20, 0.52, 1.0) * fres * lit * 0.55;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir = cameraPosition - worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 sunDir;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 v = normalize(vViewDir);
    float a = clamp(-dot(n, v), 0.0, 1.0);
    float glow = pow(smoothstep(0.0, 0.45, a), 2.2);
    float lit = 0.22 + 0.78 * smoothstep(-0.45, 0.45, dot(n, sunDir));
    gl_FragColor = vec4(vec3(0.16, 0.48, 1.0) * glow * lit * 0.62, 1.0);
  }
`;

const smootherstep = (p: number) => p * p * p * (p * (p * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function createEarthScene(
  THREE: Three,
  host: HTMLElement,
  getControl: () => SceneControl,
  handlers: SceneHandlers,
): () => void {
  const compact =
    window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
  const reducedMotion = getControl().reducedMotion;

  const renderer = new THREE.WebGLRenderer({
    antialias: !compact,
    powerPreference: compact ? "low-power" : "default",
  });
  renderer.setClearColor(0x03060c, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2));
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
  const sunDir = new THREE.Vector3(...SUN).normalize();

  // Le groupe porte la position de la Terre (descend vers l'horizon pendant le travelling).
  const group = new THREE.Group();
  group.rotation.z = 0.12;
  scene.add(group);

  const segments = compact ? 56 : 96;
  const sphere = new THREE.SphereGeometry(1, segments, segments);
  const loader = new THREE.TextureLoader();
  const textures: T.Texture[] = [];
  const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
  const track = (texture: T.Texture) => {
    texture.anisotropy = Math.min(compact ? 4 : 8, maxAnisotropy);
    textures.push(texture);
    return texture;
  };

  const earthMaterial = new THREE.ShaderMaterial({
    vertexShader: EARTH_VERTEX,
    fragmentShader: EARTH_FRAGMENT,
    uniforms: {
      dayMap: { value: null },
      nightMap: { value: null },
      sunDir: { value: sunDir },
    },
  });
  const earth = new THREE.Mesh(sphere, earthMaterial);
  group.add(earth);

  const atmosphereMaterial = new THREE.ShaderMaterial({
    vertexShader: ATMOSPHERE_VERTEX,
    fragmentShader: ATMOSPHERE_FRAGMENT,
    uniforms: { sunDir: { value: sunDir } },
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const atmosphere = new THREE.Mesh(sphere, atmosphereMaterial);
  atmosphere.scale.setScalar(1.12);
  group.add(atmosphere);

  // Étoiles : discrètes, légèrement bleutées.
  const starCount = compact ? 900 : 1800;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.random() * 2 - 1;
    const angle = Math.random() * Math.PI * 2;
    const ring = Math.sqrt(1 - u * u);
    const radius = 120;
    starPositions.set([ring * Math.cos(angle) * radius, u * radius, ring * Math.sin(angle) * radius], i * 3);
    const b = 0.25 + Math.random() * 0.6;
    starColors.set([b * 0.8, b * 0.9, b], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({
    size: compact ? 1.4 : 1.2,
    sizeAttenuation: false,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  // --- Cadrage -----------------------------------------------------------------------
  let zEnd = 2.2;
  let yEnd = 1.1;
  function frameFor(aspect: number) {
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontal = Math.atan(Math.tan(halfFov) * aspect);
    // Le disque terrestre occupe presque toute la largeur : on voit sa courbure comme un horizon.
    zEnd = 1 / Math.sin(Math.min(horizontal, 1.2) * 0.95);
    yEnd = 1 + 0.12 * Math.tan(halfFov) * zEnd;
  }

  function resize() {
    const width = Math.max(host.clientWidth, 1);
    const height = Math.max(host.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    frameFor(camera.aspect);
  }
  resize();

  // --- Animation ---------------------------------------------------------------------
  let progress = reducedMotion ? 1 : 0;
  let explore = 0;
  let elapsed = 0;
  let skipRate = 0;
  let last = 0;
  let raf = 0;
  let running = false;
  let disposed = false;
  let started = false;

  function applyPose() {
    const eased = smootherstep(progress);
    const exploreEase = smootherstep(explore);
    const zoom = 1 - 0.1 * exploreEase;
    const z = lerp(zEnd * 3.4, zEnd, eased) * zoom;
    camera.position.set(Math.sin(elapsed * 0.05) * 0.04 * eased, 0.02 * (1 - eased), z);
    camera.lookAt(0, 0, 0);
    group.position.y = -yEnd * eased * (1 + 0.04 * exploreEase);
    earth.rotation.y = END_SPIN - (1 - eased) * 0.9 + elapsed * DRIFT_PER_SECOND;
    atmosphere.rotation.y = earth.rotation.y;
    stars.rotation.y = elapsed * 0.0006;
  }

  function renderFrame() {
    applyPose();
    renderer.render(scene, camera);
  }

  function tick(now: number) {
    raf = requestAnimationFrame(tick);
    // Mobile : 30 images par seconde suffisent pour un mouvement aussi lent.
    if (compact && now - last < 32) return;
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    elapsed += dt;
    const control = getControl();
    if (control.skip && skipRate === 0 && progress < 1) {
      skipRate = (1 - progress) / SKIP_SECONDS;
    }
    if (progress < 1) {
      progress = Math.min(1, progress + (skipRate > 0 ? skipRate * dt : dt / INTRO_SECONDS));
    }
    explore = control.explore ? Math.min(1, explore + dt / 1.6) : Math.max(0, explore - dt / 1.6);
    renderFrame();
  }

  function start() {
    if (running || disposed || reducedMotion) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  // Pas de calcul GPU quand l'onglet est caché ou la scène hors écran.
  let onScreen = true;
  const syncRunning = () => (onScreen && !document.hidden && started ? start() : stop());
  const observer = new IntersectionObserver((entries) => {
    onScreen = entries[entries.length - 1]?.isIntersecting ?? true;
    syncRunning();
  });
  observer.observe(host);
  const onVisibility = () => syncRunning();
  document.addEventListener("visibilitychange", onVisibility);

  const resizeObserver = new ResizeObserver(() => {
    resize();
    if (!running) renderFrame();
  });
  resizeObserver.observe(host);

  const onContextLost = (event: Event) => {
    event.preventDefault();
    stop();
    handlers.onFail();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  // --- Textures : version légère d'abord, version complète ensuite (ordinateur) ----------
  function load(url: string) {
    return new Promise<T.Texture>((resolve, reject) =>
      loader.load(url, (texture) => resolve(track(texture)), undefined, () => reject(new Error(url))),
    );
  }

  Promise.all([load(TEXTURES.daySmall), load(TEXTURES.nightSmall)])
    .then(([day, night]) => {
      if (disposed) return;
      earthMaterial.uniforms.dayMap.value = day;
      earthMaterial.uniforms.nightMap.value = night;
      started = true;
      renderFrame();
      handlers.onReady();
      syncRunning();
      if (compact) return;
      return Promise.all([load(TEXTURES.dayFull), load(TEXTURES.nightFull)]).then(([dayFull, nightFull]) => {
        if (disposed) return;
        earthMaterial.uniforms.dayMap.value = dayFull;
        earthMaterial.uniforms.nightMap.value = nightFull;
        if (!running) renderFrame();
      });
    })
    .catch(() => {
      if (!disposed) handlers.onFail();
    });

  return () => {
    disposed = true;
    stop();
    observer.disconnect();
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onContextLost);
    sphere.dispose();
    starGeometry.dispose();
    earthMaterial.dispose();
    atmosphereMaterial.dispose();
    starMaterial.dispose();
    textures.forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
}
