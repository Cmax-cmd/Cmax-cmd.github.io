// keyboard model: the user's SU75 Pro (75 % Hall-effect board with an RGB-ring knob).
// Origin = bottom centre, resting on the desk top (y = 0). Units: metres. +z = front (towards the typist).
import { THREE, RoundedBoxGeometry, reducedMotion, animators, shadowed, box, at } from "../lib.js";

const U = 0.01905;                 // one key unit (19.05 mm)
const FW = 16.25 * U;              // key field: 15 u main block + 0.25 u gap + 1 u nav column
const FH = 6 * U;
const W = 0.325, D = 0.135;        // case footprint
const HF = 0.0175, HB = 0.0245;    // case top height at the front / back edge
const TILT = Math.atan2(HB - HF, D);
const ZC = -0.0007;                // key field centre (front bezel a bit deeper than the back one)
const HUE0 = 0.84, SPAN = 0.95;    // rainbow: magenta on the left, through red/yellow/green to violet
const GAP = 0.0016;                // space between neighbouring keycaps at their base
// Cherry-like sculpt per row: [extra height of the cap top (m), tilt of the top (rad, + = faces the typist)]
const PROFILE = [[0.0022, 0.09], [0.0017, 0.07], [0.0008, 0.04], [0, 0], [0.0004, -0.04], [0.0008, -0.05]];

/* ------------------------------------------------------------------ layout
   Each row: numbers = empty gap in units, arrays = [legend, width, flags].
   legend: "A" single, ["!", "1"] stacked, "Tab" word, "" none.
   flags: "m" modifier (dark cap), "f" F-key, "c" nav column, "art" artisan, "space". */
const COL = 15.25; // x (in units) of the nav column
const ROWS = [
  [["Esc", 1, "m"], 0.25, ["F1", 1, "f"], ["F2", 1, "f"], ["F3", 1, "f"], ["F4", 1, "f"], 0.25,
    ["F5", 1, "f"], ["F6", 1, "f"], ["F7", 1, "f"], ["F8", 1, "f"], 0.25,
    ["F9", 1, "f"], ["F10", 1, "f"], ["F11", 1, "f"], ["F12", 1, "f"], 0.25, ["Delete", 1, "m"], ["Home", 1, "m c"]],
  [[["~", "`"], 1], [["!", "1"], 1], [["@", "2"], 1], [["#", "3"], 1], [["$", "4"], 1], [["%", "5"], 1], [["^", "6"], 1],
    [["&", "7"], 1], [["*", "8"], 1], [["(", "9"], 1], [[")", "0"], 1], [["_", "-"], 1], [["+", "="], 1],
    ["Backspace", 2, "m"], ["@power", 1, "m c"]],
  [["Tab", 1.5, "m"], ["Q", 1], ["W", 1], ["E", 1], ["R", 1], ["T", 1], ["Y", 1], ["U", 1], ["I", 1], ["O", 1], ["P", 1],
    [["{", "["], 1], [["}", "]"], 1], [["|", "\\"], 1.5], ["PgUp", 1, "m c"]],
  [["Caps Lock", 1.75, "m"], ["A", 1], ["S", 1], ["D", 1], ["F", 1], ["G", 1], ["H", 1], ["J", 1], ["K", 1], ["L", 1],
    [[":", ";"], 1], [["\"", "'"], 1], ["", 2.25, "art"], ["PgDn", 1, "m c"]],
  [["Shift", 2.25, "m"], ["Z", 1], ["X", 1], ["C", 1], ["V", 1], ["B", 1], ["N", 1], ["M", 1],
    [["<", ","], 1], [[">", "."], 1], [["?", "/"], 1], ["Shift", 1.75, "m"], ["↑", 1, "m"], ["@knob", 1, "c"]],
  [["Ctrl", 1.25, "m"], ["Super", 1.25, "m"], ["Alt", 1.25, "m"], ["", 6.25, "space"], ["Fn", 1.25, "m"], ["Ctrl", 1.25, "m"],
    0.5, ["←", 1, "m"], ["↓", 1, "m"], ["→", 1, "m c"]],
];

function layout() {
  const keys = [];
  ROWS.forEach((row, r) => {
    let c = 0;
    for (const it of row) {
      if (typeof it === "number") { c += it; continue; }
      const [label, w, flagStr = ""] = it;
      const flags = flagStr.split(" ");
      if (flags.includes("c")) c = COL; // nav column sits after a 0.25 u gap
      keys.push({
        label, w, r, c,
        mod: flags.includes("m") || flags.includes("f") || flags.includes("space"),
        art: flags.includes("art"),
        knob: label === "@knob",
        x: -FW / 2 + (c + w / 2) * U,
        z: ZC - FH / 2 + (r + 0.5) * U,
      });
      c += w;
    }
  });
  return keys;
}

