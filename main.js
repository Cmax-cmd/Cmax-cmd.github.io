import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { owner, gear } from "./gear.js";
import {
  reducedMotion,
  makeRainbowTexture,
  rainbow,
  rainbowMat,
  CYAN,
  PINK,
  glow,
  makeKit,
  shadowed,
  box,
  cyl,
  at,
  animators,
  woodTexture,
  skeletonTexture,
  meshTexture,
  pumpTexture,
  padTexture,
  carbonTexture,
  rod,
  screenCanvas,
  screenTex,
} from "./lib.js";
import { build as M_keyboard } from "./models/keyboard.js";
import { build as M_mouse } from "./models/mouse.js";
import { build as M_mousepad } from "./models/mousepad.js";
import { build as M_monitor } from "./models/monitor.js";
import { build as M_headset } from "./models/headset.js";
import { build as M_mic } from "./models/mic.js";
import { build as M_iem } from "./models/iem.js";
import { build as M_speakers } from "./models/speakers.js";
import { build as M_pc } from "./models/pc.js";
import { build as M_controller } from "./models/controller.js";
import { build as M_webcam } from "./models/webcam.js";
import { build as buildDongle } from "./models/dongle.js";

const $ = (id) => document.getElementById(id);

/* ============================================================
   Renderer, scene, camera
   ============================================================ */
const canvas = $("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const BG = 0x07080c;
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 2.6, 6.5);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.01, 50);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 0.22;
controls.maxDistance = 3.2;
controls.maxPolarAngle = 1.48;
controls.minAzimuthAngle = -1.15;
controls.maxAzimuthAngle = 1.15;

const composer = new EffectComposer(renderer);
composer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.45, 0.82);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ============================================================
   Room: desk, wall, floor, lights
   ============================================================ */
function buildRoom() {
  const room = new THREE.Group();

  // walnut desk top
  const deskMat = new THREE.MeshStandardMaterial({ map: woodTexture(4, 1), color: 0xb08a6a, roughness: 0.5, metalness: 0.02 });
  room.add(at(box(1.8, 0.04, 0.85, deskMat, 0.01), 0, -0.02, 0));
  // white drawer cabinet under the left side, black leg on the right
  const white = new THREE.MeshStandardMaterial({ color: 0xe8e9ec, roughness: 0.45 });
  room.add(at(box(0.46, 0.72, 0.62, white, 0.01), -0.6, -0.4, -0.05));
  const handle = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, metalness: 0.9, roughness: 0.25 });
  for (const y of [-0.16, -0.4, -0.64]) {
    room.add(at(box(0.44, 0.002, 0.004, new THREE.MeshStandardMaterial({ color: 0xc9cbd0 }), 0), -0.6, y + 0.12, 0.262));
    room.add(at(box(0.16, 0.018, 0.016, handle, 0.004), -0.6, y + 0.04, 0.268));
  }
  room.add(at(box(0.05, 0.72, 0.7, new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.4, metalness: 0.6 }), 0.006), 0.84, -0.4, 0));

  // wooden acoustic slat wall
  const felt = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshStandardMaterial({ color: 0x0a0807, roughness: 1 }));
  felt.position.set(0, 1.2, -0.76);
  felt.receiveShadow = true;
  room.add(felt);
  const slatW = 0.028, pitch = 0.046, count = 140;
  const slats = new THREE.InstancedMesh(
    new THREE.BoxGeometry(slatW, 4, 0.016),
    new THREE.MeshStandardMaterial({ map: woodTexture(1, 6), color: 0x9c7656, roughness: 0.6 }),
    count
  );
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    m4.makeTranslation((i - count / 2) * pitch, 1.2, -0.75);
    slats.setMatrixAt(i, m4);
  }
  slats.receiveShadow = true;
  room.add(slats);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0x08090d, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.76;
  floor.receiveShadow = true;
  room.add(floor);

  const grid = new THREE.GridHelper(12, 60, 0x1b4a55, 0x12202a);
  grid.position.y = -0.755;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  room.add(grid);

  // RGB LED strip under the back edge of the desk, washing the wall
  const strip = at(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.006, 0.006), rainbowMat), 0, -0.045, -0.41);
  room.add(strip);

  // Neon sign on the wall
  room.add(buildNeonSign());

  const key = new THREE.DirectionalLight(0xffe6cc, 1.5);
  key.position.set(1.4, 2.6, 1.8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -1.2; key.shadow.camera.right = 1.2;
  key.shadow.camera.top = 1.2; key.shadow.camera.bottom = -1.2;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 6;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  room.add(key);

  const fill = new THREE.HemisphereLight(0x9fb6ff, 0x0a0a10, 0.35);
  room.add(fill);

  const washL = new THREE.PointLight(0x5a6cff, 2.6, 2.6, 1.6);
  washL.position.set(-0.7, 0.15, -0.62);
  const washR = new THREE.PointLight(PINK, 1.6, 2.6, 1.6);
  washR.position.set(0.45, 0.42, -0.52);
  room.add(washL, washR);

  return room;
}

