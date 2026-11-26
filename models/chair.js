// chair model: generic black mesh office chair (5-star base, twin-wheel casters, gas lift, padded seat,
// mesh backrest with lumbar curve, padded armrests). No brand.
// Origin = floor centre under the gas lift (y = 0). Units: metres. +z = front of the seat.
import { THREE, shadowed, cyl, at } from "../lib.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Tube through sections { p, rx, ry } with a superellipse cross-section (n = 2 ellipse, higher = squarer).
 *  rx runs along T x ref (sideways), ry along the remaining "up" axis. Open tubes get fan caps. */
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
  const R = seg + 1;
  const rings = closed ? N : N - 1;
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) {
    const i2 = (i + 1) % N;
    const a = i * R + j, b = a + 1, c = i2 * R + j, d = c + 1;
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

/** Evenly tessellated rounded box (so it can be deformed afterwards). warp(v) may move each vertex. */
function softBox(w, h, d, r, mat, { sx = 24, sy = 6, sz = 24, warp } = {}) {
  let g = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
  g.deleteAttribute("normal"); g.deleteAttribute("uv");
  g = mergeVertices(g, 1e-6);
  const p = g.attributes.position, v = V(0, 0, 0), inner = V(0, 0, 0);
  const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    inner.set(THREE.MathUtils.clamp(v.x, -ix, ix), THREE.MathUtils.clamp(v.y, -iy, iy), THREE.MathUtils.clamp(v.z, -iz, iz));
    const nrm = v.clone().sub(inner);
    if (nrm.lengthSq() > 1e-12) v.copy(inner).add(nrm.normalize().multiplyScalar(r));
    if (warp) warp(v);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return shadowed(new THREE.Mesh(g, mat));
}

/** Woven mesh fabric: colour map + alpha map (open weave lets some light through). */
function meshFabric() {
  const mk = (fill, line) => {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const g = c.getContext("2d");
    g.fillStyle = fill; g.fillRect(0, 0, 32, 32);
    g.strokeStyle = line; g.lineWidth = 5;
    g.beginPath();
    for (let i = -32; i <= 64; i += 16) { g.moveTo(i, 0); g.lineTo(i + 32, 32); g.moveTo(i + 32, 0); g.lineTo(i, 32); }
    g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(46, 40);
    t.anisotropy = 8;
    return t;
  };
  const map = mk("#060607", "#303238");
  map.colorSpace = THREE.SRGBColorSpace;
  return { map, alphaMap: mk("#b0b0b0", "#ffffff") };
}

export function build(k, d) {
  const g = new THREE.Group();
  const plastic = k.mat(0x16171a, { roughness: 0.5 });          // base, frame, shell (black nylon)
  const satin = k.mat(0x1d1e22, { roughness: 0.62 });
  const fabric = k.mat(0x111114, { roughness: 0.95 });          // seat upholstery
  const pad = k.mat(0x141518, { roughness: 0.8 });              // PU arm pads
  const metal = k.mat(0x2a2b30, { roughness: 0.35, metalness: 0.7 });
  const tyre = k.mat(0x6a6c72, { roughness: 0.45 });            // grey wheel rims seen on the casters
  const fab = meshFabric();
  const meshMat = k.mat(0xffffff, { ...fab, transparent: true, side: THREE.DoubleSide, roughness: 0.9, depthWrite: true });

  // ---------------- 5-star base ----------------
  const hubY = 0.098;
  g.add(shadowed(new THREE.Mesh(new THREE.LatheGeometry([
    [0, 0.064], [0.03, 0.064], [0.046, 0.07], [0.05, 0.085], [0.05, 0.118], [0.044, 0.126], [0.03, 0.128], [0, 0.128],
  ].map(([x, y]) => new THREE.Vector2(x, y)), 40), plastic)));
  const R_TIP = 0.3;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 10; // one leg pointing straight back
    const dir = V(Math.sin(a), 0, Math.cos(a));
    const P = (r, y) => dir.clone().multiplyScalar(r).setY(y);
    g.add(loft([
      { p: P(0.03, hubY + 0.006), rx: 0.028, ry: 0.026 },
      { p: P(0.06, hubY + 0.004), rx: 0.028, ry: 0.024 },
      { p: P(0.14, 0.094), rx: 0.025, ry: 0.019 },
      { p: P(0.23, 0.087), rx: 0.022, ry: 0.0155 },
      { p: P(0.285, 0.083), rx: 0.021, ry: 0.0145 },
      { p: P(0.302, 0.082), rx: 0.0195, ry: 0.0135 },
      { p: P(0.313, 0.0815), rx: 0.014, ry: 0.0105 },
      { p: P(0.319, 0.081), rx: 0.007, ry: 0.006 },
      { p: P(0.3205, 0.081), rx: 0.0006, ry: 0.0006 },
    ], plastic, { seg: 20, n: 2.6 }));
    // twin-wheel caster
    const c = new THREE.Group();
    c.add(at(cyl(0.006, 0.006, 0.02, metal, 10), 0, 0.068, 0));             // stem into the leg
    const hood = loft([
      { p: V(0, 0.032, 0.012), rx: 0.0005, ry: 0.0005 }, { p: V(0, 0.032, 0.009), rx: 0.017, ry: 0.018 },
      { p: V(0, 0.036, 0.0), rx: 0.021, ry: 0.03 }, { p: V(0, 0.034, -0.014), rx: 0.018, ry: 0.028 },
      { p: V(0, 0.032, -0.03), rx: 0.0005, ry: 0.0005 },
    ], plastic, { seg: 18, n: 2.2 });
    c.add(hood);
    for (const s of [-1, 1]) {
      const wheel = cyl(0.029, 0.029, 0.015, plastic, 28);
      wheel.rotation.z = Math.PI / 2;
      c.add(at(wheel, s * 0.02, 0.029, -0.014));
      const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0032, 8, 28), tyre));
      rim.rotation.y = Math.PI / 2;
      c.add(at(rim, s * 0.0277, 0.029, -0.014));
      const cap = cyl(0.015, 0.015, 0.002, satin, 20);
      cap.rotation.z = Math.PI / 2;
      c.add(at(cap, s * 0.0281, 0.029, -0.014));
    }
    c.position.copy(P(R_TIP, 0));
    c.rotation.y = a + 0.6 * Math.sin(i * 2.3);  // casters swivel a bit differently each
    g.add(c);
  }

  // ---------------- gas lift with telescoping shroud ----------------
  g.add(at(cyl(0.026, 0.029, 0.1, satin, 32), 0, 0.17, 0));
  g.add(at(cyl(0.023, 0.025, 0.08, satin, 32), 0, 0.255, 0));
  g.add(at(cyl(0.02, 0.023, 0.006, plastic, 32), 0, 0.297, 0));
  g.add(at(cyl(0.014, 0.014, 0.08, metal, 24), 0, 0.335, 0));               // chrome-black piston

  // ---------------- tilt mechanism + seat pan ----------------
  const SEAT_Y = 0.47;  // top of cushion at the front
  g.add(at(softBox(0.17, 0.045, 0.24, 0.012, satin, { sx: 6, sy: 3, sz: 6 }), 0, 0.392, 0.0));
  g.add(at(softBox(0.24, 0.012, 0.3, 0.005, plastic, { sx: 6, sy: 2, sz: 6 }), 0, 0.418, 0.0));
  // height lever (right) with paddle
  {
    const lever = loft([
      { p: V(0.08, 0.395, 0.06), rx: 0.004, ry: 0.004 }, { p: V(0.2, 0.395, 0.085), rx: 0.004, ry: 0.004 },
      { p: V(0.26, 0.392, 0.1), rx: 0.004, ry: 0.004 },
    ], plastic, { seg: 8 });
    g.add(lever);
    g.add(at(softBox(0.045, 0.012, 0.025, 0.005, plastic, { sx: 4, sy: 2, sz: 4 }), 0.275, 0.392, 0.105));
  }

  // seat shell (plastic) and cushion with waterfall front edge
  const seatW = 0.5, seatD = 0.47, seatZ = 0.02;
  const shapeSeat = (v, top) => {
    const zf = (v.z) / (seatD / 2);                         // -1 back .. +1 front
    v.x *= 1 - 0.07 * Math.max(0, -zf) - 0.1 * Math.pow(Math.abs(zf), 6); // narrower at the back, rounded corners
    if (v.y > 0 && top) {
      const xf = v.x / (seatW / 2);
      v.y -= 0.009 * (1 - xf * xf) * (1 - zf * zf);         // dished sitting area
      v.y += 0.008 * Math.pow(Math.abs(xf), 4);             // bolstered sides
    }
    const fall = Math.max(0, zf - 0.55) / 0.45;              // waterfall front
    v.y -= 0.03 * fall * fall * (v.y > -0.02 ? 1 : 0.4);
    v.y += 0.012 * Math.max(0, -zf);                         // back of the seat rises a little
  };
  const shell = softBox(seatW - 0.03, 0.03, seatD - 0.03, 0.012, plastic, { sx: 16, sy: 3, sz: 16, warp: (v) => shapeSeat(v, false) });
  g.add(at(shell, 0, 0.432, seatZ));
  const cushion = softBox(seatW, 0.08, seatD, 0.036, fabric, { sx: 34, sy: 8, sz: 32, warp: (v) => shapeSeat(v, true) });
  g.add(at(cushion, 0, SEAT_Y - 0.04, seatZ));

  // ---------------- backrest: mesh panel in a plastic frame ----------------
  const yb = 0.535, zb = -0.235, H = 0.46, tilt = 0.27;
  const hwAt = (t) => {                                     // half width along the height, rounded corners
    let base = 0.205 + 0.025 * Math.sin(Math.min(1, t / H) * Math.PI * 0.62);
    const Rt = 0.09, Rb = 0.05;
    if (t > H - Rt) base = base - Rt + Math.sqrt(Math.max(0, Rt * Rt - (t - (H - Rt)) ** 2));
    if (t < Rb) base = base - Rb + Math.sqrt(Math.max(0, Rb * Rb - (Rb - t) ** 2));
    return base;
  };
  const surf = (s, t) => {                                  // s across (m), t up the back (m)
    const lum = 0.03 * Math.sin(Math.PI * THREE.MathUtils.clamp((t - 0.03) / 0.3, 0, 1)); // lumbar bulge
    return V(s, yb + t * Math.cos(tilt), zb - t * Math.sin(tilt) + lum - 0.05 * (t / H) ** 2 + 0.45 * s * s);
  };
  {
    const NU = 30, NV = 34, pos = [], uv = [], idx = [];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const t = (j / NV) * H, s = (i / NU * 2 - 1) * hwAt(t);
      const p = surf(s, t);
      pos.push(p.x, p.y, p.z); uv.push(i / NU, j / NV);
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, e = c + 1;
      idx.push(a, b, c, b, e, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const panel = new THREE.Mesh(geo, meshMat);
    panel.receiveShadow = true;
    g.add(panel);
    // frame running round the perimeter
    const per = [];
    const M = 26;
    for (let j = 0; j <= M; j++) { const t = (j / M) * H; per.push(surf(hwAt(t), t)); }
    for (let i = 1; i < 16; i++) { const t = H; per.push(surf(hwAt(t) * (1 - (i / 16) * 2), t)); }
    for (let j = M; j >= 0; j--) { const t = (j / M) * H; per.push(surf(-hwAt(t), t)); }
    for (let i = 1; i < 10; i++) { per.push(surf(-hwAt(0) * (1 - (i / 10) * 2), 0)); }
    const nrm = V(0, Math.sin(tilt), Math.cos(tilt));
    g.add(loft(per.map((p) => { const t = (p.y - yb) / H; return { p, rx: 0.014 + 0.012 * Math.max(0, 1 - t / 0.35), ry: 0.015 }; }), plastic, { seg: 14, n: 2.6, ref: nrm, closed: true }));
    // lumbar support band on the front
    const lum = [];
    for (let i = 0; i <= 16; i++) { const s = (i / 16 * 2 - 1) * 0.19; lum.push(surf(s, 0.15).add(V(0, 0, 0.006))); }
    g.add(loft(lum.map((p, i) => ({ p, rx: 0.04 * (1 - Math.pow(Math.abs(i / 8 - 1), 6) * 0.5), ry: 0.0045 })), fabric, { seg: 14, n: 3, ref: nrm }));
    // side spines: from the frame's lower corners down and forward into the mechanism
    for (const s of [-1, 1]) {
      const c0 = surf(s * hwAt(0.06), 0.06);
      const spine = loft([
        { p: c0.clone().add(V(0, 0.02, 0.004)), rx: 0.012, ry: 0.016 },
        { p: V(s * 0.205, 0.5, zb + 0.005), rx: 0.014, ry: 0.02 },
        { p: V(s * 0.19, 0.44, zb + 0.035), rx: 0.016, ry: 0.022 },
        { p: V(s * 0.14, 0.41, zb + 0.09), rx: 0.017, ry: 0.016 },
        { p: V(s * 0.08, 0.405, -0.1), rx: 0.017, ry: 0.013 },
        { p: V(s * 0.05, 0.405, -0.06), rx: 0.015, ry: 0.012 },
      ], plastic, { seg: 16, n: 2.6, ref: V(1, 0, 0) });
      g.add(spine);
    }
  }

  // ---------------- armrests ----------------
  for (const s of [-1, 1]) {
    const x = s * 0.275;
    g.add(loft([
      { p: V(s * 0.06, 0.413, -0.06), rx: 0.026, ry: 0.009 },
      { p: V(s * 0.2, 0.413, -0.075), rx: 0.028, ry: 0.009 },
      { p: V(s * 0.262, 0.42, -0.085), rx: 0.028, ry: 0.011 },
      { p: V(x, 0.455, -0.085), rx: 0.026, ry: 0.013 },
      { p: V(x, 0.55, -0.06), rx: 0.023, ry: 0.013 },
      { p: V(x, 0.63, -0.035), rx: 0.021, ry: 0.012 },
      { p: V(x, 0.648, -0.03), rx: 0.021, ry: 0.012 },
    ], plastic, { seg: 16, n: 2.8, ref: V(1, 0, 0) }));
    g.add(at(softBox(0.045, 0.02, 0.11, 0.007, satin, { sx: 4, sy: 2, sz: 6 }), x, 0.65, -0.02));
    g.add(at(softBox(0.095, 0.03, 0.25, 0.013, pad, { sx: 8, sy: 4, sz: 14, warp: (v) => { if (v.y > 0) v.y -= 0.005 * (v.z / 0.125) ** 2; } }), x, 0.672, 0.0));
  }
  return g;
}
