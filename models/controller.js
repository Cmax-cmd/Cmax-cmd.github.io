// controller model: Sony DualSense, Midnight Black, lying flat on the desk (buttons up).
// Origin = bottom centre on the desk top (y = 0). Units: metres. +z = towards the user (grips), -z = triggers.
import { THREE, glow, shadowed, cyl, at } from "../lib.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Smooth tube through sections { p, rx, ry } with a superellipse cross-section; ends closed by fans. */
function loft(secs, mat, { seg = 40, n = 2, ref = V(0, 1, 0) } = {}) {
  const pos = [], idx = [];
  const e = 2 / n, sp = (c) => Math.sign(c) * Math.pow(Math.abs(c), e);
  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    const a = secs[Math.max(0, i - 1)].p, b = secs[Math.min(secs.length - 1, i + 1)].p;
    const T = V(0, 0, 0).subVectors(b, a).normalize();
    const side = V(0, 0, 0).crossVectors(T, ref).normalize();
    const up = V(0, 0, 0).crossVectors(side, T).normalize();
    for (let j = 0; j <= seg; j++) {
      const t = (j / seg) * Math.PI * 2;
      const cx = sp(Math.cos(t)) * s.rx, cy = sp(Math.sin(t)) * s.ry;
      pos.push(s.p.x + side.x * cx + up.x * cy, s.p.y + side.y * cx + up.y * cy, s.p.z + side.z * cx + up.z * cy);
    }
  }
  const R = seg + 1;
  for (let i = 0; i < secs.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * R + j, b = a + 1, c = a + R, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  for (const [ring, first] of [[0, true], [secs.length - 1, false]]) {
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

/** Shape from top-view points [x, z] (smooth spline), extruded upwards from y0 by h with rounded edges. */
function slab(pts, y0, h, bevel, mat, { mirror = false, closed = true } = {}) {
  let p = pts.map(([x, z]) => new THREE.Vector2(x, -z));
  // mirror: pts run from a point on x = 0 round the right half to another point on x = 0
  if (mirror) p = p.concat(pts.slice(1, -1).reverse().map(([x, z]) => new THREE.Vector2(-x, -z)));
  const shape = new THREE.Shape();
  shape.moveTo(p[0].x, p[0].y);
  shape.splineThru(p.slice(1).concat(closed ? [p[0]] : []));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.0001, h - 2 * bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9,
    bevelOffset: -bevel * 0.9, bevelSegments: 5, curveSegments: 10,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, y0 + bevel, 0);
  geo.computeVertexNormals();
  return shadowed(new THREE.Mesh(geo, mat));
}

/** Symbol decal for a face button (PlayStation shapes, drawn as thin outlines). */
function symbolTexture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#16171b";
  g.fillRect(0, 0, 128, 128);
  g.strokeStyle = "#9a9ea8";
  g.lineWidth = 8;
  g.lineCap = "round"; g.lineJoin = "round";
  g.beginPath();
  if (kind === "triangle") { g.moveTo(64, 34); g.lineTo(94, 88); g.lineTo(34, 88); g.closePath(); }
  else if (kind === "circle") g.arc(64, 64, 28, 0, Math.PI * 2);
  else if (kind === "cross") { g.moveTo(40, 40); g.lineTo(88, 88); g.moveTo(88, 40); g.lineTo(40, 88); }
  else g.rect(38, 38, 52, 52);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  const wingMat = k.mat(0x111215, { roughness: 0.62 });                    // black cover plates + grips
  const coreMat = k.mat(0x1d1e23, { roughness: 0.55 });                    // dark grey centre / underside
  const padMat = k.mat(0x0f1013, { roughness: 0.75 });                     // touchpad (satin)
  const greyMat = k.mat(0x30323a, { roughness: 0.6 });                     // sticks, bumpers, triggers
  const btnMat = k.mat(0x1a1b20, { roughness: 0.3 });
  const darkMat = k.mat(0x060607, { roughness: 0.9 });

  const Y0 = 0.016, TOP = 0.044;           // body underside / top surface (lying flat it rests on grips + triggers)

  // ---- centre core (between the cover plates), dark grey, carries touchpad, sticks, PS + mute buttons
  const seam = [[0.0305, -0.0415], [0.031, -0.03], [0.0325, -0.019], [0.037, -0.009], [0.045, -0.002], [0.057, 0.003], [0.072, 0.004]];
  const coreOutline = seam.concat([[0.068, 0.011], [0.054, 0.019], [0.038, 0.0245], [0.018, 0.0275], [0, 0.028]]);
  // build as one symmetric outline: right half from front centre, then mirrored back
  const coreRight = [[0, -0.0432], [0.016, -0.0428]].concat(coreOutline);
  const core = slab(coreRight, Y0, TOP - Y0, 0.0105, coreMat, { mirror: true });
  {
    // the underside arches up between the grips (lowest at the sides, highest in the middle)
    const p = core.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      if (y > Y0 + 0.012) continue;
      const x = p.getX(i), w = 1 - Math.min(1, (y - Y0) / 0.012);
      p.setY(i, y + w * (0.007 * Math.max(0, 1 - (x / 0.06) ** 2) - 0.004));
    }
    core.geometry.computeVertexNormals();
  }
  g.add(core);

  // ---- the two cover plates ("wings") over the D-pad / face-button areas, slightly proud of the core
  const wing = seam.slice().reverse().concat([[0.039, -0.0435], [0.053, -0.0448], [0.069, -0.042], [0.078, -0.032], [0.0795, -0.018], [0.077, -0.004]]);
  for (const s of [-1, 1]) {
    const w = slab(wing, TOP - 0.0135, 0.014, 0.0065, wingMat);
    w.scale.x = s;
    g.add(w);
  }

  // ---- grips: long rounded horns that droop to the desk towards the user
  for (const s of [-1, 1]) {
    const S = (x, y, z, rx, ry) => ({ p: V(s * x, y, z), rx, ry });
    const grip = loft([
      S(0.054, 0.027, -0.0445, 0.001, 0.001), S(0.054, 0.027, -0.0438, 0.012, 0.009),
      S(0.0545, 0.027, -0.041, 0.019, 0.0145), S(0.0555, 0.027, -0.034, 0.0235, 0.0175),
      S(0.0565, 0.0272, -0.018, 0.0232, 0.0175), S(0.0595, 0.0258, 0.0, 0.0212, 0.0168),
      S(0.0635, 0.0218, 0.0152, 0.0188, 0.0152), S(0.0665, 0.0172, 0.0285, 0.0164, 0.0133),
      S(0.0678, 0.0135, 0.0399, 0.0142, 0.0115), S(0.0675, 0.0115, 0.047, 0.0122, 0.0098),
      S(0.0665, 0.0108, 0.0511, 0.0098, 0.008), S(0.0652, 0.0106, 0.0534, 0.0064, 0.0054),
      S(0.0644, 0.0106, 0.0543, 0.0028, 0.0024), S(0.0641, 0.0106, 0.0545, 0.0005, 0.0005),
    ], wingMat, { seg: 40, n: 2.4 });
    g.add(grip);
  }

  // ---- touchpad + light bar
  const pad = slab([[0, -0.0435], [0.016, -0.0431], [0.0292, -0.0418], [0.0296, -0.03], [0.0285, -0.0175], [0.023, -0.0128], [0.0, -0.0118]], TOP - 0.004, 0.0052, 0.0016, padMat, { mirror: true });
  g.add(pad);
  const lightMat = glow(0x1d4bff, 1.35);
  for (const s of [-1, 1]) {
    const pts = [[0.0303, -0.0418], [0.0307, -0.032], [0.0316, -0.022], [0.0336, -0.0145], [0.037, -0.0095]];
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => V(s * x, TOP + 0.0003, z)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0008, 6, false), lightMat));
  }

  // ---- PS button, mic mute button, speaker holes
  const ps = cyl(0.0052, 0.0055, 0.002, btnMat, 32);
  g.add(at(ps, 0, TOP + 0.0008, 0.0135));
  {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const cx = c.getContext("2d");
    cx.fillStyle = "#1a1b20";
    cx.fillRect(0, 0, 128, 128);
    cx.fillStyle = "#7d818b";
    cx.font = "italic 800 62px system-ui, sans-serif";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText("PS", 64, 68);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const logo = new THREE.Mesh(new THREE.CircleGeometry(0.0051, 32), k.mat(0xffffff, { map: t, roughness: 0.35 }));
    logo.rotation.x = -Math.PI / 2;
    g.add(at(logo, 0, TOP + 0.00185, 0.0135));
  }
  const mute = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.0016, 0.0062, 4, 10), btnMat));
  mute.rotation.z = Math.PI / 2;
  g.add(at(mute, 0, TOP + 0.0004, 0.0215));
  for (let i = -2; i <= 2; i++) {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.0007, 10), darkMat);
    hole.rotation.x = -Math.PI / 2;
    g.add(at(hole, i * 0.0028, TOP + 0.0002, -0.0035));
  }

  // ---- create / options buttons at the touchpad's front corners
  for (const s of [-1, 1]) {
    const b = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.0015, 0.005, 4, 8), btnMat));
    b.rotation.x = Math.PI / 2;
    b.rotation.z = s * 0.35;
    g.add(at(b, s * 0.0365, TOP + 0.0012, -0.037));
  }

  // ---- analog sticks
  const capGeo = new THREE.LatheGeometry([
    V(0, 0.0045, 0), V(0.005, 0.0052, 0), V(0.0078, 0.0062, 0), V(0.0089, 0.0058, 0),
    V(0.0091, 0.0045, 0), V(0.0086, 0.002, 0), V(0.006, 0, 0), V(0, 0, 0),
  ].map((v) => new THREE.Vector2(v.x, v.y)), 40);
  for (const s of [-1, 1]) {
    const x = s * 0.026, z = 0.012;
    g.add(at(cyl(0.0108, 0.0108, 0.0012, darkMat, 36), x, TOP + 0.0001, z));     // well
    g.add(at(cyl(0.0085, 0.0095, 0.0035, greyMat, 36), x, TOP + 0.0015, z));    // dome collar
    g.add(at(cyl(0.004, 0.004, 0.009, greyMat, 16), x, TOP + 0.0065, z));       // shaft
    const cap = shadowed(new THREE.Mesh(capGeo, greyMat));
    g.add(at(cap, x, TOP + 0.0105, z));
  }

  // ---- D-pad (left): four arrow keys pointing outwards
  const arrow = new THREE.Shape();
  arrow.moveTo(-0.0032, 0.0085); arrow.lineTo(0.0032, 0.0085); arrow.lineTo(0.0032, 0.0028); arrow.lineTo(0, 0); arrow.lineTo(-0.0032, 0.0028); arrow.closePath();
  const arrowGeo = new THREE.ExtrudeGeometry(arrow, { depth: 0.0018, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0005, bevelSegments: 2 });
  arrowGeo.rotateX(-Math.PI / 2);
  const dc = V(-0.052, TOP + 0.0006, -0.019);
  for (let i = 0; i < 4; i++) {
    const m = shadowed(new THREE.Mesh(arrowGeo, btnMat));
    m.position.copy(dc);
    m.rotation.y = (i * Math.PI) / 2;
    m.translateZ(-0.0015);
    g.add(m);
  }

  // ---- face buttons (right)
  const fc = V(0.052, TOP, -0.019);
  const btnGeo = new THREE.LatheGeometry([new THREE.Vector2(0, 0.0034), new THREE.Vector2(0.0038, 0.0032), new THREE.Vector2(0.0047, 0.0026), new THREE.Vector2(0.005, 0.0012), new THREE.Vector2(0.005, 0)], 32);
  for (const [kind, dx, dz] of [["triangle", 0, -0.0125], ["circle", 0.0125, 0], ["cross", 0, 0.0125], ["square", -0.0125, 0]]) {
    g.add(at(shadowed(new THREE.Mesh(btnGeo, btnMat)), fc.x + dx, fc.y, fc.z + dz));
    const decal = new THREE.Mesh(new THREE.CircleGeometry(0.0038, 24), k.mat(0xffffff, { map: symbolTexture(kind), roughness: 0.3 }));
    decal.rotation.x = -Math.PI / 2;
    g.add(at(decal, fc.x + dx, fc.y + 0.00345, fc.z + dz));
  }

  // ---- shoulder buttons: L1/R1 bumpers and the long L2/R2 triggers curling down to the desk
  for (const s of [-1, 1]) {
    const bump = loft([
      { p: V(s * 0.037, 0.034, -0.043), rx: 0.0005, ry: 0.0005 }, { p: V(s * 0.038, 0.034, -0.0425), rx: 0.0045, ry: 0.004 },
      { p: V(s * 0.052, 0.035, -0.045), rx: 0.0055, ry: 0.0048 }, { p: V(s * 0.066, 0.034, -0.043), rx: 0.0045, ry: 0.004 },
      { p: V(s * 0.067, 0.034, -0.044), rx: 0.0005, ry: 0.0005 },
    ], greyMat, { seg: 20, n: 3, ref: V(0, 1, 0) });
    g.add(bump);
    const trig = loft([
      { p: V(s * 0.052, 0.027, -0.0405), rx: 0.001, ry: 0.001 }, { p: V(s * 0.052, 0.027, -0.041), rx: 0.004, ry: 0.011 },
      { p: V(s * 0.052, 0.024, -0.0435), rx: 0.0045, ry: 0.0125 }, { p: V(s * 0.052, 0.016, -0.045), rx: 0.0045, ry: 0.0125 },
      { p: V(s * 0.052, 0.008, -0.0443), rx: 0.0042, ry: 0.0115 }, { p: V(s * 0.052, 0.0035, -0.0423), rx: 0.0035, ry: 0.0095 },
      { p: V(s * 0.052, 0.0032, -0.0411), rx: 0.001, ry: 0.001 },
    ], greyMat, { seg: 24, n: 3, ref: V(1, 0, 0) });
    g.add(trig);
  }

  // ---- USB-C port on the front face
  const port = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.0013, 0.006, 4, 8), darkMat));
  port.rotation.z = Math.PI / 2;
  g.add(at(port, 0, 0.033, -0.0416));
  // embossed SONY logo under the port
  const c = document.createElement("canvas");
  c.width = 256; c.height = 64;
  const cx = c.getContext("2d");
  cx.fillStyle = "#3a3c43";
  cx.font = "600 44px Georgia, 'Times New Roman', serif";
  cx.textAlign = "center"; cx.textBaseline = "middle";
  cx.fillText("S O N Y", 128, 34);
  const sonyTex = new THREE.CanvasTexture(c);
  sonyTex.colorSpace = THREE.SRGBColorSpace;
  const sony = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.003), new THREE.MeshStandardMaterial({ map: sonyTex, transparent: true, roughness: 0.6 }));
  sony.rotation.y = Math.PI;
  g.add(at(sony, 0, 0.0265, -0.0417));
  g.scale.x = 160 / 165; // real DualSense is 160 mm wide
  return g;
}