function buildNeonSign() {
  const text = (owner.handle || owner.name || "setup").toLowerCase();
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 256;
  const g = c.getContext("2d");
  g.font = "700 150px 'Space Grotesk', system-ui, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = "#ff3df2";
  g.shadowBlur = 30;
  g.fillStyle = "#ffd6fb";
  g.fillText(text, 512, 128, 980);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6), depthWrite: false });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), mat);
  sign.position.set(0, 0.92, -0.728);
  // gentle neon flicker
  animators.push((t) => {
    if (reducedMotion) return;
    const f = Math.sin(t * 37) > 0.995 ? 0.6 : 1;
    mat.color.setScalar(1.5 * f);
  });
  // redraw once the web font is ready
  document.fonts?.ready.then(() => {
    g.clearRect(0, 0, 1024, 256);
    g.font = "700 150px 'Space Grotesk', system-ui, sans-serif";
    g.fillText(text, 512, 128, 980);
    tex.needsUpdate = true;
  });
  return sign;
}

/* ============================================================
   Gear models: one file per type in models/ (origin = bottom centre on the desk)
   ============================================================ */
const builders = { keyboard: M_keyboard, mouse: M_mouse, mousepad: M_mousepad, monitor: M_monitor, headset: M_headset, mic: M_mic, iem: M_iem, speakers: M_speakers, pc: M_pc, controller: M_controller, webcam: M_webcam };

// Where each type sits on the desk: [x, y, z, rotationY]
const slots = {
  monitor: [0.08, 0, -0.24, 0],
  keyboard: [-0.12, 0, 0.13, 0],
  mousepad: [0.4, 0, 0.13, 0],
  mouse: [0.42, 0.004, 0.13, 0.05],
  mic: [0.74, 0, -0.4, 0],
  pc: [-0.6, 0, -0.12, 0.12],
  controller: [0.69, 0, -0.06, -0.35],
  iem: [-0.42, 0, 0.17, 0.3],
  headset: [-0.36, 0, -0.18, 0.5],
  speakers: [0.08, 0, -0.3, 0],
  webcam: [0.08, 0.481, -0.26, 0],
};

/* ============================================================
   Monitor screen (shows the selected item)
   ============================================================ */
