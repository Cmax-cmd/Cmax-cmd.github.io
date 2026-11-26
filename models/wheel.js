// wheel model: MOZA R5 direct-drive base with the MOZA ES steering wheel attached, sitting on the floor on its
// table clamp (the user only clamps it to the desk to play). Rim upright, facing the viewer (+z).
// Origin = floor contact point (under the clamp knobs). Units: metres.
import { THREE, glow, shadowed, cyl, at } from "../lib.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Tube through sections { p, rx, ry } with a superellipse cross-section. rx runs along T x ref. */
function loft(secs, mat, { seg = 24, n = 2, ref = V(0, 1, 0), closed = false } = {}) {
  const pos = [], idx = [];
  const e = 2 / n, sp = (c) => Math.sign(c) * Math.pow(Math.abs(c), e);
  const N = secs.length;
  for (let i = 0; i < N; i++) {
    const s = secs[i];
    const a = closed ? secs[(i - 1 + N) % N].p : secs[Math.max(0, i - 1)].p;
    const b = closed ? secs[(i + 1) % N].p : secs[Math.min(N - 1, i + 1)].p;
    const T = V(0, 0, 0).subVectors(b, a).normalize();
    const side = V(0, 0, 0).crossVectors(T, s.ref || ref).normalize();
    const up = V(0, 0, 0).crossVectors(side, T).normalize();
    for (let j = 0; j <= seg; j++) {
      const t = (j / seg) * Math.PI * 2;
      const cx = sp(Math.cos(t)) * s.rx, cy = sp(Math.sin(t)) * s.ry;
      pos.push(s.p.x + side.x * cx + up.x * cy, s.p.y + side.y * cx + up.y * cy, s.p.z + side.z * cx + up.z * cy);
    }
  }
  const R = seg + 1, rings = closed ? N : N - 1;
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const i2 = (i + 1) % N, a = i * R + j, b = a + 1, c = i2 * R + j, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  if (!closed) for (const [ring, first] of [[0, true], [N - 1, false]]) {
    const p = secs[ring].p, ci = pos.length / 3;
    pos.push(p.x, p.y, p.z);
    for (let j = 0; j < seg; j++) { const a = ring * R + j, b = a + 1; first ? idx.push(ci, a, b) : idx.push(ci, b, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return shadowed(new THREE.Mesh(g, mat));
}

/** Flat part from an outline in the XY plane (pts [x, y]; mirror = right half from top centre to bottom centre),
 *  extruded along +z from z0 by depth with a rounded edge. holes: arrays of [x, y]. */
function plate(pts, z0, depth, bevel, mat, { mirror = false, holes = [], curve = 6, smooth = false } = {}) {
  let p = pts.map(([x, y]) => new THREE.Vector2(x, y));
  if (mirror) p = p.concat(pts.slice(1, -1).reverse().map(([x, y]) => new THREE.Vector2(-x, y)));
  const shape = new THREE.Shape();
  shape.moveTo(p[0].x, p[0].y);
  if (smooth) shape.splineThru(p.slice(1).concat([p[0]]));
  else { for (const q of p.slice(1)) shape.lineTo(q.x, q.y); shape.closePath(); }
  for (const h of holes) {
    const path = new THREE.Path();
    path.moveTo(h[0][0], h[0][1]);
    for (const q of h.slice(1)) path.lineTo(q[0], q[1]);
    path.closePath();
    shape.holes.push(path);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.0001, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.9,
    bevelOffset: -bevel * 0.9, bevelSegments: 3, curveSegments: curve,
  });
  geo.translate(0, 0, z0 + bevel);
  geo.computeVertexNormals();
  return shadowed(new THREE.Mesh(geo, mat));
}

/** Text / label texture. */
function labelTex(draw, w = 128, h = 128) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const mozaFont = (px) => `italic 900 ${px}px 'Arial Black', 'Segoe UI', system-ui, sans-serif`;

/** A decal plane facing +z (or rotated afterwards). */
function decal(tex, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.5, metalness: 0.2 }));
}

