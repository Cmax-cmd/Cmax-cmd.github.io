// pedals model: MOZA SR-P Lite two-pedal set (brake + throttle) on its perforated heel plate, lying on the floor.
// The heel plate is towards the driver (+z); the pedal faces lean away from the driver (-z).
// Origin = floor centre under the set (y = 0). Units: metres.
import { THREE, shadowed, cyl, at } from "../lib.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Flat outline [a, b] extruded by depth (with a small rounded edge); holes: arrays of [a, b]. */
function sheet(pts, depth, bevel, mat, { holes = [], curve = 8 } = {}) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (const q of pts.slice(1)) shape.lineTo(q[0], q[1]);
  shape.closePath();
  for (const h of holes) {
    const path = new THREE.Path();
    if (h.r) path.absarc(h.c[0], h.c[1], h.r, 0, Math.PI * 2, true);
    else { path.moveTo(h[0][0], h[0][1]); for (const q of h.slice(1)) path.lineTo(q[0], q[1]); path.closePath(); }
    shape.holes.push(path);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.0001, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8,
    bevelOffset: -bevel * 0.8, bevelSegments: 2, curveSegments: curve,
  });
  geo.translate(0, 0, bevel);
  geo.computeVertexNormals();
  return shadowed(new THREE.Mesh(geo, mat));
}

/** Side-profile part: outline in (z, y), extruded across x from x0 by thickness t. */
function profile(pts, x0, t, mat, holes = []) {
  const m = sheet(pts.map(([z, y]) => [-z, y]), t, Math.min(0.0008, t / 4), mat, { holes: holes.map((h) => h.map(([z, y]) => [-z, y])) });
  m.rotation.y = Math.PI / 2;         // shape X (= -z) -> world -z ... extrusion -> +x
  m.position.x = x0;
  return m;
}

/** Plan-view part: outline in (x, z), extruded upwards from y0 by t. */
function planPart(pts, y0, t, bevel, mat, holes = []) {
  const m = sheet(pts.map(([x, z]) => [x, -z]), t, bevel, mat, {
    holes: holes.map((h) => (h.r ? { c: [h.c[0], -h.c[1]], r: h.r } : h.map(([x, z]) => [x, -z]))), curve: 10,
  });
  m.rotation.x = -Math.PI / 2;
  m.position.y = y0;
  return m;
}