function drawScreen(item) {
  const g = screenCanvas.getContext("2d");
  const W = 1024, H = 576;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a1a24");
  bg.addColorStop(0.55, "#120c22");
  bg.addColorStop(1, "#240a22");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(76,240,255,0.08)";
  g.lineWidth = 1;
  for (let x = 0; x < W; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

  g.fillStyle = "#4cf0ff";
  g.font = "600 26px 'JetBrains Mono', monospace";
  g.fillText(item ? `> viewing ${item.category.toLowerCase()}` : "> whoami", 64, 120);

  g.fillStyle = "#ffffff";
  g.font = "700 84px 'Space Grotesk', system-ui, sans-serif";
  g.fillText(item ? item.name : owner.name, 64, 230, W - 128);

  g.font = "400 28px 'JetBrains Mono', monospace";
  g.fillStyle = "rgba(238,241,248,0.65)";
  if (item) {
    Object.entries(item.specs || {}).slice(0, 4).forEach(([kk, v], i) => {
      g.fillText(`${kk.padEnd(11, " ")} ${v}`, 64, 310 + i * 44, W - 128);
    });
  } else {
    g.fillText(owner.tagline || "", 64, 300, W - 128);
    g.fillStyle = "#ff3df2";
    g.fillText(`github.com/${owner.handle}`, 64, 360);
    g.fillStyle = "rgba(238,241,248,0.45)";
    g.fillText("click any piece of gear ↓", 64, 480);
  }
  screenTex.needsUpdate = true;
}

/* ============================================================
   Build everything
   ============================================================ */
scene.add(buildRoom());
drawScreen(null);
document.fonts?.ready.then(() => drawScreen(selected?.data ?? null));

const items = [];
const typeCount = {};
const hasMonitor = gear.some((g) => g.type === "monitor");

for (const data of gear) {
  const build = builders[data.type];
  if (!build) { console.warn(`Unknown gear type "${data.type}" for ${data.id}`); continue; }
  const kit = makeKit();
  const group = build(kit, data);
  const n = (typeCount[data.type] = (typeCount[data.type] ?? -1) + 1);
  let [x, y, z, ry] = slots[data.type];
  if (data.type === "webcam" && !hasMonitor) { x = 0.3; y = 0; z = -0.25; }
  group.position.set(x + n * 0.26, y, z);
  group.rotation.y = ry;
  group.userData.gearId = data.id;
  scene.add(group);

  const bbox = new THREE.Box3().setFromObject(group);
  const center = bbox.getCenter(new THREE.Vector3());
  const radius = bbox.getSize(new THREE.Vector3()).length() / 2;
  items.push({ data, group, mats: kit.mats, center, radius, baseY: group.position.y, h: 0 });
}
const byId = new Map(items.map((it) => [it.data.id, it]));

/* ============================================================
   Cables: keyboard + mouse dongle + mic -> PC rear I/O, IEMs -> monitor headphone jack.
   Each model exposes its cable end in group.userData (local coordinates).
   ============================================================ */
const byType = (t) => items.find((it) => it.data.type === t);
const anchor = (it, key) => {
  if (!it?.group.userData[key]) return null;
  it.group.updateMatrixWorld(true);
  return it.group.localToWorld(it.group.userData[key].clone());
};
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const cableMat = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.65, metalness: 0.05 });
function addCable(points, r = 0.0022) {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const tube = new THREE.TubeGeometry(curve, Math.max(24, Math.ceil(curve.getLength() / 0.004)), r, 8, false);
  scene.add(shadowed(new THREE.Mesh(tube, cableMat)));
}

// the WLMOUSE 8K receiver sits on the desk by the monitor (it is not a card of its own)
const dongle = buildDongle(makeKit(), { id: "dongle", type: "dongle" });
dongle.position.set(0.24, 0, -0.13);
dongle.rotation.y = -0.35;
scene.add(dongle);

{
  const Y = 0.0024; // cable lying on the desk
  const pc = byType("pc"), io = anchor(pc, "rearIO");
  if (io) {
    const lane = Math.min(io.z - 0.035, -0.39); // gap between the PC's back and the desk's back edge
    const intoPC = (i) => [V3(io.x + 0.14, Y, lane), V3(io.x + 0.03, Y + 0.004, lane - 0.004 * i),
      V3(io.x + 0.008 * i, io.y * 0.45, io.z - 0.03), io.clone().add(V3(0.008 * i, -0.014 * i, 0))];

    const kb = anchor(byType("keyboard"), "cableOut");
    if (kb) addCable([kb, V3(kb.x - 0.01, Y, kb.z - 0.05), V3(-0.04, Y, -0.17), V3(-0.22, Y, lane + 0.01), ...intoPC(0)], 0.0021);

    if (dongle?.userData.cableOut) {
      dongle.updateMatrixWorld(true);
      const d = dongle.localToWorld(dongle.userData.cableOut.clone());
      addCable([d, V3(d.x - 0.01, Y, d.z - 0.05), V3(d.x - 0.12, Y, lane + 0.005), V3(-0.2, Y, lane + 0.004), ...intoPC(1)], 0.0018);
    }

    const mic = anchor(byType("mic"), "cableOut"); // ends at the clamp, under the desk top
    if (mic) addCable([mic, V3(mic.x - 0.08, -0.03, -0.44), V3(-0.2, -0.03, -0.44), V3(io.x + 0.06, -0.012, -0.436),
      V3(io.x + 0.045, Y + 0.006, -0.428), ...intoPC(2).slice(1)], 0.0019);
  }

  const iem = anchor(byType("iem"), "cableOut"), jack = anchor(byType("monitor"), "audioIn");
  if (iem && jack) addCable([iem, V3(iem.x + 0.04, Y, iem.z - 0.06), V3(-0.3, Y, 0.0), V3(-0.08, Y, -0.09), V3(jack.x - 0.03, Y, jack.z + 0.05),
    V3(jack.x, jack.y * 0.4, jack.z + 0.012), jack], 0.0013);
}

