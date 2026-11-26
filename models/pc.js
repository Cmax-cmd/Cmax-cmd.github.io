// pc model: be quiet! Light Base 600 LX (white) with the real build inside.
// Origin = bottom centre, resting on the desk top (y = 0). +z = front. Units: metres.
// Layout (like the real case): main chamber on the left, motherboard on the right-hand tray facing the
// left glass, three intake fans on the right wall behind the ribbed pillar, 360 AIO on the roof,
// GPU horizontal in the top x16 slot, two floor intake fans under it.
import { THREE, reducedMotion, glow, shadowed, box, at, animators } from "../lib.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const W = 0.305, H = 0.435, D = 0.45, HX = W / 2, HZ = D / 2;
const BASE = 0.03;            // top of the base frame (floor of the chamber)
const ROOF = H - 0.022;         // underside of the top frame
const TRAY = 0.072;            // motherboard face plane (x); parts stick out towards -x

/* ---------------------------------------------------------------- textures */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** HydroShift II LCD: purple screen, coolant 54 °C. */
function lcdTexture() {
  return canvasTex(256, 256, (g) => {
    g.fillStyle = "#08080c"; g.fillRect(0, 0, 256, 256);
    const bg = g.createLinearGradient(0, 0, 256, 256);
    bg.addColorStop(0, "#2c0b78"); bg.addColorStop(0.55, "#6a1cc4"); bg.addColorStop(1, "#b236d0");
    g.fillStyle = bg; g.fillRect(12, 12, 232, 232);
    g.lineCap = "round"; g.lineWidth = 9;
    g.strokeStyle = "rgba(255,255,255,0.14)";
    g.beginPath(); g.arc(128, 132, 94, 0.75 * Math.PI, 2.25 * Math.PI); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.9)";
    g.beginPath(); g.arc(128, 132, 94, 0.75 * Math.PI, (0.75 + 1.5 * 0.54) * Math.PI); g.stroke();
    g.fillStyle = "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = "600 20px system-ui, sans-serif"; g.fillText("WATER", 128, 74);
    g.font = "700 92px system-ui, sans-serif"; g.fillText("54", 116, 136);
    g.font = "600 26px system-ui, sans-serif"; g.fillText("°C", 186, 112);
    g.globalAlpha = 0.8; g.font = "500 15px system-ui, sans-serif"; g.fillText("PUMP 2800 RPM", 128, 192);
  });
}

/** White PCB of the X870E AORUS PRO ICE. */
function pcbTexture() {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = "#cfd2d7"; g.fillRect(0, 0, w, h);
    let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    g.strokeStyle = "rgba(120,126,138,0.35)"; g.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      const x = rnd() * w, y = rnd() * h, l = 10 + rnd() * 40;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() > 0.5 ? l : 0), y + (rnd() > 0.5 ? 0 : l)); g.stroke();
    }
    g.fillStyle = "rgba(60,64,72,0.55)";
    for (const [x, y] of [[8, 8], [8, 312], [200, 8], [200, 160], [200, 312], [100, 160]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
    g.fillStyle = "rgba(40,42,48,0.5)";
    for (let i = 0; i < 18; i++) g.fillRect(rnd() * w, rnd() * h, 4 + rnd() * 8, 3 + rnd() * 6);
  });
}

/** Radiator / heatsink fins (thin lines). */
function finTexture(rx) {
  const t = canvasTex(64, 8, (g) => {
    g.fillStyle = "#b9bdc4"; g.fillRect(0, 0, 64, 8);
    g.fillStyle = "#7d828c";
    for (let x = 0; x < 64; x += 4) g.fillRect(x, 0, 1.4, 8);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, 1);
  return t;
}

/** Floor plate: white with vent slots on the right half and a few holes. */
function floorTexture() {
  return canvasTex(256, 384, (g, w, h) => {
    g.fillStyle = "#e6e8ec"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#6d727c";
    for (let r = 0; r < 14; r++) for (let c = 0; c < 3; c++) {
      if ((r + c) % 3 === 0) continue;
      g.beginPath(); g.roundRect(150 + c * 32, 20 + r * 25, 22, 6, 3); g.fill();
    }
    for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(130, 40 + i * 60, 3, 0, 7); g.fill(); }
  });
}

