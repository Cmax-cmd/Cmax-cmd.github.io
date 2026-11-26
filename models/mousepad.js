// mousepad model: Artisan NINJA FX Type-99, size L (420 x 330 x 4 mm), black cloth, stitched edge.
// Origin = bottom centre, resting on the desk top (y = 0). Units: metres. +z = front.
import { THREE, shadowed } from "../lib.js";

const T = 0.004;       // total thickness
const R = 0.011;       // corner radius
const ST_R = 0.0015;   // stitched-edge bead radius

function roundRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return s;
}

/** Top print: near-black cloth with the cream "ARTISAN 99式" logo in the front-right corner. */
function topTexture(w, dep) {
  const c = document.createElement("canvas");
  c.width = 2048; c.height = Math.round(2048 * dep / w);
  const g = c.getContext("2d");
  const mm = c.width / (w * 1000); // pixels per millimetre
  g.fillStyle = "#131315";
  g.fillRect(0, 0, c.width, c.height);
  // very soft light falloff so the cloth does not read as flat plastic
  const vg = g.createRadialGradient(c.width * 0.45, c.height * 0.4, 0, c.width * 0.5, c.height * 0.5, c.width * 0.75);
  vg.addColorStop(0, "rgba(255,255,255,0.025)");
  vg.addColorStop(1, "rgba(0,0,0,0.05)");
  g.fillStyle = vg;
  g.fillRect(0, 0, c.width, c.height);

  // ---- logo, laid out in millimetres from its left end; right end ~24 mm from the edge
  const ink = "#e8dcc6";
  const H = 7.2;                      // cap height of the wordmark (mm)
  const x0 = (w * 1000 - 22 - 108) * mm, base = (dep * 1000 - 30) * mm; // baseline of the wordmark
  const P = (x, y) => [x0 + x * mm, base - y * mm];
  g.strokeStyle = g.fillStyle = ink;
  g.lineCap = "round"; g.lineJoin = "round";
  g.lineWidth = 0.45 * mm;
  const poly = (...pts) => { g.beginPath(); pts.forEach(([x, y], i) => { const [px, py] = P(x, y); i ? g.lineTo(px, py) : g.moveTo(px, py); }); g.stroke(); };
  // the swept "shuriken" arrow in front of the wordmark
  poly([0, H * 0.72], [33, H * 1.04], [23, H * 0.1], [0, H * 0.72]);
  poly([23, H * 0.1], [25.5, -3]);
  poly([9, H * 0.55], [33, H * 1.04]);
  // ARTISAN in thin angular strokes, glyph box 5.4 x H mm
  const gw = 5.2, gap = 2.2;
  const glyphs = {
    A: [[[0, 0], [gw / 2, H], [gw, 0]], [[gw * 0.25, H * 0.42], [gw * 0.75, H * 0.42]]],
    R: [[[0, 0], [0, H], [gw * 0.85, H], [gw * 0.85, H * 0.52], [0, H * 0.52]], [[gw * 0.35, H * 0.52], [gw, 0]]],
    T: [[[0, H], [gw, H]], [[gw / 2, H], [gw / 2, 0]]],
    I: [[[gw * 0.3, H], [gw * 0.3, 0]]],
    S: [[[gw, H], [0, H], [0, H * 0.52], [gw, H * 0.48], [gw, 0], [0, 0]]],
    N: [[[0, 0], [0, H], [gw, 0], [gw, H]]],
  };
  let gx = 34;
  for (const ch of "ARTISAN") {
    for (const line of glyphs[ch]) poly(...line.map(([x, y]) => [gx + x, y]));
    gx += (ch === "I" ? gw * 0.6 : gw) + gap;
  }
  // 99式 and the small line under it
  g.textBaseline = "alphabetic";
  g.textAlign = "left";
  g.font = `400 ${Math.round(9.5 * mm)}px "Yu Gothic", "Meiryo", "Noto Sans JP", Arial, sans-serif`;
  const [nx, ny] = P(gx + 1.5, -0.2);
  g.fillText("99式", nx, ny);
  const right = nx + g.measureText("99式").width;
  g.font = `600 ${Math.round(3.6 * mm)}px Arial, Helvetica, sans-serif`;
  g.textAlign = "right";
  g.fillText("NINJA FX / Made in JAPAN", right, base + 6.4 * mm);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Fine plain-weave bump (tiles every 2 mm). */
function weaveTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  g.fillStyle = "#808080";
  g.fillRect(0, 0, 32, 32);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const along = (x + y) % 2 === 0;
    const grd = along ? g.createLinearGradient(x * 8, 0, x * 8 + 8, 0) : g.createLinearGradient(0, y * 8, 0, y * 8 + 8);
    grd.addColorStop(0, "#404040"); grd.addColorStop(0.5, "#d0d0d0"); grd.addColorStop(1, "#404040");
    g.fillStyle = grd;
    g.fillRect(x * 8, y * 8, 8, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Overlock stitching: slanted threads. `alongU` = threads advance along the texture's u axis. */
function stitchTexture(alongU) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  g.fillStyle = "#0a0a0b";
  g.fillRect(0, 0, 32, 32);
  g.strokeStyle = "#232327";
  g.lineWidth = 9;
  g.beginPath();
  if (alongU) { g.moveTo(4, -4); g.lineTo(28, 36); } else { g.moveTo(-4, 4); g.lineTo(36, 28); }
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  const [w, dep] = d.size ?? [0.42, 0.33];

  // ---- pad body: rounded-corner slab, cloth top, rubber sides
  const bodyH = T - 0.0004;
  const bev = 0.0006;
  const geo = new THREE.ExtrudeGeometry(roundRectShape(w - 2 * bev, dep - 2 * bev, R - bev), {
    depth: bodyH - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 1, curveSegments: 6,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bev, 0);
  const map = topTexture(w, dep);
  map.repeat.set(1 / w, 1 / dep);
  map.offset.set(0.5, 0.5);
  const weave = weaveTexture();
  weave.repeat.set(500, 500); // 2 mm tiles (UVs are in metres)
  const top = k.mat(0xffffff, { map, bumpMap: weave, bumpScale: 0.35, roughness: 0.93, metalness: 0 });
  const side = k.mat(0x111113, { roughness: 0.95 });
  g.add(shadowed(new THREE.Mesh(geo, [top, side])));

  // ---- stitched edge bead: four straight runs + four quarter-round corners
  const y = T - ST_R - 0.0001, inset = ST_R - 0.0002;
  const pitch = 0.0015; // one stitch every 1.5 mm
  const runMat = (len) => {
    const t = stitchTexture(false);
    t.repeat.set(1, len / pitch);
    return k.mat(0xffffff, { map: t, roughness: 0.85 });
  };
  const runs = [
    [w - 2 * R, 0, -(dep / 2 - inset), true], [w - 2 * R, 0, dep / 2 - inset, true],
    [dep - 2 * R, -(w / 2 - inset), 0, false], [dep - 2 * R, w / 2 - inset, 0, false],
  ];
  for (const [len, x, z, alongX] of runs) {
    const m = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(ST_R, ST_R, len, 8, 1, true), runMat(len)));
    if (alongX) m.rotation.z = Math.PI / 2; else m.rotation.x = Math.PI / 2;
    m.position.set(x, y, z);
    g.add(m);
  }
  const arcR = R - inset;
  const cornerTex = stitchTexture(true);
  cornerTex.repeat.set((arcR * Math.PI / 2) / pitch, 1);
  const cornerMat = k.mat(0xffffff, { map: cornerTex, roughness: 0.85 });
  const cornerGeo = new THREE.TorusGeometry(arcR, ST_R, 8, 8, Math.PI / 2).rotateX(-Math.PI / 2);
  [[1, -1, 0], [-1, -1, 1], [-1, 1, 2], [1, 1, 3]].forEach(([sx, sz, q]) => {
    const m = shadowed(new THREE.Mesh(cornerGeo, cornerMat));
    m.rotation.y = (q * Math.PI) / 2;
    m.position.set(sx * (w / 2 - R), y, sz * (dep / 2 - R));
    g.add(m);
  });
  return g;
}
