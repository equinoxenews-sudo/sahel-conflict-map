// Scène 3D de l'introduction cinématique : Terre jour/nuit, atmosphère, étoiles.
// Code impératif isolé du reste du site ; `three` est fourni par l'appelant
// (import dynamique) pour ne rien ajouter au chargement des autres pages.
import type * as T from "three";
import { subsolarPoint, sunDirectionLocal } from "./sun";
import { paintZoneMaps, zoneAt, ZONE_CODE_STEP, ZONE_FOCUS, ZONE_ORDER, type ZoneMaps, type ZoneSlug } from "./zoneMap";

type Three = typeof T;

export interface SceneControl {
  /** Termine le travelling tout de suite (bouton « Passer »). */
  skip: boolean;
  /** Phase « Explorer le monde » : la caméra se rapproche légèrement. */
  explore: boolean;
  /** Pas de mouvement : une seule image fixe, sans boucle d'animation. */
  reducedMotion: boolean;
  /** Zone mise au centre du globe (null : vue d'ensemble). */
  focusZone: ZoneSlug | null;
  /** Les zones réagissent au pointeur (survol, clic). */
  interactive: boolean;
}

export interface SceneHandlers {
  /** Première image affichée (texture de base chargée) : l'introduction peut démarrer. */
  onReady: () => void;
  /** WebGL indisponible ou contexte perdu : l'appelant affiche l'alternative statique. */
  onFail: () => void;
  /** Zone sous le pointeur (null : aucune), avec la position du pointeur dans la page. */
  onHover: (zone: ZoneSlug | null, x: number, y: number) => void;
  /** Clic sur une zone du globe. */
  onPick: (zone: ZoneSlug) => void;
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
  uniform sampler2D zoneMap;
  uniform sampler2D borderMap;
  uniform float zoneReady;
  uniform float hoverZone;
  uniform float selectedZone;
  uniform float zoneStep;
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