/** Orange crescent glow on the lower half of a fan hub (static, does not spin with the rotor). */
function crescentTexture() {
  return canvasTex(128, 128, (g) => {
    const r = g.createRadialGradient(64, 52, 6, 64, 64, 62);
    r.addColorStop(0, "rgba(255,140,60,0)"); r.addColorStop(0.42, "rgba(255,140,60,0)");
    r.addColorStop(0.55, "rgba(255,150,70,1)"); r.addColorStop(0.75, "rgba(255,110,40,0.55)"); r.addColorStop(1, "rgba(255,90,30,0)");
    g.fillStyle = r;
    g.beginPath(); g.arc(64, 64, 64, 0.08 * Math.PI, 0.92 * Math.PI); g.closePath(); g.fill();   // lower half only (canvas y is down)
  });
}

/** Soft radial glow (fan hub halo). */
function haloTexture() {
  return canvasTex(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,0.5)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  });
}

/** Fine perforated metal (darker holes than lib's meshTexture, so the mesh reads at a distance). */
function meshTextureLocal(repeat) {
  const t = canvasTex(32, 32, (g) => {
    g.fillStyle = "#fff"; g.fillRect(0, 0, 32, 32);
    g.fillStyle = "#4a4e56";
    for (const [x, y] of [[8, 8], [24, 8], [16, 24], [0, 24], [32, 24], [0, -8], [32, -8], [16, 40]]) { g.beginPath(); g.arc(x, y, 4.6, 0, 7); g.fill(); }
  }, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/* ---------------------------------------------------------------- fans */
const fanCache = new Map();
/** Shared geometry for a fan (axis +z): frame with round throat, 9 swept and pitched blades, hub. */
function fanParts(size, depth = 0.025) {
  const key = `${size}/${depth}`;
  if (fanCache.has(key)) return fanCache.get(key);
  const a = size / 2, r = a * 0.93, cr = size * 0.07;
  const s = new THREE.Shape();
  s.moveTo(-a + cr, -a); s.lineTo(a - cr, -a); s.quadraticCurveTo(a, -a, a, -a + cr);
  s.lineTo(a, a - cr); s.quadraticCurveTo(a, a, a - cr, a); s.lineTo(-a + cr, a);
  s.quadraticCurveTo(-a, a, -a, a - cr); s.lineTo(-a, -a + cr); s.quadraticCurveTo(-a, -a, -a + cr, -a);
  const hole = new THREE.Path(); hole.absarc(0, 0, r, 0, Math.PI * 2, true); s.holes.push(hole);
  const fd = depth - 0.003;
  const frame = new THREE.ExtrudeGeometry(s, { depth: fd, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 20 });
  frame.translate(0, 0, -fd / 2);

  const r0 = r * 0.34, r1 = r * 0.965, N = 9, S = 8, sweep = 0.6, w0 = 0.36, w1 = 0.6;
  const mid = (rho) => { const t = (rho - r0) / (r1 - r0); return sweep * t * t + (w0 + (w1 - w0) * t) / 2; };
  const parts = [];
  for (let b = 0; b < N; b++) {
    const sh = new THREE.Shape();
    for (let i = 0; i <= S; i++) {
      const t = i / S, rho = r0 + (r1 - r0) * t, th = sweep * t * t;
      i ? sh.lineTo(rho * Math.cos(th), rho * Math.sin(th)) : sh.moveTo(rho * Math.cos(th), rho * Math.sin(th));
    }
    for (let i = S; i >= 0; i--) {
      const t = i / S, rho = r0 + (r1 - r0) * t, th = sweep * t * t + w0 + (w1 - w0) * t;
      sh.lineTo(rho * Math.cos(th), rho * Math.sin(th));
    }
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.0012, bevelEnabled: false, curveSegments: 1 });
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {                       // pitch: twist each blade around its radius
      const x = p.getX(i), y = p.getY(i), rho = Math.hypot(x, y), th = Math.atan2(y, x);
      p.setZ(i, p.getZ(i) - 0.0006 - (th - mid(rho)) * rho * 0.42);
    }
    geo.rotateZ((b / N) * Math.PI * 2);
    parts.push(geo);
  }
  const blades = mergeGeometries(parts);
  blades.computeVertexNormals();
  const hub = new THREE.CylinderGeometry(r * 0.32, r * 0.32, depth * 0.8, 32).rotateX(Math.PI / 2);
  const cap = new THREE.CircleGeometry(r * 0.3, 32);
  const struts = mergeGeometries([0, 1, 2, 3].map((i) =>
    new THREE.BoxGeometry(a * 1.25, 0.004, 0.003).translate(a * 0.62, 0, -depth / 2 + 0.002).rotateZ(Math.PI / 4 + (i * Math.PI) / 2)));
  const ring = new THREE.TorusGeometry(r + 0.0006, 0.0016, 6, 64);
  const out = { a, r, depth, frame, blades, hub, cap, struts, ring };
  fanCache.set(key, out);
  return out;
}