export function build(k, d) {
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);

  const alu = k.mat(0x5a5d63, { roughness: 0.4, metalness: 0.6 });          // R5 gunmetal anodised body
  const aluDark = k.mat(0x303237, { roughness: 0.45, metalness: 0.6 });
  const steel = k.mat(0x3a3c41, { roughness: 0.55, metalness: 0.45 });        // clamp
  const chrome = k.mat(0x8e9298, { roughness: 0.32, metalness: 0.9 });
  const blackPl = k.mat(0x0f1012, { roughness: 0.6 });
  const leather = k.mat(0x111113, { roughness: 0.72 });
  const plateMat = k.mat(0x44474d, { roughness: 0.36, metalness: 0.65 });     // wheel centre plate (brushed)
  const btnMat = k.mat(0x0c0c0e, { roughness: 0.35 });
  const silver = k.mat(0x9a9da4, { roughness: 0.3, metalness: 0.85 });

  // ====================== table clamp (resting on its knobs) ======================
  const KN = 0.03;                     // knob height
  const JAW = KN + 0.004;              // underside of the lower jaws
  const PLATE_Y = JAW + 0.1;           // underside of the top plate
  const CZ = 0.06;                     // z of the C brackets' upright (desk edge side, towards the driver)
  {
    // top plate with X cut-outs and slots
    const w = 0.2, dz = 0.16, zc = -0.02;
    const hx = 0.07, hz = 0.05;
    const tri = (a, b, c) => [a, b, c];
    const holes = [
      tri([-hx, -hz + 0.012], [hx, -hz + 0.012], [0, -0.008]),
      tri([-hx, hz - 0.012], [0, 0.008], [hx, hz - 0.012]),
      tri([-hx - 0.006, -hz + 0.02], [-0.012, 0], [-hx - 0.006, hz - 0.02]),
      tri([hx + 0.006, -hz + 0.02], [hx + 0.006, hz - 0.02], [0.012, 0]),
    ];
    const pl = plate([[-w / 2, -dz / 2], [w / 2, -dz / 2], [w / 2, dz / 2], [-w / 2, dz / 2]], 0, 0.004, 0.0012, steel, { holes });
    pl.rotation.x = -Math.PI / 2;            // XY outline -> XZ plane, extruded up
    pl.position.set(0, PLATE_Y, zc);
    g.add(pl);
    // the two C brackets (left/right), opening away from the driver (-z)
    for (const s of [-1, 1]) {
      const x = s * 0.078;
      const r = 0.008;
      const path = [];
      const add = (y, z) => path.push({ p: V(x, y, z), rx: 0.0022, ry: 0.019 });
      add(PLATE_Y + 0.002, CZ - 0.05);
      add(PLATE_Y + 0.002, CZ - r);
      for (let i = 1; i < 4; i++) { const a = (i / 4) * Math.PI / 2; add(PLATE_Y + 0.002 - r + Math.cos(a) * r, CZ - r + Math.sin(a) * r); }
      add(PLATE_Y + 0.002 - r, CZ);
      add(JAW + 0.002 + r, CZ);
      for (let i = 1; i < 4; i++) { const a = (i / 4) * Math.PI / 2; add(JAW + 0.002 + r - Math.sin(a) * r, CZ - r + Math.cos(a) * r); }
      add(JAW + 0.002, CZ - r);
      add(JAW + 0.002, CZ - 0.065);
      g.add(loft(path, steel, { seg: 16, n: 5, ref: V(1, 0, 0) }));
      // screw, pressure pad and star knob
      const sz = CZ - 0.035;
      g.add(at(cyl(0.0045, 0.0045, 0.055, chrome, 12), x, JAW + 0.022, sz));
      g.add(at(cyl(0.013, 0.013, 0.003, chrome, 24), x, JAW + 0.05, sz));
      g.add(at(cyl(0.007, 0.009, 0.01, blackPl, 16), x, KN - 0.004, sz));
      const star = new THREE.Shape();
      for (let i = 0; i <= 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const rr = 0.0145 + 0.0045 * Math.cos(a * 5);
        i ? star.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : star.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      const kg = new THREE.ExtrudeGeometry(star, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.002, bevelSegments: 2 });
      kg.rotateX(-Math.PI / 2);
      g.add(at(shadowed(new THREE.Mesh(kg, blackPl)), x, 0.003, sz));
    }
  }

  // ====================== R5 base body ======================
  const BW = 0.066, BH = 0.0625, CH = 0.02;        // half width / half height / corner chamfer
  const Y_AX = PLATE_Y + 0.004 + BH;               // shaft axis height
  const Z_REAR = -0.105, Z_FRONT = 0.06;
  {
    // cross-section with a finned channel on top and on each side
    const half = [
      [0, BH - 0.012], [0.024, BH - 0.012], [0.034, BH], [BW - CH, BH], [BW, BH - CH],
      [BW, 0.034], [BW - 0.013, 0.024], [BW - 0.013, 0.0], [BW, -0.01],
      [BW, -BH + CH], [BW - CH, -BH], [0, -BH],
    ];
    const body = plate(half, Z_REAR, Z_FRONT - Z_REAR, 0.004, alu, { mirror: true });
    body.position.y = Y_AX;
    {
      // chamfer the top front and top rear edges
      const p = body.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i), z = p.getZ(i), c = y - (BH - 0.017);
        if (c > 0) p.setZ(i, THREE.MathUtils.clamp(z, Z_REAR + c * 0.8, Z_FRONT - c * 0.9));
      }
      body.geometry.computeVertexNormals();
    }
    g.add(body);
    // fins
    for (let i = -3; i <= 3; i++) {
      g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.011, Z_FRONT - Z_REAR - 0.05), aluDark), i * 0.0066, Y_AX + BH - 0.0065, (Z_FRONT + Z_REAR) / 2));
    }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0022, Z_FRONT - Z_REAR - 0.012), aluDark);
      g.add(at(fin, s * (BW - 0.007), Y_AX + 0.0035 + i * 0.0055, (Z_FRONT + Z_REAR) / 2));
    }
    // front boss, shaft housing
    const front = Z_FRONT;
    const boss = cyl(0.043, 0.045, 0.006, aluDark, 48); boss.rotation.x = Math.PI / 2;
    g.add(at(boss, 0, Y_AX - 0.002, front + 0.002));
    const ring = cyl(0.036, 0.04, 0.012, alu, 48); ring.rotation.x = Math.PI / 2;
    g.add(at(ring, 0, Y_AX, front + 0.01));
    const shaft = cyl(0.027, 0.027, 0.03, blackPl, 40); shaft.rotation.x = Math.PI / 2;
    g.add(at(shaft, 0, Y_AX, front + 0.03));
    // rear: power / USB ports panel
    const rear = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), blackPl);
    rear.rotation.y = Math.PI;
    g.add(at(rear, 0, Y_AX - 0.025, Z_REAR - 0.0005));
    // logos
    const topLogo = decal(labelTex((c, w, h) => {
      c.fillStyle = "#e8e9ec"; c.font = mozaFont(64); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("MOZA", w / 2, h / 2 + 4);
    }, 256, 80), 0.03, 0.0094);
    g.add(at(topLogo, 0, Y_AX + 0.05, front + 0.0006));
    for (const s of [-1, 1]) {
      const side = decal(labelTex((c, w, h) => {
        c.fillStyle = "#e8e9ec"; c.textAlign = "center"; c.textBaseline = "middle";
        c.font = mozaFont(96); c.fillText("MOZA", w / 2, 62);
        c.font = "600 34px 'Segoe UI', system-ui, sans-serif"; c.fillText("R  A  C  I  N  G", w / 2, 128);
        c.fillRect(30, 104, w - 60, 3);
      }, 320, 160), 0.056, 0.028);
      side.rotation.y = s * Math.PI / 2;
      g.add(at(side, s * (BW + 0.0006), Y_AX - 0.033, Z_REAR + 0.045 * (s > 0 ? 1 : 1)));
      if (s < 0) side.scale.x = 1;
    }
  }

  // ====================== MOZA ES steering wheel ======================
  const W = new THREE.Group();
  const ZW = Z_FRONT + 0.045;            // back of the wheel's quick-release collar
  W.position.set(0, Y_AX, 0);
  g.add(W);
  {
    // quick release collar + rear cover
    const qr = cyl(0.031, 0.031, 0.028, aluDark, 40); qr.rotation.x = Math.PI / 2;
    W.add(at(qr, 0, 0, ZW + 0.014));
    const qrRing = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.0025, 8, 40), silver);
    W.add(at(qrRing, 0, 0, ZW + 0.004));
    const back = plate([[0, 0.032], [0.04, 0.03], [0.075, 0.022], [0.08, -0.02], [0.06, -0.055], [0.02, -0.075], [0, -0.075]], ZW + 0.026, 0.016, 0.004, blackPl, { mirror: true, smooth: true });
    W.add(back);

    const ZR = ZW + 0.05;                 // rim centre plane
    // ---- rim: D-shaped (flat bottom), thicker at the grips
    const secs = [], NR = 72;
    for (let i = 0; i < NR; i++) {
      const a = (i / NR) * Math.PI * 2;  // 0 = right, pi/2 = top
      let x = Math.cos(a) * 0.1265, y = Math.sin(a) * 0.1265;
      if (y < 0) y = -0.119 * Math.pow(Math.abs(Math.sin(a)), 0.55);     // flattened bottom
      y += 0.003;
      const grip = Math.exp(-((Math.abs(Math.cos(a)) - 0.97) ** 2) / 0.004);
      secs.push({ p: V(x, y, ZR), rx: 0.0125 + 0.002 * grip, ry: 0.0145 + 0.0015 * grip });
    }
    W.add(loft(secs, leather, { seg: 20, n: 2.2, ref: V(0, 0, 1), closed: true }));
    // white top marker
    const mk = [];
    for (let i = -2; i <= 2; i++) { const a = Math.PI / 2 + i * 0.012; mk.push({ p: V(Math.cos(a) * 0.1265, Math.sin(a) * 0.1265 + 0.003, ZR), rx: 0.0131, ry: 0.0151 }); }
    W.add(loft(mk, k.mat(0x9fa1a6, { roughness: 0.55 }), { seg: 20, n: 2.2, ref: V(0, 0, 1) }));

    // ---- spokes (leather): two side wings and the bottom spoke
    for (const s of [-1, 1]) {
      const wing = plate([[0.07, 0.016], [0.1, 0.022], [0.118, 0.03], [0.121, -0.012], [0.117, -0.05], [0.1, -0.04], [0.078, -0.028]].map(([x, y]) => [s * x, y]), ZR - 0.012, 0.02, 0.005, leather, { smooth: true });
      if (s < 0) wing.geometry.scale(1, 1, 1);
      W.add(wing);
    }
    W.add(plate([[0, -0.07], [0.022, -0.07], [0.026, -0.08], [0.036, -0.108], [0.04, -0.118], [0, -0.118]], ZR - 0.011, 0.019, 0.005, leather, { mirror: true }));

    // ---- paddle shifters (behind the plate)
    for (const s of [-1, 1]) {
      const pad = plate([[0.07, 0.043], [0.083, 0.047], [0.094, 0.036], [0.101, 0.0], [0.1, -0.045], [0.093, -0.064], [0.082, -0.062], [0.078, -0.03], [0.072, 0.02]].map(([x, y]) => [s * x, y]),
        ZR - 0.026, 0.005, 0.0015, blackPl, { smooth: true });
      W.add(pad);
    }

    // ---- centre plate (gunmetal) with the black hexagon hub
    const PZ = ZR - 0.004, PT = 0.012, FZ = PZ + PT;  // front face z
    W.add(plate([
      [0, 0.036], [0.033, 0.036], [0.04, 0.029], [0.072, 0.031], [0.08, 0.024], [0.084, 0.008],
      [0.084, -0.025], [0.076, -0.03], [0.07, -0.04], [0.066, -0.06], [0.05, -0.072], [0.032, -0.068],
      [0.02, -0.058], [0.018, -0.084], [0, -0.084],
    ], PZ, PT, 0.002, plateMat, { mirror: true }));
    // dark inner face (the black field behind the buttons)
    W.add(plate([
      [0, 0.03], [0.03, 0.03], [0.036, 0.022], [0.07, 0.024], [0.076, 0.018], [0.078, 0.006],
      [0.078, -0.022], [0.06, -0.026], [0.04, -0.03], [0.022, -0.045], [0.016, -0.05], [0, -0.05],
    ], FZ - 0.001, 0.0018, 0.0006, k.mat(0x1c1d21, { roughness: 0.45, metalness: 0.5 }), { mirror: true }));
    // silver trims round the lower pods
    for (const s of [-1, 1]) {
      const tr = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI * 0.9 + (i / 10) * Math.PI * 1.05;
        tr.push({ p: V(s * (0.0395 + Math.cos(a) * -0.03 * s * s), -0.05 + Math.sin(a) * 0.026, FZ + 0.0005), rx: 0.0012, ry: 0.0012 });
      }
      W.add(loft(tr, silver, { seg: 6, ref: V(0, 0, 1) }));
    }
    // hexagon hub + MOZA RACING logo
    const hex = [[0, 0.016], [0.012, 0.016], [0.018, 0.004], [0.018, -0.008], [0.009, -0.016], [0, -0.016]];
    const hexM = plate(hex, FZ, 0.005, 0.0015, k.mat(0x0b0b0d, { roughness: 0.3, metalness: 0.3 }), { mirror: true });
    hexM.position.set(0, 0.001, 0);
    W.add(hexM);
    const logo = decal(labelTex((c, w, h) => {
      c.fillStyle = "#f2f2f4"; c.textAlign = "center"; c.textBaseline = "middle";
      c.font = mozaFont(64); c.fillText("MOZA", w / 2, 46);
      c.font = "600 22px 'Segoe UI', system-ui, sans-serif"; c.fillText("R A C I N G", w / 2, 92);
    }, 256, 112), 0.03, 0.013);
    W.add(at(logo, 0, 0.0005, FZ + 0.0052));

    // RGB rev-light strip on the top edge
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.0035, 0.004), new THREE.MeshBasicMaterial({
      toneMapped: false,
      map: labelTex((c, w) => {
        const gr = c.createLinearGradient(0, 0, w, 0);
        gr.addColorStop(0, "#1aff5a"); gr.addColorStop(0.45, "#b8ff2a"); gr.addColorStop(0.7, "#ffb21a"); gr.addColorStop(1, "#ff2a1a");
        c.fillStyle = gr; c.fillRect(0, 0, w, 16);
      }, 128, 16),
    }));
    led.material.color.setScalar(1.6);
    W.add(at(led, 0, 0.0325, FZ + 0.0015));

    // ---- buttons
    const S = 0.000321; // ref px -> m
    const P = (px, py) => [(px - 500) * S, (505 - py) * S];
    const capGeo = new THREE.CylinderGeometry(1, 1, 1, 24);
    const round = (px, py, r, h, label, fs = 30) => {
      const [x, y] = P(px, py);
      const b = shadowed(new THREE.Mesh(capGeo, btnMat));
      b.scale.set(r, h, r); b.rotation.x = Math.PI / 2;
      W.add(at(b, x, y, FZ + h / 2));
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.0012, 24), silver);
      W.add(at(ring, x, y, FZ + 0.0003));
      if (label) {
        const t = labelTex((c, w, h2) => {
          c.fillStyle = "#0c0c0e"; c.fillRect(0, 0, w, h2);
          c.fillStyle = "#f4f4f6"; c.font = `700 ${fs}px 'Segoe UI', system-ui, sans-serif`;
          c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(label, w / 2, h2 / 2 + 2);
        }, 64, 64);
        const dm = new THREE.Mesh(new THREE.CircleGeometry(r * 0.98, 24), new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }));
        W.add(at(dm, x, y, FZ + h + 0.0002));
      }
    };
    for (const [px, py, l] of [[285, 450, "N"], [325, 428, "WIP"], [662, 428, "BOX"], [708, 450, "P"], [396, 465, "FL"], [597, 465, "PL"], [282, 627, "CAM"], [708, 627, "R"]])
      round(px, py, 0.0052, 0.003, l, l.length > 2 ? 20 : 30);
    for (const [px, py] of [[455, 455], [540, 455], [410, 532], [585, 532], [455, 608], [540, 608]]) round(px, py, 0.0046, 0.0015, "");
    for (const [px, py, l] of [[682, 497, "Y"], [650, 530, "X"], [715, 530, "B"], [682, 563, "A"]]) round(px, py, 0.0042, 0.003, l, 32);
    round(370, 680, 0.011, 0.008, "RADIO", 15);
    round(622, 680, 0.011, 0.008, "START", 15);
    // rectangular S1 / S2 / HOME / MENU keys
    for (const [px, py, l, w] of [[472, 662, "S1", 0.0085], [522, 662, "S2", 0.0085], [497, 700, "HOME", 0.0135], [497, 738, "MENU", 0.0135]]) {
      const [x, y] = P(px, py);
      const t = labelTex((c, cw, ch) => {
        c.fillStyle = "#0c0c0e"; c.fillRect(0, 0, cw, ch);
        c.fillStyle = "#f4f4f6"; c.font = "700 30px 'Segoe UI', system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(l, cw / 2, ch / 2 + 2);
      }, 128, 64);
      const key = plate([[-w / 2, -0.0032], [w / 2, -0.0032], [w / 2, 0.0032], [-w / 2, 0.0032]], FZ, 0.003, 0.0008, btnMat);
      W.add(at(key, x, y, 0));
      const dm = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 0.0055), new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }));
      W.add(at(dm, x, y, FZ + 0.0031));
    }
    // D-pad
    {
      const [x, y] = P(305, 530);
      const a = 0.0045, b = 0.0135;
      const dp = plate([[-a, b], [a, b], [a, a], [b, a], [b, -a], [a, -a], [a, -b], [-a, -b], [-a, -a], [-b, -a], [-b, a], [-a, a]], FZ, 0.0035, 0.0009, btnMat);
      W.add(at(dp, x, y, 0));
    }
  }

  g.position.z = -(CZ - 0.035);          // floor contact (knob centres) at z = 0
  return root;
}