    // Zones : frontières discrètes, aplat léger au survol, plus marqué sur la zone choisie.
    float zf = texture2D(zoneMap, vUv).r * 255.0 / zoneStep;
    float zi = floor(zf + 0.5);
    zi = abs(zf - zi) < 0.12 ? zi : 0.0;
    float isHover = step(0.5, zi) * step(abs(zi - hoverZone), 0.1);
    float isSelected = step(0.5, zi) * step(abs(zi - selectedZone), 0.1);
    float border = texture2D(borderMap, vUv).a;
    float fill = (isHover * 0.14 + isSelected * 0.17) * zoneReady;
    float line = border * zoneReady * (0.16 + isHover * 0.30 + isSelected * 0.55);
    vec3 zoneColor = vec3(0.38, 0.84, 1.0);
    color = mix(color, zoneColor, fill * (0.55 + 0.45 * lit));
    color += zoneColor * line * (0.55 + 0.45 * lit);

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
  // touch-action : sur écran tactile, le glissement fait tourner le globe au lieu de faire défiler la page.
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 300);
  // Direction du Soleil dans le repère du monde : recalculée à chaque image d'après l'heure UTC réelle
  // (ou l'heure imposée par ?utc=2026-10-09T03:00:00Z dans l'adresse, pour comparer).
  const sunDir = new THREE.Vector3(1, 0, 0);
  const sunLocal = new THREE.Vector3(1, 0, 0);
  const earthQuaternion = new THREE.Quaternion();
  const forcedUtc = new URLSearchParams(window.location.search).get("utc");
  const forcedTime = forcedUtc ? Date.parse(forcedUtc) : NaN;
  const clockAt = Number.isNaN(forcedTime) ? null : forcedTime - Date.now();
  let sunUpdatedAt = 0;
  function updateSun(force = false) {
    const now = Date.now();
    if (!force && now - sunUpdatedAt < 1000) return;
    sunUpdatedAt = now;
    const instant = new Date(clockAt === null ? now : now + clockAt);
    sunLocal.set(...sunDirectionLocal(subsolarPoint(instant)));
  }
  updateSun(true);

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
      zoneMap: { value: null },
      borderMap: { value: null },
      zoneReady: { value: 0 },
      hoverZone: { value: 0 },
      selectedZone: { value: 0 },
      zoneStep: { value: ZONE_CODE_STEP },
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

  // Mise au point sur une zone : les valeurs « f… » rejoignent leur cible en douceur,
  // `focusBlend` fait passer de la vue d'ensemble (horizon) à la vue centrée sur la zone.
  let focusBlend = 0;
  let fSpin = END_SPIN;
  let fLat = 0;
  let fDistance = 2.5;
  let focusedOn: ZoneSlug | null = null;
  let hoverIndex = 0;

  // Rotation à la main : décalage de lacet (autour de l'axe des pôles) et d'inclinaison, avec inertie.
  const MAX_TILT = 1.0;
  let userSpin = 0;
  let userTilt = 0;
  let spinVelocity = 0;
  let tiltVelocity = 0;
  let dragging = false;
  /** Après le choix d'une zone, la rotation manuelle revient doucement à zéro. */
  let releaseUser = false;

  /** Rotation (radians) qui amène la longitude `lon` face à la caméra. */
  const spinForLon = (lon: number) => -Math.PI / 2 - THREE.MathUtils.degToRad(lon);
  /** Même angle que `target`, à un tour près de `reference` : évite de tourner le globe dans le mauvais sens. */
  const nearestAngle = (target: number, reference: number) =>
    reference + Math.atan2(Math.sin(target - reference), Math.cos(target - reference));
  const damp = (current: number, target: number, rate: number, dt: number) =>
    current + (target - current) * (1 - Math.exp(-rate * dt));

  function stepFocus(dt: number, zone: ZoneSlug | null) {
    const baseSpin = END_SPIN + elapsed * DRIFT_PER_SECOND;
    const baseDistance = zEnd * (1 - 0.1 * smootherstep(explore));
    if (zone && zone !== focusedOn) {
      if (focusBlend < 0.02) {
        // Premier focus : on part de la vue actuelle pour ne pas sauter.
        fSpin = baseSpin;
        fLat = 0;
        fDistance = baseDistance;
      }
      focusedOn = zone;
      releaseUser = true;
    }
    if (!zone && focusedOn) {
      focusedOn = null;
      releaseUser = true;
    }
    if (focusedOn) {
      const target = ZONE_FOCUS[focusedOn];
      fSpin = damp(fSpin, nearestAngle(spinForLon(target.lon), fSpin), 2.6, dt);
      fLat = damp(fLat, THREE.MathUtils.degToRad(target.lat), 2.6, dt);
      // Écran étroit (téléphone) : la caméra recule pour que la zone ne déborde pas de partout.
      const narrow = camera.aspect < 1.2 ? Math.min(2.3, Math.pow(1.2 / camera.aspect, 0.6)) : 1;
      fDistance = damp(fDistance, target.distance * narrow, 2.6, dt);
    }
    focusBlend = damp(focusBlend, focusedOn ? 1 : 0, 3.2, dt);
    if (!focusedOn && focusBlend < 0.001) focusBlend = 0;
  }

  function applyPose() {
    const eased = smootherstep(progress);
    const exploreEase = smootherstep(explore);
    const zoom = 1 - 0.1 * exploreEase;
    const baseZ = lerp(zEnd * 3.4, zEnd, eased) * zoom;
    const baseY = -yEnd * eased * (1 + 0.04 * exploreEase);
    const baseSpin = END_SPIN - (1 - eased) * 0.9 + elapsed * DRIFT_PER_SECOND;

    const blend = smootherstep(focusBlend);
    const z = lerp(baseZ, fDistance, blend);
    camera.position.set(Math.sin(elapsed * 0.05) * 0.04 * eased * (1 - blend), 0.02 * (1 - eased), z);
    camera.lookAt(0, 0, 0);

    // Le globe se décale pour laisser la place à la fiche de zone (à gauche sur ordinateur, en bas sur mobile).
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const visibleHeight = 2 * Math.tan(halfFov) * z;
    const portrait = camera.aspect < 1;
    group.position.x = portrait ? 0 : 0.17 * visibleHeight * camera.aspect * blend;
    group.position.y = lerp(baseY, portrait ? 0.16 * visibleHeight : 0, blend);

    // userSpin / userTilt : rotation donnée à la main (glisser) par-dessus la vue en cours.
    group.rotation.x = fLat * blend + userTilt;
    group.rotation.z = 0.12 * (1 - blend);
    earth.rotation.y = lerp(baseSpin, nearestAngle(fSpin, baseSpin), blend) + userSpin;
    atmosphere.rotation.y = earth.rotation.y;
    stars.rotation.y = elapsed * 0.0006;

    // Jour/nuit : le Soleil est fixe dans le repère de la texture ; on le ramène dans le repère du monde.
    updateSun();
    group.updateMatrixWorld(true);
    earth.getWorldQuaternion(earthQuaternion);
    sunDir.copy(sunLocal).applyQuaternion(earthQuaternion);
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
    const control = getControl();
    // Mouvement réduit : rien ne bouge seul ; la mise au point sur une zone est immédiate.
    if (!reducedMotion) elapsed += dt;
    if (control.skip && skipRate === 0 && progress < 1) {
      skipRate = (1 - progress) / SKIP_SECONDS;
    }
    if (progress < 1) {
      progress = Math.min(1, progress + (skipRate > 0 ? skipRate * dt : dt / INTRO_SECONDS));
    }
    const exploreStep = (reducedMotion ? 10 : dt) / 1.6;
    explore = control.explore ? Math.min(1, explore + exploreStep) : Math.max(0, explore - exploreStep);
    const state = () => `${focusBlend}|${fSpin}|${fLat}|${fDistance}|${hoverIndex}|${explore}|${zoneFade}|${userSpin}|${userTilt}`;
    const before = state();
    stepFocus(reducedMotion ? 10 : dt, control.focusZone);
    if (!dragging) {
      if (releaseUser) {
        userSpin = damp(userSpin, 0, 3, reducedMotion ? 10 : dt);
        userTilt = damp(userTilt, 0, 3, reducedMotion ? 10 : dt);
        spinVelocity = 0;
        tiltVelocity = 0;
        if (Math.abs(userSpin) + Math.abs(userTilt) < 0.001) {
          userSpin = 0;
          userTilt = 0;
          releaseUser = false;
        }
      } else if (spinVelocity !== 0 || tiltVelocity !== 0) {
        // Inertie : le globe continue un instant après le lâcher, puis s'arrête.
        userSpin += spinVelocity * dt;
        userTilt = THREE.MathUtils.clamp(userTilt + tiltVelocity * dt, -MAX_TILT, MAX_TILT);
        const friction = Math.exp(-3.2 * dt);
        spinVelocity *= friction;
        tiltVelocity *= friction;
        if (Math.abs(spinVelocity) < 0.002) spinVelocity = 0;
        if (Math.abs(tiltVelocity) < 0.002) tiltVelocity = 0;
      }
    }
    earthMaterial.uniforms.selectedZone.value = focusedOn ? ZONE_ORDER.indexOf(focusedOn) + 1 : 0;
    earthMaterial.uniforms.hoverZone.value = hoverIndex;
    if (zoneMaps && zoneFade < 1) zoneFade = Math.min(1, zoneFade + (reducedMotion ? 1 : dt * 1.2));
    earthMaterial.uniforms.zoneReady.value = zoneFade;
    if (lastPointer && !dragging && control.interactive && zoneMaps) refreshHover(lastPointer.x, lastPointer.y);
    if (reducedMotion && before === state()) return;
    renderFrame();
  }

  function start() {
    if (running || disposed) return;
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

  // --- Zones cliquables ------------------------------------------------------------------
  let zoneMaps: ZoneMaps | null = null;
  let zoneFade = 0;
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const inverse = new THREE.Matrix4();
  const rayOrigin = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();

  /** Zone sous le pointeur : le rayon est ramené dans le repère du globe, puis converti en point de l'image des zones. */
  function zoneUnderPointer(clientX: number, clientY: number): ZoneSlug | null {
    if (!zoneMaps) return null;
    const rect = canvas.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    earth.updateMatrixWorld();
    inverse.copy(earth.matrixWorld).invert();
    rayOrigin.copy(raycaster.ray.origin).applyMatrix4(inverse);
    rayDirection.copy(raycaster.ray.direction).transformDirection(inverse);
    const b = rayOrigin.dot(rayDirection);
    const discriminant = b * b - (rayOrigin.dot(rayOrigin) - 1);
    if (discriminant < 0) return null;
    const t = -b - Math.sqrt(discriminant);
    if (t < 0) return null;
    rayOrigin.addScaledVector(rayDirection, t);
    const u = Math.atan2(rayOrigin.z, -rayOrigin.x) / (2 * Math.PI);
    const v = 1 - Math.acos(THREE.MathUtils.clamp(rayOrigin.y, -1, 1)) / Math.PI;
    return zoneAt(zoneMaps, u, v);
  }

  function setHover(zone: ZoneSlug | null, x: number, y: number) {
    hoverIndex = zone ? ZONE_ORDER.indexOf(zone) + 1 : 0;
    canvas.style.cursor = zone ? "pointer" : "grab";
    handlers.onHover(zone, x, y);
  }
  // Dernière position de la souris : le globe bouge sous un pointeur immobile (mise au point sur une zone),
  // la zone survolée est donc revérifiée à chaque image.
  let lastPointer: { x: number; y: number } | null = null;
  function refreshHover(x: number, y: number) {
    const zone = zoneUnderPointer(x, y);
    const index = zone ? ZONE_ORDER.indexOf(zone) + 1 : 0;
    if (index !== hoverIndex) setHover(zone, x, y);
    else if (zone) handlers.onHover(zone, x, y);
  }
  // Glisser pour faire tourner : le point saisi suit le pointeur (≈ 1 unité du globe par hauteur d'écran visible).
  let dragLast: { x: number; y: number; t: number } | null = null;
  let dragDistance = 0;
  const onPointerMove = (event: PointerEvent) => {
    if (dragLast && dragging) {
      const dx = event.clientX - dragLast.x;
      const dy = event.clientY - dragLast.y;
      const dtMs = Math.max(event.timeStamp - dragLast.t, 1);
      dragDistance += Math.hypot(dx, dy);
      const perPixel = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z) / Math.max(canvas.clientHeight, 1);
      const dSpin = dx * perPixel;
      const dTilt = dy * perPixel;
      userSpin += dSpin;
      userTilt = THREE.MathUtils.clamp(userTilt + dTilt, -MAX_TILT, MAX_TILT);
      if (!reducedMotion) {
        // Vitesse lissée, reprise à la fin du geste pour l'inertie.
        spinVelocity = lerp(spinVelocity, (dSpin / dtMs) * 1000, 0.5);
        tiltVelocity = lerp(tiltVelocity, (dTilt / dtMs) * 1000, 0.5);
      }
      dragLast = { x: event.clientX, y: event.clientY, t: event.timeStamp };
      if (dragDistance > 6) setHover(null, 0, 0);
      return;
    }
    if (event.pointerType === "touch") return;
    lastPointer = { x: event.clientX, y: event.clientY };
    if (getControl().interactive) refreshHover(lastPointer.x, lastPointer.y);
  };
  const onPointerLeave = () => {
    lastPointer = null;
    setHover(null, 0, 0);
  };
  const onPointerDown = (event: PointerEvent) => {
    if (!getControl().interactive || (event.pointerType === "mouse" && event.button !== 0)) return;
    dragging = true;
    dragDistance = 0;
    dragLast = { x: event.clientX, y: event.clientY, t: event.timeStamp };
    spinVelocity = 0;
    tiltVelocity = 0;
    releaseUser = false;
    canvas.setPointerCapture(event.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const endDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    const last = dragLast;
    dragLast = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = "grab";
    // Pointeur resté immobile avant le lâcher : pas d'inertie.
    if (last && event.timeStamp - last.t > 90) {
      spinVelocity = 0;
      tiltVelocity = 0;
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    const wasClick = dragging && dragDistance <= 6;
    endDrag(event);
    if (!wasClick || !getControl().interactive) return;
    const zone = zoneUnderPointer(event.clientX, event.clientY);
    if (zone) handlers.onPick(zone);
    else if (event.pointerType !== "touch") canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", endDrag);

  // Contours des pays : chargés après la première image, sans retarder l'introduction.
  async function loadZones() {
    const response = await fetch("/data/world-countries.geo.json");
    if (!response.ok) throw new Error("contours indisponibles");
    const geojson = (await response.json()) as { features: Parameters<typeof paintZoneMaps>[0] };
    if (disposed) return;
    const maps = paintZoneMaps(geojson.features, 2048, 1024, compact ? 1 : 2);
    const idTexture = new THREE.CanvasTexture(maps.idCanvas);
    idTexture.minFilter = THREE.NearestFilter;
    idTexture.magFilter = THREE.NearestFilter;
    idTexture.generateMipmaps = false;
    const borderTexture = track(new THREE.CanvasTexture(maps.borderCanvas));
    textures.push(idTexture);
    earthMaterial.uniforms.zoneMap.value = idTexture;
    earthMaterial.uniforms.borderMap.value = borderTexture;
    zoneMaps = maps;
  }

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
      // Les zones sont un plus : si les contours manquent, le globe reste affiché sans elles.
      loadZones().catch(() => {});
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
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", endDrag);
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