const spinners = [];
let HALO, CRESCENT;
/** One fan (axis +z). opts: frameMat, bladeMat, hubMat, ringMat (glowing throat ring), halo (color). */
function makeFan(size, { frameMat, bladeMat, hubMat, ringMat, halo, crescent, depth = 0.025, noFrame = false, speed = 1 }) {
  const P = fanParts(size, depth);
  const f = new THREE.Group();
  if (!noFrame) {
    f.add(shadowed(new THREE.Mesh(P.frame, frameMat)));
    f.add(new THREE.Mesh(P.struts, frameMat));
  }
  const rotor = new THREE.Group();
  rotor.add(new THREE.Mesh(P.blades, bladeMat), new THREE.Mesh(P.hub, frameMat));
  rotor.add(at(new THREE.Mesh(P.cap, hubMat), 0, 0, P.depth * 0.4 + 0.0003));
  f.add(rotor);
  spinners.push([rotor, speed]);
  if (ringMat) f.add(at(new THREE.Mesh(P.ring, ringMat), 0, 0, P.depth / 2 + 0.0004));
  if (halo) {
    const m = new THREE.MeshBasicMaterial({ map: HALO, color: halo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    f.add(at(new THREE.Mesh(new THREE.CircleGeometry(P.r * 0.95, 32), m), 0, 0, P.depth * 0.4 + 0.0012));
  }
  if (crescent) {
    CRESCENT ??= new THREE.MeshBasicMaterial({ map: crescentTexture(), color: new THREE.Color(1.9, 1.5, 1.3), transparent: true, depthWrite: false, toneMapped: false });
    f.add(at(new THREE.Mesh(new THREE.CircleGeometry(P.r * 0.62, 32), CRESCENT), 0, 0, P.depth * 0.4 + 0.0012));
  }
  return f;
}

/** Extruded polygon lying in x/y, extruded along +z (optional chamfer). */
function prism(pts, depth, mat, bevel = 0) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ExtrudeGeometry(s, {
    depth, curveSegments: 1, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.5, bevelSegments: 1,
  });
  return shadowed(new THREE.Mesh(geo, mat));
}
/** Octagon outline (w × h), left corners cut by c, right corners by c2. */
const octagon = (w, h, c, c2 = c) => [
  [-w / 2 + c, -h / 2], [w / 2 - c2, -h / 2], [w / 2, -h / 2 + c2], [w / 2, h / 2 - c2],
  [w / 2 - c2, h / 2], [-w / 2 + c, h / 2], [-w / 2, h / 2 - c], [-w / 2, -h / 2 + c],
];

/* ================================================================ build */
/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  HALO ??= haloTexture();
  spinners.length = 0;

  // ---- materials (whites kept light grey so only the lights bloom)
  // outside: grey-white, kept under the bloom threshold
  const white = k.mat(0xb3b7bf, { roughness: 0.6, metalness: 0.04, envMapIntensity: 0.35 });
  const whiteSatin = k.mat(0xbcc0c8, { roughness: 0.5, metalness: 0.25, envMapIntensity: 0.35 });   // anodised aluminium pillar
  // inside: white parts drenched in the blue ARGB light (#2f4dff .. #6f86ff), a little blue self-light so it holds in the dark scene
  const lit = (color, opts = {}) => k.mat(color, { roughness: 0.6, envMapIntensity: 0.25, emissive: 0x1f4fff, emissiveIntensity: 0.32, ...opts });
  const inner = lit(0x2a52e0);
  const fanWhite = lit(0x4f7aff, { roughness: 0.5 });
  const bladeWhite = lit(0x5f88ff, { roughness: 0.45, side: THREE.DoubleSide });
  const dark = k.mat(0x24262b, { roughness: 0.55, metalness: 0.2 });
  const portBlack = k.mat(0x101114, { roughness: 0.6 });
  const chrome = k.mat(0xf4f6fa, { metalness: 1, roughness: 0.06, envMapIntensity: 1.6 });
  const steel = k.mat(0xaeb3bb, { metalness: 0.8, roughness: 0.3 });
  const dramBlack = k.mat(0x1b1c20, { metalness: 0.75, roughness: 0.34 });

  /* ---------------------------------------------------------- case shell */
  for (const x of [-HX + 0.03, HX - 0.03]) for (const z of [-HZ + 0.045, HZ - 0.045]) g.add(at(box(0.04, 0.008, 0.06, inner, 0.003), x, 0.004, z));
  g.add(at(box(W, BASE - 0.008, D, white, 0.007), 0, 0.008 + (BASE - 0.008) / 2, 0));
  g.add(at(box(W, H - ROOF, D, white, 0.008), 0, (ROOF + H) / 2, 0));
  const topMesh = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.05, D - 0.07), k.mat(0xb3b7bf, { roughness: 0.85, envMapIntensity: 0.35, map: meshTextureLocal(40) }));
  topMesh.rotation.x = -Math.PI / 2;
  g.add(at(topMesh, -0.01, H + 0.0004, -0.005));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.012, D - 0.012), lit(0x4670f5, { map: floorTexture() }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(at(floor, 0, BASE + 0.0005, 0));
  // back wall with I/O cut-out and PCI slot covers
  g.add(at(box(W - 0.012, ROOF - BASE, 0.006, inner, 0.002), 0, (ROOF + BASE) / 2, -HZ + 0.003));
  {                                                                        // outside of the back panel
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.014, ROOF - BASE - 0.002), white);
    back.rotation.y = Math.PI;
    g.add(at(back, 0, (ROOF + BASE) / 2, -HZ - 0.0002));
    const grille = new THREE.Mesh(new THREE.CircleGeometry(0.057, 40), k.mat(0xb9bdc5, { roughness: 0.8, envMapIntensity: 0.35, map: meshTextureLocal(9) }));
    grille.rotation.y = Math.PI;
    g.add(at(grille, -0.075, 0.302, -HZ - 0.0006));
    g.add(at(box(0.042, 0.155, 0.001, portBlack, 0), TRAY - 0.022, ROOF - 0.09, -HZ - 0.0004));       // rear I/O
    for (let i = 0; i < 6; i++) g.add(at(box(0.005, 0.009, 0.001, k.mat(0x3a3d44), 0), TRAY - 0.012 - (i % 2) * 0.014, ROOF - 0.04 - Math.floor(i / 2) * 0.02, -HZ - 0.0012));
    for (let i = 0; i < 7; i++) g.add(at(box(0.12, 0.015, 0.001, i < 3 ? steel : whiteSatin, 0), TRAY - 0.066, 0.245 - i * 0.02, -HZ - 0.0006));
    for (let i = 0; i < 3; i++) g.add(at(box(0.012, 0.006, 0.001, portBlack, 0), TRAY - 0.03 - i * 0.025, 0.245, -HZ - 0.0012)); // GPU outputs
  }
  g.add(at(box(0.042, 0.155, 0.002, portBlack, 0.001), TRAY - 0.022, ROOF - 0.09, -HZ + 0.0065));
  for (let i = 0; i < 7; i++) g.add(at(box(0.12, 0.016, 0.002, whiteSatin, 0), TRAY - 0.066, 0.245 - i * 0.02, -HZ + 0.0065));
  g.add(at(box(0.012, ROOF - BASE, 0.012, white, 0.003), -HX + 0.006, (ROOF + BASE) / 2, -HZ + 0.006));   // back-left post
  // motherboard tray / chamber divider, right mesh wall
  g.add(at(box(0.004, ROOF - BASE, 0.26, inner, 0.0015), TRAY + 0.006, (ROOF + BASE) / 2, -HZ + 0.13));
  const meshMat = k.mat(0xb9bdc5, { roughness: 0.75, envMapIntensity: 0.35, map: meshTextureLocal(34), side: THREE.DoubleSide });
  const rightMesh = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.06, ROOF - BASE), meshMat);
  rightMesh.rotation.y = Math.PI / 2;
  g.add(at(rightMesh, HX - 0.002, (ROOF + BASE) / 2, -0.03));
  g.add(at(box(0.006, ROOF - BASE, 0.012, white, 0.002), HX - 0.003, (ROOF + BASE) / 2, -HZ + 0.006));
  g.add(at(box(0.07, 0.086, 0.15, dark, 0.004), HX - 0.042, BASE + 0.045, -HZ + 0.09));               // PSU (rear chamber)

  // ---- ribbed front-right pillar: I/O strip + four fluted aluminium fins
  const pillarH = ROOF - BASE + 0.004;
  const pY = (ROOF + BASE) / 2;
  g.add(at(box(0.036, pillarH, 0.022, whiteSatin, 0.004), 0.08, pY, HZ - 0.011));
  for (let i = 0; i < 4; i++) {
    const x = 0.1045 + i * 0.0128;
    g.add(at(box(0.0112, H - 0.006, 0.042, whiteSatin, 0.0055), x, (H - 0.006) / 2 + 0.006, HZ - 0.021 - (i % 2) * 0.003));
  }
  g.add(at(box(0.05, pillarH, 0.006, inner, 0.002), 0.125, pY, HZ - 0.06));
  // front I/O (top to bottom): power button, LED, USB-C, 2× USB-A, audio
  const ioZ = HZ + 0.0002;
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.002, 24).rotateX(Math.PI / 2), whiteSatin), 0.08, 0.3, ioZ));
  g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.0052, 0.0007, 6, 24), glow(0xcfe0ff, 1.2)), 0.08, 0.3, ioZ + 0.0008));
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.014, 0.001), glow(0xbfd4ff, 1.3)), 0.08, 0.272, ioZ));
  g.add(at(box(0.0034, 0.009, 0.002, portBlack, 0.0012), 0.08, 0.245, ioZ));
  for (const y of [0.215, 0.19]) g.add(at(box(0.005, 0.013, 0.002, portBlack, 0.0006), 0.08, y, ioZ));
  g.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.0022, 16), portBlack), 0.08, 0.165, ioZ + 0.0011));

  // ---- glass: front + left, meeting at a pillar-less corner
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xd6e4ff, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.05, depthWrite: false, envMapIntensity: 0.3,
  });
  const gH = ROOF - BASE;
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.062 + HX, gH), glassMat);
  frontGlass.position.set((-HX + 0.062) / 2, pY, HZ - 0.002);
  const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.004, gH), glassMat);
  sideGlass.position.set(-HX + 0.002, pY, 0);
  sideGlass.rotation.y = -Math.PI / 2;
  g.add(frontGlass, sideGlass);
  const edgeMat = new THREE.MeshBasicMaterial({ color: 0xbcd0e8, transparent: true, opacity: 0.35, depthWrite: false });
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.003, gH, 0.003), edgeMat), -HX + 0.0015, pY, HZ - 0.0015));

  // ---- ARGB light strips (base and roof, front + left inner edges)
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x9fb8ff, toneMapped: false });
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(HX + 0.06, 0.003, 0.003), stripMat), (-HX + 0.062) / 2, BASE + 0.0015, HZ - 0.008));
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, D - 0.02), stripMat), -HX + 0.008, BASE + 0.0015, 0));
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(HX + 0.06, 0.003, 0.003), stripMat), (-HX + 0.062) / 2, ROOF - 0.0015, HZ - 0.008));

  /* ---------------------------------------------------------- case fans */
  const hubWhite = lit(0x7494ff, { roughness: 0.4 });
  for (const y of [BASE + 0.064, BASE + 0.188, BASE + 0.312]) {            // right-wall intakes, facing -x
    const f = makeFan(0.12, { frameMat: fanWhite, bladeMat: bladeWhite, hubMat: hubWhite, crescent: true, speed: 0.9 });
    f.rotation.y = -Math.PI / 2;
    g.add(at(f, TRAY + 0.012, y, 0.125));
  }
  {                                                                        // rear exhaust (back wall, top)
    const f = makeFan(0.12, { frameMat: fanWhite, bladeMat: bladeWhite, hubMat: hubWhite, crescent: true, speed: 0.9 });
    g.add(at(f, -0.075, 0.302, -HZ + 0.0185));
  }
  for (const z of [0.145, 0.02]) {                                         // floor intakes, chrome hubs, facing up
    const f = makeFan(0.12, { frameMat: fanWhite, bladeMat: bladeWhite, hubMat: chrome, speed: 1.1 });
    f.rotation.x = -Math.PI / 2;
    g.add(at(f, -0.078, BASE + 0.0135, z));
  }

  /* ---------------------------------------------------------- motherboard */
  const MB_TOP = 0.40, MB_BACK = -HZ + 0.01, MBW = 0.244, MBH = 0.305;
  const mbY = (v) => MB_TOP - v, mbZ = (u) => MB_BACK + u;               // v from top, u from rear edge
  g.add(at(box(0.0016, MBH, MBW, lit(0x6a8cff, { map: pcbTexture() }), 0.0006), TRAY + 0.0008, MB_TOP - MBH / 2, MB_BACK + MBW / 2));
  const hs = lit(0x557dff, { roughness: 0.35, metalness: 0.4 });                 // brushed white heatsinks
  g.add(at(box(0.034, 0.125, 0.05, hs, 0.005), TRAY - 0.017, mbY(0.07), mbZ(0.028)));      // rear I/O cover
  g.add(at(box(0.004, 0.03, 0.018, dark, 0.001), TRAY - 0.034, mbY(0.1), mbZ(0.03)));        // AORUS eagle plate
  g.add(at(box(0.022, 0.026, 0.085, hs, 0.004), TRAY - 0.011, mbY(0.022), mbZ(0.105)));     // top VRM
  g.add(at(box(0.008, 0.07, 0.17, hs, 0.003), TRAY - 0.004, mbY(0.26), mbZ(0.1)));           // chipset + M.2 plate
  g.add(at(box(0.006, 0.03, 0.15, hs, 0.003), TRAY - 0.003, mbY(0.137), mbZ(0.095)));       // M.2 plate above GPU
  for (let i = 0; i < 4; i++) g.add(at(box(0.007, 0.135, 0.0055, k.mat(0xb9bcc2), 0.001), TRAY - 0.0035, mbY(0.088), mbZ(0.158 + i * 0.0085)));
  g.add(at(box(0.012, 0.054, 0.009, k.mat(0xe9ebee), 0.001), TRAY - 0.006, mbY(0.11), mbZ(MBW - 0.006))); // 24-pin
  g.add(at(box(0.009, 0.012, 0.09, steel, 0.001), TRAY - 0.0045, mbY(0.158), mbZ(0.12)));   // armoured x16 slot

  // ---- RAM: 2× Corsair Dominator Platinum RGB (black)
  const pipes = 22;
  const leds = new THREE.InstancedMesh(new THREE.BoxGeometry(0.003, 0.0034, 0.0056), new THREE.MeshBasicMaterial({ toneMapped: false }), pipes * 2);
  const dummy = new THREE.Object3D();
  [0.1665, 0.1835].forEach((u, s) => {
    const z = mbZ(u), y = mbY(0.088);
    g.add(at(box(0.04, 0.133, 0.0072, dramBlack, 0.0018), TRAY - 0.027, y, z));
    g.add(at(box(0.006, 0.124, 0.0076, k.mat(0x3a3c42, { roughness: 0.3, metalness: 0.5 }), 0.0015), TRAY - 0.05, y, z));
    for (let i = 0; i < pipes; i++) {
      dummy.position.set(TRAY - 0.0535, y - 0.056 + (i / (pipes - 1)) * 0.112, z);
      dummy.updateMatrix();
      leds.setMatrixAt(s * pipes + i, dummy.matrix);
      leds.setColorAt(s * pipes + i, new THREE.Color(1, 1, 1));
    }
  });
  g.add(leds);

  // ---- AIO: HydroShift II LCD-S pump on the CPU
  const cpu = new THREE.Vector3(TRAY, mbY(0.085), mbZ(0.1));
  g.add(at(box(0.034, 0.064, 0.064, white, 0.01), cpu.x - 0.017, cpu.y, cpu.z));
  g.add(at(box(0.008, 0.07, 0.07, k.mat(0x16171b, { roughness: 0.25, metalness: 0.3 }), 0.009), cpu.x - 0.037, cpu.y, cpu.z));
  const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.058, 0.058), new THREE.MeshBasicMaterial({ map: lcdTexture(), toneMapped: false, color: 0xd8d8d8 }));
  lcd.rotation.y = -Math.PI / 2;
  g.add(at(lcd, cpu.x - 0.0412, cpu.y, cpu.z));

  // ---- 360 radiator on the roof, three white TL fans (light edges) blowing down
  const radX = -0.045, radW = 0.122, radZ = -0.01, radL = 0.397;
  const radY = ROOF - 0.016;
  g.add(at(box(radW, 0.027, radL - 0.06, lit(0x6a8eff, { roughness: 0.7, map: finTexture(60) }), 0.002), radX, radY, radZ));
  g.add(at(box(radW + 0.002, 0.03, 0.032, white, 0.004), radX, radY, radZ - radL / 2 + 0.016));
  g.add(at(box(radW + 0.002, 0.03, 0.032, white, 0.004), radX, radY, radZ + radL / 2 - 0.016));
  const tlEdge = new THREE.MeshBasicMaterial({ color: 0xa8c4ff, toneMapped: false });
  const tlRing = glow(0x9fbcff, 1.1);
  for (let i = 0; i < 3; i++) {
    const f = makeFan(0.12, { frameMat: fanWhite, bladeMat: bladeWhite, hubMat: chrome, ringMat: tlRing, speed: 1.2 });
    f.rotation.x = Math.PI / 2;
    g.add(at(f, radX, radY - 0.026, radZ - 0.12 + i * 0.12));
  }
  for (const s of [-1, 1]) g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.016, 0.355), tlEdge), radX + s * 0.0615, radY - 0.026, radZ));
  // white sleeved hoses: pump -> radiator rear end tank
  const hoseMat = lit(0x7a9aff, { roughness: 0.75 });
  for (const dz of [-0.012, 0.012]) {
    const p0 = new THREE.Vector3(cpu.x - 0.03, cpu.y + 0.03, cpu.z + 0.02 + dz);
    const curve = new THREE.CatmullRomCurve3([
      p0,
      new THREE.Vector3(p0.x - 0.012, p0.y + 0.018, p0.z + 0.03),
      new THREE.Vector3(p0.x - 0.06, p0.y + 0.012, p0.z + 0.035),
      new THREE.Vector3(radX + 0.03, radY - 0.02, radZ - radL / 2 + 0.07 + dz),
      new THREE.Vector3(radX + 0.03, radY - 0.008, radZ - radL / 2 + 0.03 + dz),
    ]);
    g.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0062, 12), hoseMat)));
    g.add(at(box(0.016, 0.012, 0.016, white, 0.003), p0.x + 0.004, p0.y - 0.004, p0.z));
  }

  /* ---------------------------------------------------------- GPU: Red Devil Spectral White RX 9070 XT */
  const gpu = new THREE.Group();
  const gW = 0.134, gT = 0.06, gL = 0.31;
  const shroud = lit(0x5079ff, { roughness: 0.45, metalness: 0.15 });
  gpu.add(prism(octagon(gW, gT, 0.016, 0.006), gL, shroud, 0.012));        // faceted body, chamfered ends
  gpu.add(at(prism([[-0.07, 0.012], [-0.075, 0.0], [-0.07, -0.012]], gL * 0.6, inner), 0, 0, gL * 0.2));
  gpu.add(at(prism(octagon(0.09, 0.034, 0.012), 0.006, lit(0x3a60e8, { roughness: 0.35, metalness: 0.3 }), 0.003), -0.012, 0, gL + 0.009));
  const bp = lit(0x5c82ff, { roughness: 0.4, metalness: 0.35 });
  gpu.add(at(box(gW - 0.004, 0.004, gL + 0.012, bp, 0.002), 0, gT / 2 + 0.005, gL / 2));
  for (const [x0, z0, z1] of [[-0.05, 0.03, 0.2], [-0.02, 0.06, 0.26], [0.01, 0.1, 0.29]]) {
    const wing = prism([[x0, z0], [x0 + 0.022, z0 + 0.02], [x0 + 0.022, z1], [x0, z1 - 0.03]], 0.0025, inner);
    wing.rotation.x = Math.PI / 2;
    gpu.add(at(wing, 0, gT / 2 + 0.0095, 0));
  }
  gpu.add(at(box(0.04, 0.0015, 0.05, dark, 0.001), 0.03, gT / 2 + 0.0075, 0.04));
  for (let i = 0; i < 3; i++) {                                             // three fans underneath
    gpu.add(at(new THREE.Mesh(new THREE.CircleGeometry(0.047, 32).rotateX(Math.PI / 2), dark), 0, -gT / 2 - 0.0035, 0.055 + i * 0.103));
    const f = makeFan(0.1, { bladeMat: bladeWhite, frameMat: fanWhite, hubMat: fanWhite, noFrame: true, depth: 0.012, speed: 1.3 });
    f.rotation.x = Math.PI / 2;
    gpu.add(at(f, 0, -gT / 2 - 0.007, 0.055 + i * 0.103));
  }
  // outer edge: fin window, glowing accent, power sockets
  gpu.add(at(box(0.002, 0.03, 0.14, k.mat(0x9da2aa, { metalness: 0.7, roughness: 0.35, map: finTexture(30) }), 0.0005), -gW / 2 - 0.0065, -0.004, 0.14));
  const gpuAccent = glow(0xe8eeff, 1.15);
  gpu.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.0015, 0.003, 0.1), gpuAccent), -gW / 2 - 0.0075, 0.016, 0.14));
  gpu.add(at(box(0.008, 0.009, 0.05, portBlack, 0.001), -gW / 2 - 0.005, gT / 2 - 0.006, 0.2));
  gpu.position.set(TRAY - gW / 2 - 0.012, mbY(0.158) - gT / 2 - 0.006, -HZ + 0.045);
  g.add(gpu);

  /* ---------------------------------------------------------- Strimer: glowing GPU power cable arc */
  const conn = new THREE.Vector3(gpu.position.x - gW / 2 - 0.009, gpu.position.y + gT / 2 - 0.006, gpu.position.z + 0.2);
  const strimerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdde8ff).multiplyScalar(1.6), toneMapped: false });
  // 16 separate thin lit lines, about one line-width apart; offset in depth and radially so they read as lines from the front-left
  const lines = 16, spread = 0.0056;
  const path = (z, o = 0) => new THREE.CatmullRomCurve3([
    new THREE.Vector3(conn.x - 0.002 - o * 0.2, conn.y + o * 0.5, z),
    new THREE.Vector3(conn.x - 0.03 - o * 0.6, conn.y + 0.03 + o * 0.8, z + 0.003),
    new THREE.Vector3(conn.x + 0.005 - o * 0.3, conn.y + 0.058 + o, z + 0.006),
    new THREE.Vector3(conn.x + 0.085, conn.y + 0.062 + o, z + 0.008),
    new THREE.Vector3(TRAY - 0.018 + o * 0.5, conn.y + 0.036 + o * 0.8, z + 0.01),
    new THREE.Vector3(TRAY - 0.004 + o * 0.2, conn.y + 0.004 + o * 0.5, z + 0.01),
  ], false, "catmullrom", 0.4);
  const tubes = [];
  for (let i = 0; i < lines; i++) {
    const f = i / (lines - 1) - 0.5;
    tubes.push(new THREE.TubeGeometry(path(conn.z + f * (lines - 1) * spread, f * 0.022), 64, 0.0011, 5));
  }
  g.add(new THREE.Mesh(mergeGeometries(tubes), strimerMat));
  const mid = path(conn.z);
  for (const t of [0.3, 0.62]) {                                          // cable combs
    const p = mid.getPointAt(t), tan = mid.getTangentAt(t);
    const comb = box(0.007, 0.0045, lines * spread + 0.006, white, 0.0015);
    comb.position.copy(p);
    comb.rotation.z = Math.atan2(tan.y, tan.x);
    g.add(comb);
  }

  /* ---------------------------------------------------------- interior light */
  // blue ARGB light only (no white interior light): front-top glass edge, base strip, back-left
  for (const [x, y, z, i] of [[-0.04, ROOF - 0.03, HZ - 0.04, 0.05], [-0.04, BASE + 0.03, HZ - 0.05, 0.05], [-0.11, 0.22, -0.12, 0.035]]) {
    const l = new THREE.PointLight(0x3b62ff, i, 0.45, 2);
    l.position.set(x, y, z);
    g.add(l);
  }
  const warm = new THREE.PointLight(0xff7a30, 0.006, 0.18, 2);
  warm.position.set(TRAY - 0.03, 0.2, 0.125);
  g.add(warm);

  /* ---------------------------------------------------------- animation */
  const tmp = new THREE.Color();
  const mySpin = spinners.slice();
  animators.push((t) => {
    const m = reducedMotion ? 0 : t;
    const s = Math.sin(m * 0.8);
    strimerMat.color.setHSL(0.6 + s * 0.015, 0.8, 0.9).multiplyScalar(1.35);
    stripMat.color.setHSL(0.63 + s * 0.03, 0.9, 0.6).multiplyScalar(1.35);
    tlEdge.color.setHSL(0.6 + s * 0.04, 0.85, 0.65).multiplyScalar(1.2);
    for (let i = 0; i < pipes * 2; i++) {                                   // flowing rainbow on the DIMM light bars
      tmp.setHSL(((i % pipes) / pipes * 0.8 + m * 0.08) % 1, 1, 0.55).multiplyScalar(1.4);
      leds.setColorAt(i, tmp);
    }
    leds.instanceColor.needsUpdate = true;
    if (!reducedMotion) for (const [rot, sp] of mySpin) rot.rotation.z = -t * 3 * sp;
  });
  return g;
}
