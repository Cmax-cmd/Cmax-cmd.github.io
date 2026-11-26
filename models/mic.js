// mic model: FIFINE AmpliGame AM8 (black) hanging upside down from a desk-clamped boom arm.
// Origin = the arm's clamp on the desk's back edge (y = 0 = desk top). Units: metres, +z = towards the user.
import { THREE, RoundedBoxGeometry, rainbowMat, glow, shadowed, cyl, at } from "../lib.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * Loft a smooth tube through `secs` ({ p: Vector3, rx, ry, ref? }) with a superellipse cross-section
 * (n = 2 ellipse, larger = squarer). `ref` fixes the section's roll (must not be parallel to the path):
 * rx lies along (tangent x ref), ry along the remaining axis.
 * Ends are closed with a fan, so give the first / last section a tiny radius for a rounded cap.
 */
function loft(secs, mat, { seg = 32, n = 2, ref = V(0, 0, 1), closed = true } = {}) {
  const pos = [], uv = [], idx = [];
  const e = 2 / n;
  const sp = (c) => Math.sign(c) * Math.pow(Math.abs(c), e);
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    const a = secs[Math.max(0, i - 1)].p, b = secs[Math.min(secs.length - 1, i + 1)].p;
    const T = V(0, 0, 0).subVectors(b, a).normalize();
    const side = V(0, 0, 0).crossVectors(T, s.ref ?? ref).normalize();
    const up = V(0, 0, 0).crossVectors(side, T).normalize();
    for (let j = 0; j <= seg; j++) {
      const t = (j / seg) * Math.PI * 2;
      const cx = sp(Math.cos(t)) * s.rx, cy = sp(Math.sin(t)) * s.ry;
      pos.push(s.p.x + side.x * cx + up.x * cy, s.p.y + side.y * cx + up.y * cy, s.p.z + side.z * cx + up.z * cy);
      uv.push(j / seg, i / (secs.length - 1));
    }
  }
  const R = seg + 1;
  for (let i = 0; i < secs.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * R + j, b = a + 1, c = a + R, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  if (closed) {
    for (const [ring, first] of [[0, true], [secs.length - 1, false]]) {
      const p = secs[ring].p, ci = pos.length / 3;
      pos.push(p.x, p.y, p.z); uv.push(0.5, first ? 0 : 1);
      for (let j = 0; j < seg; j++) {
        const a = ring * R + j, b = a + 1;
        first ? idx.push(ci, a, b) : idx.push(ci, b, a);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return shadowed(new THREE.Mesh(g, mat));
}

/** Rounded square bar between two points (the arm's steel tubes). Width w is along local x. */
function bar(a, b, w, h, mat, r = 0.0022) {
  const dir = V(0, 0, 0).subVectors(b, a);
  const m = shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, dir.length(), h, 2, r), mat));
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
  return m;
}

/** Thin round rod between two points. */
function rodBetween(a, b, r, mat, seg = 8) {
  const dir = V(0, 0, 0).subVectors(b, a);
  const m = cyl(r, r, dir.length(), mat, seg);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), dir.normalize());
  return m;
}

/** Coil spring between two points. */
function spring(a, b, r, wire, turns, mat) {
  const dir = V(0, 0, 0).subVectors(b, a), len = dir.length();
  dir.normalize();
  const s1 = Math.abs(dir.x) < 0.9 ? V(1, 0, 0) : V(0, 1, 0);
  const u = V(0, 0, 0).crossVectors(dir, s1).normalize(), w = V(0, 0, 0).crossVectors(dir, u);
  const curve = new THREE.Curve();
  curve.getPoint = (t, out = V(0, 0, 0)) => {
    const ang = t * turns * Math.PI * 2;
    return out.copy(a).addScaledVector(dir, t * len).addScaledVector(u, Math.cos(ang) * r).addScaledVector(w, Math.sin(ang) * r);
  };
  return shadowed(new THREE.Mesh(new THREE.TubeGeometry(curve, turns * 10, wire, 5, false), mat));
}