/* ============================================================
   Camera moves
   ============================================================ */
const overview = () => {
  const narrow = camera.aspect < 1;
  const d = narrow ? 1.75 : 1;
  return {
    pos: new THREE.Vector3(-0.1, 0.55 * d + 0.08, 1.25 * d + 0.05),
    target: new THREE.Vector3(-0.1, 0.14, -0.08),
  };
};

let tween = null;
function moveCamera(pos, target, ms = 1000) {
  if (reducedMotion) ms = 0;
  tween = { fromPos: camera.position.clone(), fromTarget: controls.target.clone(), pos, target, t0: performance.now(), ms };
}
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const viewDirs = { pc: [-0.55, 0.35, 1], mic: [-0.2, 0.25, 1] };
function focusOn(item) {
  const dir = new THREE.Vector3(...(viewDirs[item.data.type] ?? [0.18, 0.55, 1])).normalize();
  const dist = Math.max(0.42, item.radius * 3.4 + 0.08);
  const target = item.center.clone();
  if (innerWidth > 760) {
    const right = new THREE.Vector3(0, 1, 0).cross(dir).normalize();
    target.addScaledVector(right, dist * 0.22);        // push item left of the card
  } else {
    target.y -= dist * 0.28;                            // push item above the bottom sheet
  }
  moveCamera(target.clone().addScaledVector(dir, dist), target);
}

controls.addEventListener("start", () => { tween = null; hideHint(); });

/* ============================================================
   UI: list, card, tooltip
   ============================================================ */
$("owner-name").textContent = owner.name;
$("owner-tagline").textContent = owner.tagline;
document.title = `${owner.name} — Setup`;

const typeLabels = {
  keyboard: "Keyboard", mouse: "Mouse", mousepad: "Mousepad", headset: "Headset", mic: "Microphone",
  monitor: "Monitor", pc: "PC", speakers: "Speakers", controller: "Controller", webcam: "Webcam", iem: "IEMs",
};
const listEl = $("gear-list");
for (const it of items) {
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = it.data.label ?? typeLabels[it.data.type] ?? it.data.category;
  b.title = it.data.name;
  b.dataset.id = it.data.id;
  b.addEventListener("click", () => select(it));
  li.appendChild(b);
  listEl.appendChild(li);
  it.button = b;
}

const icons = {
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 6v4"/>',
  mousepad: '<rect x="2" y="7" width="20" height="10" rx="2"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0v1.5a1.5 1.5 0 0 1-3 0z"/>',
  headset: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="2" y="14" width="5" height="7" rx="2"/><rect x="17" y="14" width="5" height="7" rx="2"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  pc: '<rect x="6" y="2" width="12" height="20" rx="2"/><circle cx="12" cy="9" r="2.5"/><circle cx="12" cy="16" r="2.5"/>',
  speakers: '<rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="14" r="4"/><circle cx="12" cy="6.5" r="1.5"/>',
  controller: '<path d="M6 8h12a4 4 0 0 1 4 4l-1 5a2 2 0 0 1-3.4 1L15 16H9l-2.6 2A2 2 0 0 1 3 17l-1-5a4 4 0 0 1 4-4z"/><path d="M7 11v3M5.5 12.5h3M16 12h.01M18 13.5h.01"/>',
  iem: '<path d="M7 4a4 4 0 0 1 4 4v3a3 3 0 0 1-6 0V8"/><path d="M17 4a4 4 0 0 0-4 4v3a3 3 0 0 0 6 0V8"/><path d="M8 14c0 4 2 6 4 6s4-2 4-6"/>',
  webcam: '<circle cx="12" cy="10" r="7"/><circle cx="12" cy="10" r="3"/><path d="M8 21h8M12 17v4"/>',
};
const placeholder = (type) =>
  `<div class="placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="url(#pg)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
     <defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4cf0ff"/><stop offset="1" stop-color="#ff3df2"/></linearGradient></defs>
     ${icons[type] ?? icons.pc}</svg>photo coming soon</div>`;