function textTex(text, { w = 256, h = 64, color = "#3a3c42", bg = null, px = 48 } = {}) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.strokeStyle = color; g.lineWidth = 3;
  g.font = `italic 900 ${px}px 'Arial Black', 'Segoe UI', system-ui, sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.strokeText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function build(k, d) {
  const root = new THREE.Group();
  const g = new THREE.Group();
  root.add(g);
  const steel = k.mat(0x2b2c30, { roughness: 0.55, metalness: 0.45 });   // powder-coated steel
  const steelDark = k.mat(0x1d1e21, { roughness: 0.6, metalness: 0.4 });
  const face = k.mat(0x17181b, { roughness: 0.75, metalness: 0.2 });     // textured pedal faces
  const black = k.mat(0x0b0b0c, { roughness: 0.5 });
  const zinc = k.mat(0x7d8087, { roughness: 0.35, metalness: 0.85 });

  // ---------------- heel plate ----------------
  const PY = 0.034, PT = 0.003;            // plate underside / thickness
  const X0 = -0.215, X1 = 0.215, ZB = 0.03, ZF = 0.2;
  {
    const holes = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
      const x = X0 + 0.03 + c * 0.0465 + (r % 2) * 0.012, z = ZB + 0.028 + r * 0.04;
      if (Math.abs(z - 0.105) < 0.02 && Math.abs(x + 0.03) < 0.1) continue; // logo strip stays solid
      holes.push({ c: [x, z], r: r % 2 ? 0.0032 : 0.0045 });
    }
    const outline = [[X0, ZB], [X1, ZB], [X1, ZF - 0.02], [X1 - 0.02, ZF], [X0 + 0.02, ZF], [X0, ZF - 0.02]];
    g.add(planPart(outline, PY, PT, 0.0008, steel, holes));
    // bent front flange down to the floor
    const run = 0.014, rise = PY + PT / 2;
    const fl = shadowed(new THREE.Mesh(new THREE.BoxGeometry(X1 - X0 - 0.04, PT, Math.hypot(run, rise)), steel));
    fl.rotation.x = Math.atan2(rise, run);
    g.add(at(fl, 0, rise / 2, ZF + run / 2 - 0.001));
    // raised embossed strip with the MOZA logo
    const strip = planPart([[-0.17, 0.09], [0.09, 0.09], [0.1, 0.1], [0.09, 0.11], [-0.17, 0.11], [-0.18, 0.1]], PY + PT, 0.0012, 0.0004, steel);
    g.add(strip);
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03), new THREE.MeshStandardMaterial({ map: textTex("MOZA", { color: "#55585f" }), transparent: true, roughness: 0.6 }));
    logo.rotation.x = -Math.PI / 2;
    g.add(at(logo, -0.04, PY + PT + 0.0014, 0.1));
    // rubber feet
    for (const x of [X0 + 0.02, X1 - 0.02]) g.add(at(cyl(0.008, 0.008, PY, black, 12), x, PY / 2, ZB + 0.08));
  }

  // ---------------- pedal units ----------------
  const unit = (cx) => {
    const u = new THREE.Group();
    u.position.x = cx;
    g.add(u);
    const HW = 0.025;                                    // half spacing of the side plates
    // base rails (rear flat rail + front box tube under the heel plate)
    u.add(at(shadowed(new THREE.Mesh(new THREE.BoxGeometry(2 * HW + 0.006, 0.006, 0.2), steelDark)), 0, 0.003, -0.07));
    const tube = profile([[0.03, 0], [0.19, 0], [0.19, PY], [0.03, PY]], -HW - 0.003, 2 * HW + 0.006, steelDark,
      [[[0.06, 0.008], [0.1, 0.008], [0.1, 0.026], [0.06, 0.026]], [[0.13, 0.008], [0.17, 0.008], [0.17, 0.026], [0.13, 0.026]]]);
    u.add(tube);
    // side plates with triangular lightening holes
    const side = [[-0.165, 0.0], [0.03, 0.0], [0.05, 0.02], [0.05, 0.04], [0.02, 0.055], [-0.02, 0.1], [-0.045, 0.1],
      [-0.06, 0.07], [-0.09, 0.045], [-0.165, 0.04]];
    const tri = [
      [[-0.15, 0.012], [-0.13, 0.012], [-0.14, 0.03]], [[-0.125, 0.03], [-0.105, 0.03], [-0.115, 0.012]],
      [[-0.085, 0.012], [-0.06, 0.012], [-0.072, 0.034]], [[-0.04, 0.07], [-0.025, 0.07], [-0.032, 0.088]],
    ];
    for (const s of [-1, 1]) u.add(profile(side, s * HW - 0.0015, 0.003, steel, tri));
    // pedal arm (hinge near the heel plate, leaning away from the driver)
    const H = V(0, 0.045, 0.035), T = V(0, 0.27, -0.085);
    const dir = T.clone().sub(H).normalize();
    const nrm = V(0, dir.z, -dir.y).multiplyScalar(-1);   // face normal, towards the driver (+z, +y)
    const arm = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.02, H.distanceTo(T) - 0.03), steel));
    arm.position.copy(H).lerp(T, 0.47);
    arm.lookAt(arm.position.clone().add(dir));
    u.add(arm);
    // hinge knuckle + pin
    const pin = cyl(0.007, 0.007, 2 * HW + 0.012, steelDark, 16); pin.rotation.z = Math.PI / 2;
    u.add(at(pin, 0, H.y, H.z));
    for (const s of [-1, 1]) {
      const nut = cyl(0.0055, 0.0055, 0.004, zinc, 6); nut.rotation.z = Math.PI / 2;
      u.add(at(nut, s * (HW + 0.004), H.y, H.z));
      const bolt = cyl(0.005, 0.005, 0.006, black, 12); bolt.rotation.z = Math.PI / 2;
      u.add(at(bolt, s * (HW + 0.004), 0.03, -0.035));
    }
    // spring / sensor strut from the frame to the back of the arm
    const A = V(0, 0.06, -0.06), B = H.clone().lerp(T, 0.42).addScaledVector(nrm, -0.008);
    const strut = cyl(0.008, 0.008, A.distanceTo(B), black, 16);
    strut.position.copy(A).lerp(B, 0.5);
    strut.quaternion.setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize());
    u.add(strut);
    // pedal face plate with debossed logo
    const FL = 0.135, FW = 0.08;
    const fc = H.clone().lerp(T, 1).addScaledVector(dir, -FL / 2 + 0.008).addScaledVector(nrm, 0.0115);
    const r = 0.008, hw = FW / 2, L = FL / 2;
    const fpts = [[-hw + r, L], [hw - r, L], [hw - r * 0.3, L - r * 0.3], [hw, L - r], [hw, -0.01], [hw - 0.008, -L + 0.004], [hw - 0.012, -L],
      [-hw + 0.012, -L], [-hw + 0.008, -L + 0.004], [-hw, -0.01], [-hw, L - r], [-hw + r * 0.3, L - r * 0.3]];
    const fp = planPart(fpts, -0.0025, 0.005, 0.0012, face);
    const fGroup = new THREE.Group();
    fGroup.position.copy(fc);
    fGroup.lookAt(fc.clone().add(dir));
    fGroup.add(fp);
    // round the face corners with a slight bevel look: thin rim
    const logoM = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.0125), new THREE.MeshStandardMaterial({ map: textTex("MOZA", { color: "#4a4d54", px: 46 }), transparent: true, roughness: 0.7 }));
    logoM.rotation.x = -Math.PI / 2;   // plane faces +y of the face plate (towards the driver)
    logoM.rotation.z = Math.PI;
    fGroup.add(at(logoM, 0, 0.0027, FL / 2 - 0.015));
    for (const t of [0.02, -0.025]) {
      const sc = cyl(0.0028, 0.0028, 0.001, zinc, 10);
      fGroup.add(at(sc, 0, 0.0028, t));
    }
    u.add(fGroup);
  };
  unit(-0.005);   // brake
  unit(0.125);    // throttle

  g.position.z = -0.015;
  return root;
}