/** Cylinder whose axis is the local x axis (axles, side knobs). */
function xcyl(r, len, mat, seg = 24) {
  const m = cyl(r, r, len, mat, seg);
  m.rotation.z = Math.PI / 2;
  return m;
}

/** Knurled knob, axis = y. */
function knob(r, h, mat, ridges = 24) {
  const geo = new THREE.CylinderGeometry(r, r, h, ridges * 4, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const rr = Math.hypot(x, z);
    if (rr < 1e-6) continue;
    const a = Math.atan2(z, x);
    const k = 1 - 0.05 * Math.max(0, Math.cos(a * ridges)) ** 2;      // grooves
    const bevel = Math.abs(y) > h * 0.49 ? 0.93 : 1;
    p.setX(i, x * k * bevel); p.setZ(i, z * k * bevel);
  }
  geo.computeVertexNormals();
  return shadowed(new THREE.Mesh(geo, mat));
}

/** Open-cell foam: grey noise used as bump + roughness map. */
function foamTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#808080";
  g.fillRect(0, 0, 128, 128);
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 1600; i++) {
    const v = Math.floor(rnd() * 255);
    g.fillStyle = `rgba(${v},${v},${v},0.6)`;
    g.beginPath();
    g.arc(rnd() * 128, rnd() * 128, 0.8 + rnd() * 2, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 2);
  return t;
}