const card = $("card");
let selected = null;

/** Card photo area: main image, credit line, and thumbnails when there is more than one photo. */
function renderGallery(d) {
  const media = $("card-media");
  const thumbs = $("card-thumbs");
  const credit = $("card-credit");
  const photos = d.images ?? (d.image ? [{ src: d.image }] : []);
  thumbs.innerHTML = "";
  thumbs.hidden = photos.length < 2;
  if (!photos.length) {
    media.innerHTML = placeholder(d.type);
    credit.textContent = "";
    return;
  }
  const show = (i) => {
    const p = photos[i];
    media.innerHTML = "";
    const img = new Image();
    img.alt = p.alt ?? d.name;
    img.decoding = "async";
    img.onerror = () => { media.innerHTML = placeholder(d.type); media.style.background = ""; };
    img.onload = () => {
      // match the frame to the photo's own corner colour (white studio shots, black renders)
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 1;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
        const [r, gg, b, a] = g.getImageData(0, 0, 1, 1).data;
        media.style.background = a > 200 ? `rgb(${r},${gg},${b})` : "";
      } catch { media.style.background = ""; }
    };
    img.src = p.src;
    media.appendChild(img);
    credit.textContent = p.credit ? `Photo: ${p.credit}` : "";
    [...thumbs.children].forEach((b, j) => b.setAttribute("aria-current", String(i === j)));
  };
  photos.forEach((p, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", p.alt ?? `Photo ${i + 1}`);
    const t = new Image();
    t.src = p.src;
    t.alt = "";
    t.loading = "lazy";
    b.appendChild(t);
    b.addEventListener("click", () => show(i));
    thumbs.appendChild(b);
  });
  show(0);
}

function fillCard(it) {
  const d = it.data;
  $("card-cat").textContent = d.category;
  $("card-name").textContent = d.name;
  renderGallery(d);
  const specs = $("card-specs");
  specs.innerHTML = "";
  for (const [k, v] of Object.entries(d.specs || {})) {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    specs.append(dt, dd);
  }
  $("card-note").textContent = d.note || "";
  const link = $("card-link");
  link.hidden = !d.link;
  if (d.link) link.href = d.link;
}

function select(it, { updateHash = true } = {}) {
  selected = it;
  fillCard(it);
  card.classList.add("is-open");
  card.setAttribute("aria-hidden", "false");
  for (const o of items) o.button.setAttribute("aria-current", String(o === it));
  it.button.scrollIntoView({ block: "nearest", inline: "center", behavior: reducedMotion ? "auto" : "smooth" });
  drawScreen(it.data);
  focusOn(it);
  hideHint();
  if (updateHash) history.replaceState(null, "", `#${it.data.id}`);
}

function deselect() {
  if (!selected) return;
  selected = null;
  card.classList.remove("is-open");
  card.setAttribute("aria-hidden", "true");
  for (const o of items) o.button.setAttribute("aria-current", "false");
  drawScreen(null);
  const o = overview();
  moveCamera(o.pos, o.target);
  history.replaceState(null, "", location.pathname + location.search);
}

function step(delta) {
  if (!items.length) return;
  const i = selected ? items.indexOf(selected) : -1;
  select(items[(i + delta + items.length) % items.length]);
}

$("card-close").addEventListener("click", deselect);
$("card-prev").addEventListener("click", () => step(-1));
$("card-next").addEventListener("click", () => step(1));
addEventListener("keydown", (e) => {
  if (e.key === "Escape") deselect();
  else if (e.key === "ArrowRight" && selected) step(1);
  else if (e.key === "ArrowLeft" && selected) step(-1);
});