/* ------------------------------------------------------------------ textures */
function canvasTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function rainbowCanvas() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 4;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 512, 0);
  for (let i = 0; i <= 12; i++) grad.addColorStop(i / 12, `hsl(${(i / 12) * 360} 100% 60%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 4);
  return c;
}

function radialTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.55)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return canvasTex(c);
}

/** White-on-black legend mask covering the whole key field (used as alphaMap of a glowing plane). */
function legendTex(keys) {
  const PX = 2048 / FW; // pixels per metre
  const c = document.createElement("canvas");
  c.width = 2048; c.height = Math.round(FH * PX);
  const g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = g.strokeStyle = "#fff";
  g.textBaseline = "middle";
  const u = U * PX;
  const font = (s, wgt = 600) => `${wgt} ${Math.round(s * u)}px Arial, Helvetica, sans-serif`;
  for (const k of keys) {
    if (!k.label || k.art || k.knob) continue;
    const cx = (k.x + FW / 2) * PX, cy = (k.z - (ZC - FH / 2)) * PX;
    const tw = k.w * u - 0.3 * u, th = 0.78 * u;  // usable top face
    const x0 = cx - tw / 2 + 0.1 * u, y0 = cy - th / 2;
    if (k.label === "@power") {
      g.lineWidth = 0.05 * u;
      g.beginPath(); g.arc(cx, cy + 0.02 * u, 0.16 * u, -Math.PI * 0.32, Math.PI * 1.32); g.stroke();
      g.beginPath(); g.moveTo(cx, cy - 0.2 * u); g.lineTo(cx, cy + 0.02 * u); g.stroke();
    } else if (Array.isArray(k.label)) {
      g.textAlign = "left";
      g.font = font(0.27);
      g.fillText(k.label[0], x0 + 0.04 * u, y0 + 0.2 * u);
      g.fillText(k.label[1], x0 + 0.04 * u, y0 + 0.55 * u);
    } else if (k.label.length === 1 && /[A-Z]/.test(k.label)) {
      g.textAlign = "left";
      g.font = font(0.34, 700);
      g.fillText(k.label, x0 + 0.04 * u, y0 + 0.24 * u);
    } else if (/[←-↓]/.test(k.label)) {
      g.textAlign = "center";
      g.font = font(0.36, 700);
      g.fillText(k.label, cx, cy);
    } else if (/^F\d/.test(k.label)) {
      g.textAlign = "left";
      g.font = font(0.22, 700);
      g.fillText(k.label, x0 + 0.04 * u, y0 + 0.2 * u);
    } else {
      g.textAlign = k.w > 1 ? "left" : "center";
      g.font = font(k.label.length > 5 ? 0.165 : 0.19, 700);
      g.fillText(k.label, k.w > 1 ? x0 + 0.06 * u : cx, k.w > 1 ? y0 + 0.24 * u : cy - 0.1 * u);
    }
  }
  return canvasTex(c, false);
}

/** Black braided sleeve: tight diagonal weave. */
function braidTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  g.fillStyle = "#0b0b0c";
  g.fillRect(0, 0, 32, 32);
  g.lineWidth = 3;
  for (let i = -32; i < 64; i += 8) {
    g.strokeStyle = "#3a3b40"; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 32); g.stroke();
    g.strokeStyle = "#1d1e22"; g.beginPath(); g.moveTo(i + 32, 0); g.lineTo(i, 32); g.stroke();
  }
  const t = canvasTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ------------------------------------------------------------------ geometry helpers */
function roundRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Plan-view extrusion going up from y = 0 (shape y maps to -z), with rounded edges all round. */
function slab(shape, height, bevel, curveSegments = 6) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 3, curveSegments,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  return geo;
}

/** Keycap: rounded box whose top face is narrower than its base (cylindrical-ish sculpt). */
function capGeometry(wm, dm, h, ix = 0.0018, iz = 0.0022, seg = 2) {
  const geo = new RoundedBoxGeometry(wm, h, dm, seg, Math.min(0.0016, h * 0.3));
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const f = (p.getY(i) + h / 2) / h; // 0 at base, 1 at top
    p.setX(i, p.getX(i) * (1 - (f * ix) / wm));
    p.setZ(i, p.getZ(i) * (1 - (f * iz) / dm) + f * 0.0004);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ build */
/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  const keys = layout();
  const caseMat = k.mat(0x121316, { metalness: 0.35, roughness: 0.42 });

  // ---- bottom case: rounded slab whose top is sheared into the typing angle
  const tubH = HF - 0.0055;
  const tubGeo = slab(roundRectShape(W - 0.003, D - 0.003, 0.007), tubH, 0.0015);
  const tp = tubGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    const f = THREE.MathUtils.clamp(tp.getY(i) / tubH, 0, 1);
    tp.setY(i, tp.getY(i) + f * ((D / 2 - tp.getZ(i)) / D) * (HB - HF));
  }
  tubGeo.computeVertexNormals();
  g.add(shadowed(new THREE.Mesh(tubGeo, caseMat)));
  // rubber feet
  const footMat = k.mat(0x0a0a0a, { roughness: 0.9 });
  for (const [x, z] of [[-0.14, -0.055], [0.14, -0.055], [-0.14, 0.055], [0.14, 0.055]]) {
    const f = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.0012, 16), footMat));
    g.add(at(f, x, 0.0006, z));
  }

  // ---- deck: everything that follows the typing angle. Deck y = 0 is the top of the bezel.
  const deck = new THREE.Group();
  deck.position.set(0, (HF + HB) / 2, 0);
  deck.rotation.x = TILT;
  g.add(deck);

  // top frame (bezel) with the key well cut out
  const frame = roundRectShape(W - 0.003, D - 0.003, 0.007);
  const hw = FW / 2 + 0.0014, hz0 = ZC - FH / 2 - 0.0014, hz1 = ZC + FH / 2 + 0.0014;
  const hole = new THREE.Path();
  hole.moveTo(-hw, -hz1); hole.lineTo(hw, -hz1); hole.lineTo(hw, -hz0); hole.lineTo(-hw, -hz0); hole.lineTo(-hw, -hz1);
  frame.holes.push(hole);
  const frameGeo = slab(frame, 0.0058, 0.0015);
  frameGeo.translate(0, -0.0058, 0);
  deck.add(shadowed(new THREE.Mesh(frameGeo, caseMat)));
  // plate + switches level inside the well
  deck.add(at(new THREE.Mesh(new THREE.BoxGeometry(FW + 0.003, 0.002, FH + 0.003), k.mat(0x08080a, { roughness: 0.7 })), 0, -0.0062, ZC));

  // ---- per-key RGB: light pools on the plate + translucent lit skirts under each cap
  const lit = keys.filter((kk) => !kk.knob);
  const pool = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: radialTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, color: new THREE.Color(1.3, 1.3, 1.3) }),
    lit.length,
  );
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3();
  lit.forEach((kk, i) => {
    const wm = kk.w * U - GAP, dm = U - GAP;
    pool.setMatrixAt(i, m.compose(v.set(kk.x, -0.0050, kk.z), q, s.set(wm + 0.008, 1, dm + 0.008)));
  });
  pool.renderOrder = 1;
  deck.add(pool);

  // ---- keycaps (one InstancedMesh per width). Each cap = translucent lit lower half (shine-through
  //      "pudding" walls glowing in the key's colour) + opaque charcoal top: lighter alphas, darker mods.
  const LO_Y0 = -0.0012, LO_H = 0.0052, HI_H = 0.0050;
  const HI_Y0 = LO_Y0 + LO_H, TOP = HI_Y0 + HI_H;
  const capMat = k.mat(0xffffff, { roughness: 0.5, metalness: 0.0 });
  const skirtMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const byW = new Map();
  for (const kk of keys) if (!kk.knob && !kk.art) (byW.get(kk.w) ?? byW.set(kk.w, []).get(kk.w)).push(kk);
  const col = new THREE.Color();
  const skirts = []; // [mesh, litIndex[]]
  const e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  for (const [w, list] of byW) {
    const wm = w * U - GAP, dm = U - GAP;
    const top = new THREE.InstancedMesh(capGeometry(wm - 0.0022, dm - 0.0026, HI_H, 0.0026, 0.003), capMat, list.length);
    top.castShadow = top.receiveShadow = true;
    const loGeo = capGeometry(wm, dm, LO_H, 0.0022, 0.0026, 1);
    const lp = loGeo.attributes.position, lc = [];
    for (let i = 0; i < lp.count; i++) { const f = (lp.getY(i) + LO_H / 2) / LO_H; const val = 1.15 - 0.55 * f; lc.push(val, val, val); }
    loGeo.setAttribute("color", new THREE.Float32BufferAttribute(lc, 3));
    const lo = new THREE.InstancedMesh(loGeo, skirtMat, list.length);
    list.forEach((kk, i) => {
      const [hr, ar] = PROFILE[kk.r];
      q.setFromEuler(e.set(ar, 0, 0));
      top.setMatrixAt(i, m.compose(v.set(kk.x, HI_Y0 + hr + HI_H / 2, kk.z - 0.0003), q, one));
      top.setColorAt(i, col.set(kk.mod ? 0x222327 : 0x474b51));
      q.identity();
      lo.setMatrixAt(i, m.compose(v.set(kk.x, LO_Y0 + (LO_H + hr) / 2, kk.z), q, s.set(1, (LO_H + hr) / LO_H, 1)));
    });
    skirts.push([lo, list.map((kk) => lit.indexOf(kk))]);
    deck.add(top, lo);
  }

  // ---- shine-through legends: one glowing strip per row (follows the row's sculpt), masked by the legend texture
  const rbCanvas = rainbowCanvas();
  const legendRainbow = canvasTex(rbCanvas);
  legendRainbow.wrapS = THREE.RepeatWrapping;
  legendRainbow.repeat.set(SPAN, 1);
  const legendMat = new THREE.MeshBasicMaterial({ map: legendRainbow, alphaMap: legendTex(keys), transparent: true, depthWrite: false, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) });
  for (let r = 0; r < 6; r++) {
    const [hr, ar] = PROFILE[r];
    const geo = new THREE.PlaneGeometry(FW, U).rotateX(-Math.PI / 2);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (r + 1) / 6 + uv.getY(i) / 6);
    const strip = new THREE.Mesh(geo, legendMat);
    const holder = new THREE.Group();
    holder.position.set(0, HI_Y0 + hr + HI_H / 2, ZC - FH / 2 + (r + 0.5) * U);
    holder.rotation.x = ar;
    strip.position.set(0, HI_H / 2 + 0.00012, 0);
    holder.add(strip);
    deck.add(holder);
  }

  // ---- artisan Enter: white cap with three tiny PC fans
  const art = keys.find((kk) => kk.art);
  const white = k.mat(0xb3a894, { roughness: 0.6 });
  const artW = art.w * U - 0.0011;
  const artCap = new THREE.Mesh(capGeometry(artW, U - 0.0011, TOP - LO_Y0 + 0.0008, 0.003, 0.0038), white);
  shadowed(artCap);
  deck.add(at(artCap, art.x, (LO_Y0 + TOP + 0.0008) / 2, art.z));
  const aTop = TOP + 0.0008;
  const fanR = 0.0056;
  const fanFrame = new RoundedBoxGeometry(fanR * 2 + 0.0012, 0.0016, fanR * 2 + 0.0012, 1, 0.0008);
  const well = k.mat(0x4a4844, { roughness: 0.6 });
  const silver = k.mat(0xb7b2a9, { roughness: 0.45, metalness: 0.1 });
  const blades = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0034, 0.00045, 0.0016), silver, 3 * 9);
  let bi = 0;
  for (const dx of [-1, 0, 1]) {
    const fx = art.x + dx * (fanR * 2 + 0.0011), fz = art.z + 0.0003;
    deck.add(at(new THREE.Mesh(fanFrame, white), fx, aTop + 0.0003, fz));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(fanR - 0.0004, 0.00055, 6, 28), silver);
    ring.rotation.x = -Math.PI / 2;
    deck.add(at(ring, fx, aTop + 0.0012, fz));
    deck.add(at(new THREE.Mesh(new THREE.CylinderGeometry(fanR - 0.0006, fanR - 0.0006, 0.0004, 28), well), fx, aTop + 0.0012, fz));
    deck.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.0017, 0.0017, 0.0012, 18), silver), fx, aTop + 0.0016, fz));
    for (let b = 0; b < 9; b++) {
      const a = (b / 9) * Math.PI * 2;
      q.setFromEuler(new THREE.Euler(0.45, -a, 0, "YXZ"));
      blades.setMatrixAt(bi++, m.compose(v.set(fx + Math.cos(a) * 0.0033, aTop + 0.0015, fz - Math.sin(a) * 0.0033), q, s.set(1, 1, 1)));
    }
  }
  q.identity();
  deck.add(blades);

  // ---- rotary knob with glowing RGB ring (nav column, shift row)
  const kn = keys.find((kk) => kk.knob);
  const ringTex = canvasTex(rbCanvas);
  ringTex.wrapS = THREE.RepeatWrapping;
  const knobRing = new THREE.Mesh(new THREE.TorusGeometry(0.0074, 0.0019, 12, 64),
    new THREE.MeshBasicMaterial({ map: ringTex, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
  knobRing.rotation.x = -Math.PI / 2;
  deck.add(at(knobRing, kn.x, 0.0016, kn.z));
  deck.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.0089, 0.0089, 0.004, 40), k.mat(0x0c0c0e, { roughness: 0.5 })), kn.x, -0.0025, kn.z));
  const knobMat = k.mat(0x1d1e22, { metalness: 0.75, roughness: 0.32 });
  const knob = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0055, 0.0075, 40), knobMat));
  deck.add(at(knob, kn.x, 0.003, kn.z));
  deck.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.0048, 0.0054, 0.0006, 40), k.mat(0x2b2d33, { metalness: 0.6, roughness: 0.25 })), kn.x, 0.0069, kn.z));

  // ---- black braided coiled cable from the back (right of centre, as in the photos), coil runs right
  const pts = [];
  const cx = 0.07, y0 = HB * 0.55, zb = -D / 2;
  pts.push(new THREE.Vector3(cx, y0, zb - 0.002), new THREE.Vector3(cx, y0 - 0.001, zb - 0.014),
    new THREE.Vector3(cx + 0.006, 0.009, zb - 0.026), new THREE.Vector3(cx + 0.018, 0.0085, zb - 0.03));
  const coilStart = cx + 0.024, turns = 9, pitch = 0.0052, cr = 0.0062, cz = zb - 0.03;
  for (let i = 0; i <= turns * 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(new THREE.Vector3(coilStart + (i / 16) * pitch, 0.0085 + Math.cos(a) * cr - 0.0002, cz + Math.sin(a) * cr));
  }
  const ce = coilStart + turns * pitch;
  pts.push(new THREE.Vector3(ce + 0.012, 0.004, cz - 0.002), new THREE.Vector3(ce + 0.03, 0.0024, cz - 0.012),
    new THREE.Vector3(ce + 0.036, 0.0024, cz - 0.03), new THREE.Vector3(ce + 0.038, 0.0024, cz - 0.045));
  const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const len = curve.getLength();
  const braid = braidTex();
  braid.repeat.set(len / 0.003, 1);
  const cable = shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, 460, 0.0021, 6, false), k.mat(0xffffff, { map: braid, roughness: 0.8 })));
  g.add(cable);
  g.userData.cableOut = pts[pts.length - 1].clone(); // scene cables continue from here to the PC
  // USB-C plug boot at the case
  g.add(at(box(0.009, 0.0055, 0.014, k.mat(0x0e0e10, { roughness: 0.5, metalness: 0.4 }), 0.0018), cx, y0, zb - 0.006));

  // ---- animation: rainbow wave sweeping left to right, ring spinning
  const keyHue = lit.map((kk) => (kk.x + FW / 2) / FW);
  const c = new THREE.Color();
  const cols = lit.map(() => new THREE.Color());
  const speed = reducedMotion ? 0.15 : 1;
  const paint = (t) => {
    const off = HUE0 - t * 0.08 * speed;
    for (let i = 0; i < lit.length; i++) {
      const h = (((keyHue[i] * SPAN + off) % 1) + 1) % 1;
      c.setHSL(h, 1, 0.55);
      pool.setColorAt(i, c);
      cols[i].copy(c);
    }
    pool.instanceColor.needsUpdate = true;
    for (const [mesh, idx] of skirts) {
      idx.forEach((li, j) => mesh.setColorAt(j, cols[li]));
      mesh.instanceColor.needsUpdate = true;
    }
    legendRainbow.offset.x = off;
    knobRing.rotation.z = t * 0.6 * speed;
  };
  paint(0);
  animators.push((t) => paint(t));
  debugCrop(g);
  return g;
}

/** Dev aid for preview.html: ?kbcrop=x0,x1 keeps only parts whose x lies inside [x0, x1] so the camera frames them. */
function debugCrop(g) {
  const p = typeof location !== "undefined" && new URLSearchParams(location.search).get("kbcrop");
  if (!p) return;
  const [x0, x1] = p.split(",").map(Number);
  g.updateMatrixWorld(true);
  const drop = [], m = new THREE.Matrix4(), v = new THREE.Vector3(), b = new THREE.Box3();
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (o.isInstancedMesh) {
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        v.setFromMatrixPosition(m).applyMatrix4(o.matrixWorld);
        if (v.x < x0 || v.x > x1) o.setMatrixAt(i, m.makeScale(0, 0, 0));
      }
      o.computeBoundingBox();
    } else {
      b.setFromObject(o);
      if (b.min.x < x0 - 0.01 || b.max.x > x1 + 0.01) drop.push(o);
    }
  });
  for (const o of drop) o.parent.remove(o);
}