/** The AM8 itself, hanging upside down. Local y = 0 is the yoke bridge, the mic points down (-y), front = +z. */
function buildMic(k) {
  const m = new THREE.Group();
  const shell = k.mat(0x18191d, { roughness: 0.6, metalness: 0.05 });         // matte black plastic body
  const satin = k.mat(0x0b0c0e, { roughness: 0.25, metalness: 0.1 });         // glossy touch-mute panel
  const metal = k.mat(0x1b1c20, { roughness: 0.38, metalness: 0.7 });         // yoke, knobs
  const grille = k.mat(0x202125, { roughness: 0.45, metalness: 0.7 });
  const ft = foamTexture();
  const foam = k.mat(0x0d0d0f, { roughness: 1, bumpMap: ft, bumpScale: 2.5, roughnessMap: ft });

  const Y0 = -0.0075;                    // top (base end) of the body, just under the yoke bridge
  const W = 0.0275, D = 0.025;           // half width / half depth: 55 x 50 mm
  const sq = { seg: 48, n: 5.5 };        // squarer superellipse: the AM8 is a rounded rectangle, not a tube
  // vertical sections listed top-to-bottom: rx = half width (x), ry = half depth (z)
  const ring = (y, rx, ry) => ({ p: V(0, y, 0), rx, ry });

  // --- body: base end (top) with a soft rounded cap, straight walls down to the head
  const HB = 0.072;                      // body length (base end -> head joint)
  m.add(loft([
    ring(Y0, 0.004, 0.004), ring(Y0 - 0.0006, 0.017, 0.016), ring(Y0 - 0.002, 0.0235, 0.0225),
    ring(Y0 - 0.005, W, D), ring(Y0 - HB + 0.004, W, D), ring(Y0 - HB + 0.002, W * 0.99, D * 0.99), ring(Y0 - HB, 0.0005, 0.0005),
  ], shell, sq));
  // RGB light band (frosted ring) near the base end
  m.add(loft([ring(Y0 - 0.008, W + 0.0005, D + 0.0005), ring(Y0 - 0.0125, W + 0.0005, D + 0.0005)], rainbowMat, { ...sq, closed: false }));
  for (const yy of [Y0 - 0.0075, Y0 - 0.013]) {
    m.add(loft([ring(yy + 0.0005, W + 0.0008, D + 0.0008), ring(yy - 0.0005, W + 0.0008, D + 0.0008)], metal, { ...sq, closed: false }));
  }

  // --- head: metal collar, then the foam windscreen over the capsule cage, tapering towards the tip
  m.add(loft([ring(Y0 - HB + 0.006, W + 0.0012, D + 0.0012), ring(Y0 - HB - 0.004, W + 0.0012, D + 0.0012)], grille, { ...sq, closed: false }));
  m.add(loft([
    ring(Y0 - HB - 0.002, W + 0.001, D + 0.001), ring(Y0 - HB - 0.005, W + 0.0028, D + 0.0028), ring(Y0 - HB - 0.016, W + 0.003, D + 0.003),
    // straight sides almost to the end, then a flat end with ~6 mm rounded edges (boxy, like the real windscreen)
    ring(Y0 - HB - 0.062, W + 0.003, D + 0.003), ring(Y0 - HB - 0.0675, W + 0.0018, D + 0.0018), ring(Y0 - HB - 0.0710, W - 0.0012, D - 0.0012),
    ring(Y0 - HB - 0.0732, W - 0.0055, D - 0.0055), ring(Y0 - HB - 0.0742, W - 0.011, D - 0.011), ring(Y0 - HB - 0.0745, 0.003, 0.003),
  ], foam, { seg: 48, n: 5 }));

  // --- front: touch-mute pad with the red LED (muted, like on the desk photo)
  const ledRing = new THREE.Mesh(new THREE.CircleGeometry(0.0034, 24), satin);
  m.add(at(ledRing, 0, Y0 - 0.034, D + 0.0003));
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.0019, 14, 10), glow(0xff1f1f, 2.6));
  led.scale.set(0.85, 1.15, 0.4);
  m.add(at(led, 0, Y0 - 0.034, D + 0.0004));

  // --- back: gain knob (nearer the head) and headphone volume knob, plus USB-C / 3.5 mm ports at the base end
  const tickMat = k.mat(0x9a9ca3, { roughness: 0.4 });
  for (const [yy, r] of [[Y0 - 0.055, 0.0085], [Y0 - 0.034, 0.0075]]) {
    const kn = knob(r, 0.006, metal, 20);
    kn.rotation.x = Math.PI / 2;
    m.add(at(kn, 0, yy, -D - 0.0025));
    m.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.001, r * 0.7, 0.0008), tickMat), 0, yy - r * 0.45, -D - 0.0056));
  }
  const portMat = k.mat(0x050505, { roughness: 0.9 });
  m.add(at(new THREE.Mesh(new RoundedBoxGeometry(0.009, 0.0032, 0.002, 2, 0.0012), portMat), -0.007, Y0 - 0.017, -D - 0.0003));
  const jack = new THREE.Mesh(new THREE.CircleGeometry(0.0018, 16), portMat);
  jack.rotation.y = Math.PI;
  m.add(at(jack, 0.007, Y0 - 0.017, -D - 0.0011));

  // --- U-yoke: flat steel strap over the base end, down to the side knobs at the body / head joint
  const KY = Y0 - HB + 0.004, X = W + 0.0042, RR = 0.011;
  const pts = [];
  const strap = (x, y, rx = 0.0024, ry = 0.0125) => pts.push({ p: V(x, y, 0), rx, ry });
  strap(-X, KY - 0.0115, 0.0005, 0.001);
  strap(-X, KY - 0.0095, 0.0018, 0.0065);
  for (let i = 0; i <= 8; i++) strap(-X, KY - 0.006 + ((-RR - KY + 0.006) * i) / 8);
  for (let i = 1; i < 8; i++) { const a = Math.PI - (i / 8) * (Math.PI / 2); strap(-X + RR + Math.cos(a) * RR, -RR + Math.sin(a) * RR); }
  for (let i = 0; i <= 6; i++) strap(-X + RR + ((2 * (X - RR)) * i) / 6, 0);
  for (let i = 1; i < 8; i++) { const a = Math.PI / 2 - (i / 8) * (Math.PI / 2); strap(X - RR + Math.cos(a) * RR, -RR + Math.sin(a) * RR); }
  for (let i = 0; i <= 8; i++) strap(X, -RR + ((KY - 0.006 + RR) * i) / 8);
  strap(X, KY - 0.0095, 0.0018, 0.0065);
  strap(X, KY - 0.0115, 0.0005, 0.001);
  m.add(loft(pts, metal, { seg: 16, n: 4 }));
  // big side lock knobs
  for (const sx of [-1, 1]) {
    const kn = knob(0.0105, 0.009, metal, 16);
    kn.rotation.z = Math.PI / 2;
    m.add(at(kn, sx * (X + 0.0068), KY, 0));
    m.add(at(xcyl(0.0042, 0.004, metal, 16), sx * (X + 0.0012), KY, 0));
  }
  // threaded mount on top of the yoke bridge
  m.add(at(cyl(0.0105, 0.0115, 0.008, metal, 32), 0, 0.006, 0));
  return m;
}

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  // dev aid for preview.html: ?part=head shows the microphone alone
  if (typeof location !== "undefined" && new URLSearchParams(location.search).get("part") === "head") {
    g.add(at(buildMic(k), 0, 0.2, 0));
    return g;
  }
  const steel = k.mat(0x131417, { metalness: 0.55, roughness: 0.42 });
  const joint = k.mat(0x0f1012, { metalness: 0.35, roughness: 0.5 });
  const springMat = k.mat(0x2a2c31, { metalness: 0.9, roughness: 0.3 });
  const rubber = k.mat(0x0a0a0b, { roughness: 0.9 });

  // Mic target (local): in front of the right side of the monitor, behind the mousepad.
  const TIP = V(-0.2, 0, 0.3);
  const yaw = Math.atan2(TIP.x, TIP.z);
  const reach = Math.hypot(TIP.x, TIP.z);

  // --- desk clamp around the back edge (the desk occupies z > 0, y < 0)
  const rb = (w, h, dd, r = 0.003) => shadowed(new THREE.Mesh(new RoundedBoxGeometry(w, h, dd, 2, r), joint));
  g.add(at(rb(0.05, 0.012, 0.07), 0, 0.006, 0.013));
  g.add(at(rb(0.05, 0.085, 0.012), 0, -0.03, -0.028));
  g.add(at(rb(0.05, 0.01, 0.06), 0, -0.068, 0.0));
  g.add(at(cyl(0.004, 0.004, 0.04, springMat, 12), 0, -0.07, 0.012));
  g.add(at(knob(0.013, 0.008, rubber, 12), 0, -0.092, 0.012));
  g.add(at(cyl(0.018, 0.018, 0.003, rubber, 32), 0, -0.051, 0.012));        // pressure pad under the desk

  // --- arm in its own vertical plane: local z = reach direction, local x = across the arm
  const a = new THREE.Group();
  a.rotation.y = yaw;
  g.add(a);
  a.add(at(cyl(0.017, 0.019, 0.03, joint, 32), 0, 0.027, 0));              // swivel base
  a.add(at(cyl(0.012, 0.012, 0.02, steel, 24), 0, 0.05, 0));               // riser
  const P0 = V(0, 0.08, 0.004), P1 = V(0, 0.405, 0.11), P2 = V(0, 0.468, reach);
  for (const sx of [-1, 1]) a.add(at(shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.004, 0.04, 0.03, 2, 0.0015), joint)), sx * 0.017, 0.072, 0.002));
  a.add(at(xcyl(0.008, 0.044, joint), P0.x, P0.y, P0.z));
  const tk = knob(0.011, 0.01, rubber, 14);                                 // tension knob
  tk.rotation.z = Math.PI / 2;
  a.add(at(tk, 0.027, P0.y, P0.z));

  // lower arm: two parallel square tubes + spring underneath
  const dirL = V(0, 0, 0).subVectors(P1, P0).normalize();
  const nL = V(0, -dirL.z, dirL.y);                                         // in-plane normal, pointing forward / down
  for (const sx of [-1, 1]) a.add(bar(P0.clone().add(V(sx * 0.011, 0, 0)), P1.clone().add(V(sx * 0.011, 0, 0)), 0.006, 0.011, steel));
  const sL0 = P0.clone().addScaledVector(dirL, 0.05).addScaledVector(nL, 0.012), sL1 = P0.clone().addScaledVector(dirL, 0.26).addScaledVector(nL, 0.012);
  a.add(spring(sL0, sL1, 0.0045, 0.0007, 28, springMat));
  a.add(rodBetween(P0.clone().addScaledVector(dirL, 0.035), sL0, 0.0012, springMat));
  a.add(rodBetween(sL1, P0.clone().addScaledVector(dirL, 0.28), 0.0012, springMat));

  // elbow
  a.add(at(xcyl(0.011, 0.034, joint, 28), P1.x, P1.y, P1.z));
  for (const sx of [-1, 1]) a.add(at(xcyl(0.0125, 0.004, steel, 28), sx * 0.018, P1.y, P1.z));
  const ek = knob(0.01, 0.008, rubber, 12);
  ek.rotation.z = Math.PI / 2;
  a.add(at(ek, -0.025, P1.y, P1.z));

  // forearm: two tubes + spring underneath
  const dirU = V(0, 0, 0).subVectors(P2, P1).normalize();
  const nU = V(0, -dirU.z, dirU.y);                                         // in-plane normal, pointing down
  for (const sx of [-1, 1]) a.add(bar(P1.clone().add(V(sx * 0.009, 0, 0)), P2.clone().add(V(sx * 0.009, 0, 0)), 0.005, 0.01, steel));
  const sU0 = P1.clone().addScaledVector(dirU, 0.045).addScaledVector(nU, 0.011), sU1 = P1.clone().addScaledVector(dirU, 0.19).addScaledVector(nU, 0.011);
  a.add(spring(sU0, sU1, 0.004, 0.0007, 22, springMat));
  a.add(rodBetween(P1.clone().addScaledVector(dirU, 0.03), sU0, 0.0011, springMat));
  a.add(rodBetween(sU1, P1.clone().addScaledVector(dirU, 0.205), 0.0011, springMat));

  // end joint + swivel stem dropping to the mic's yoke
  a.add(at(xcyl(0.009, 0.03, joint), P2.x, P2.y, P2.z));
  for (const sx of [-1, 1]) a.add(at(shadowed(new THREE.Mesh(new RoundedBoxGeometry(0.003, 0.03, 0.022, 2, 0.001), joint)), sx * 0.0135, P2.y - 0.01, P2.z));
  a.add(at(cyl(0.0075, 0.0075, 0.03, joint, 24), P2.x, P2.y - 0.026, P2.z));
  a.add(at(cyl(0.0095, 0.0095, 0.008, steel, 24), P2.x, P2.y - 0.044, P2.z)); // 5/8" adapter

  // --- mic
  const mic = buildMic(k);
  mic.position.set(TIP.x, P2.y - 0.058, TIP.z);
  mic.rotation.y = -0.4;
  g.add(mic);

  // --- USB cable: out of the mic's base, loosely along the arm, down to the clamp
  const toG = (p) => p.clone().applyAxisAngle(V(0, 1, 0), yaw);
  const cablePts = [
    V(TIP.x + 0.008, P2.y - 0.075, TIP.z - 0.024), V(TIP.x + 0.012, P2.y - 0.07, TIP.z - 0.045),
    toG(P2.clone().add(V(0.016, -0.04, -0.06))), toG(P1.clone().addScaledVector(dirU, 0.12).add(V(0.016, -0.03, 0))),
    toG(P1.clone().add(V(0.02, -0.02, 0.01))), toG(P0.clone().addScaledVector(dirL, 0.16).add(V(0.02, 0, 0.03))),
    toG(V(0.02, 0.06, -0.02)), V(0.012, 0.02, -0.04), V(0.01, -0.03, -0.05),
  ];
  g.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 120, 0.0019, 6, false), rubber)));
  return g;
}