const hint = $("hint");
function hideHint() { hint.style.opacity = "0"; }

/* ============================================================
   Picking
   ============================================================ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tooltip = $("tooltip");
let hovered = null;
let pointerPx = null;
let down = null;

function pick(clientX, clientY) {
  pointer.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(items.map((i) => i.group), true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.gearId) o = o.parent;
    if (o) return byId.get(o.userData.gearId);
  }
  return null;
}

canvas.addEventListener("pointermove", (e) => {
  if (e.pointerType === "mouse") pointerPx = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener("pointerleave", () => { pointerPx = null; });
canvas.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener("pointerup", (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6) return;
  const it = pick(e.clientX, e.clientY);
  if (it) select(it);
  else deselect();
});

function updateHover() {
  const it = pointerPx ? pick(pointerPx.x, pointerPx.y) : null;
  if (it !== hovered) {
    hovered = it;
    canvas.classList.toggle("is-pointer", !!it);
  }
  if (hovered && hovered !== selected && pointerPx) {
    tooltip.hidden = false;
    tooltip.innerHTML = "";
    const b = document.createElement("b");
    b.textContent = hovered.data.category;
    tooltip.append(b, ` ${hovered.data.name}`);
    tooltip.style.left = `${pointerPx.x}px`;
    tooltip.style.top = `${pointerPx.y}px`;
  } else {
    tooltip.hidden = true;
  }
}

/* ============================================================
   Loop
   ============================================================ */
const startView = overview();
camera.position.copy(startView.pos).add(new THREE.Vector3(0.6, 0.35, 0.9)); // intro dolly
controls.target.copy(startView.target);
moveCamera(startView.pos, startView.target, 2200);

const tmp = new THREE.Color();
const clock = new THREE.Clock();
let frame = 0;

function tick() {
  const t = clock.getElapsedTime();
  const speed = reducedMotion ? 0.15 : 1;
  const hue = (t * 0.06 * speed) % 1;
  rainbow.offset.x = -t * 0.05 * speed;

  if (tween) {
    const k = tween.ms ? Math.min(1, (performance.now() - tween.t0) / tween.ms) : 1;
    const e = ease(k);
    camera.position.lerpVectors(tween.fromPos, tween.pos, e);
    controls.target.lerpVectors(tween.fromTarget, tween.target, e);
    if (k >= 1) tween = null;
  }
  controls.update();

  if (frame % 2 === 0) updateHover();
  for (const it of items) {
    const goal = it === hovered && it !== selected ? 1 : 0;
    it.h += (goal - it.h) * 0.15;
    tmp.copy(CYAN).multiplyScalar(it.h * 0.05);
    for (const m of it.mats) m.emissive.copy(tmp);
    it.group.position.y = it.baseY + it.h * 0.006;
  }
  for (const a of animators) a(t, hue);

  composer.render();
  if (frame === 1) $("loader").classList.add("is-done");
  frame++;
  requestAnimationFrame(tick);
}

addEventListener("resize", () => {
  if (!innerWidth || !innerHeight) return; // hidden tab / collapsed frame
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

window.__gearReady = true;
requestAnimationFrame(tick);

// dev: snapshot of the live scene even when the window is not painting (only works on the local upload server)
window.__shot = async (name, id) => {
  if (id !== undefined) {
    const it = byId.get(id);
    if (it) { select(it); tween && (tween.ms = 0); } else deselect();
  }
  if (tween) { camera.position.copy(tween.pos); controls.target.copy(tween.target); tween = null; }
  controls.update();
  composer.render();
  const blob = await new Promise((r) => renderer.domElement.toBlob(r, "image/jpeg", 0.85));
  return (await fetch(`_refs/_review/${name}.jpg`, { method: "PUT", body: blob })).status;
};

// deep link: /#keyboard opens that item
const fromHash = byId.get(decodeURIComponent(location.hash.slice(1)));
if (fromHash) setTimeout(() => select(fromHash, { updateHash: false }), reducedMotion ? 0 : 1600);
addEventListener("hashchange", () => {
  const it = byId.get(decodeURIComponent(location.hash.slice(1)));
  if (it && it !== selected) select(it, { updateHash: false });
  else if (!it) deselect();
});
