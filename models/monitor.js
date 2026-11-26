// monitor model: ASUS ROG Strix OLED XG27ACDNG on a black single gas-spring monitor arm.
// Origin = bottom centre on the desk top (y = 0), +z = front. Units: metres.
// The desk's back edge is at local z = -0.185; the arm clamps there.
import { THREE, box, cyl, at, shadowed, screenTex } from "../lib.js";

// ---- real dimensions (panel without stand: 604 x 349 mm, active area 587 x 330 mm)
const PW = 0.604, PH = 0.349;          // panel outline
const SW = 0.5868, SH = 0.3301;        // active area, 16:9
const BOT = 0.02;                      // panel bottom edge above the desk
const PT = 0.0068;                     // thin OLED panel thickness
const FRONT = 0.0;                     // front face of the panel
const BACK = FRONT - PT;               // back face of the thin panel
const CY = BOT + PH / 2;               // panel centre height

/** Rear housing outline (right half, mirrored), x from centre, y from panel bottom. */
const HOUSING = [
  [0.205, 0.03], [0.252, 0.085], [0.252, 0.25],
  [0.232, 0.27], [0.13, 0.292],
];
const HX = 0.252, HY0 = 0.03, HY1 = 0.292;   // housing bounds (texture frame)
const TAPER_Y = 0.235;                      // above this the housing slopes toward the panel (top tab)
/** Outline clipped to a y band [y0, y1] (the outline is convex, so a simple clip works). */
function housingShape(y0 = 0, y1 = 1) {
  const ring = [...HOUSING, ...HOUSING.slice().reverse().map(([x, y]) => [-x, y])];
  const out = [];
  for (const [lim, keepAbove] of [[y0, true], [y1, false]]) {
    const src = out.length ? out.splice(0) : ring;
    for (let i = 0; i < src.length; i++) {
      const p = src[i], q = src[(i + 1) % src.length];
      const pin = keepAbove ? p[1] >= lim : p[1] <= lim, qin = keepAbove ? q[1] >= lim : q[1] <= lim;
      if (pin) out.push(p);
      if (pin !== qin) { const t = (lim - p[1]) / (q[1] - p[1]); out.push([p[0] + t * (q[0] - p[0]), lim]); }
    }
  }
  const s = new THREE.Shape();
  out.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}

/** Back-cover artwork (as seen from behind): smooth half | diagonal seam | perforated half with the ROG eye.
 *  Returns a colour map and a matching roughness map (smooth half satin, perforated half matte). */
function backTextures() {
  const W = 1024, H = 532;
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return [c, c.getContext("2d")]; };
  const [c, g] = mk(), [rc, r] = mk();
  const sx0 = W * 0.27, sx1 = W * 0.6;          // seam top / bottom x
  const perf = (ctx) => { ctx.beginPath(); ctx.moveTo(sx0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(sx1, H); ctx.closePath(); };
  // smooth area
  g.fillStyle = "#5a5c63"; g.fillRect(0, 0, W, H);
  r.fillStyle = "#7a7a7a"; r.fillRect(0, 0, W, H);
  // perforated area: slightly darker base, clearly visible dot grid
  g.save(); perf(g); g.clip();
  g.fillStyle = "#4a4c53"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#1c1d21";
  for (let y = 5, row = 0; y < H; y += 10, row++) for (let x = row % 2 ? 5 : 10; x < W; x += 10) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
  // ROG eye: bold, simple, lighter grey (dots left out inside it)
  g.translate(W * 0.75, H * 0.36);
  const eye = new Path2D();
  eye.moveTo(-150, 70); eye.quadraticCurveTo(-20, -60, 170, -78);   // top blade
  eye.quadraticCurveTo(60, -40, 10, 10);
  eye.quadraticCurveTo(80, -24, 170, -30);                           // middle blade
  eye.quadraticCurveTo(70, 20, 20, 90);
  eye.quadraticCurveTo(-30, 40, -90, 40);                            // lens
  eye.quadraticCurveTo(-40, 70, -10, 100);
  eye.quadraticCurveTo(-90, 90, -150, 70);
  g.fillStyle = "#7c7e87"; g.fill(eye);
  g.restore();
  r.save(); perf(r); r.clip(); r.fillStyle = "#e6e6e6"; r.fillRect(0, 0, W, H); r.restore();
  // seam groove
  for (const [ctx, col] of [[g, "#1d1e22"], [r, "#ffffff"]]) {
    ctx.strokeStyle = col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(sx0, 0); ctx.lineTo(sx1, H); ctx.stroke();
  }
  // REPUBLIC OF GAMERS mark, lower left of the smooth area
  g.fillStyle = "#8a8c94";
  g.font = "600 20px 'Space Grotesk', system-ui, sans-serif";
  g.fillText("REPUBLIC OF", W * 0.13, H * 0.74);
  g.fillText("GAMERS", W * 0.13, H * 0.74 + 22);
  g.strokeStyle = "#8a8c94"; g.lineWidth = 4;
  g.beginPath(); g.moveTo(W * 0.085, H * 0.79); g.quadraticCurveTo(W * 0.1, H * 0.7, W * 0.125, H * 0.69); g.stroke();
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const rough = new THREE.CanvasTexture(rc);
  return { map, rough };
}

/** Vent slat texture for the angled grilles. */
function slatTexture(n) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 32;
  const g = c.getContext("2d");
  g.fillStyle = "#45464b"; g.fillRect(0, 0, 256, 32);
  g.fillStyle = "#0b0b0d";
  for (let i = 0; i < n; i++) g.fillRect((i + 0.25) * 256 / n, 3, (256 / n) * 0.5, 26);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A rounded bar from point a to point b with cross-section w (horizontal) x h (vertical). */
function bar(a, b, w, h, mat, r = 0.006) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const m = box(dir.length(), h, w, mat, r);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.rotation.order = "YZX";
  m.rotation.y = Math.atan2(-dir.z, dir.x);
  m.rotation.z = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
  return m;
}

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();

  // ---- materials
  const shell = k.mat(0x54565d, { roughness: 0.6, metalness: 0.1 });       // gunmetal-grey plastic back
  const frame = k.mat(0x34353a, { roughness: 0.45, metalness: 0.2 });       // thin dark-grey metal frame
  const chin = k.mat(0x2a2b30, { roughness: 0.4, metalness: 0.35 });        // bottom bezel strip
  const glass = k.mat(0x050506, { roughness: 0.08, metalness: 0.0 });       // black glass border
  const recess = k.mat(0x0d0d10, { roughness: 0.8 });
  const port = k.mat(0x9a9ca3, { roughness: 0.35, metalness: 0.8 });
  const armM = k.mat(0x1b1c1f, { roughness: 0.55, metalness: 0.45 });       // matte black powder-coat
  const armDark = k.mat(0x111214, { roughness: 0.7, metalness: 0.2 });
  const armCover = k.mat(0x26272b, { roughness: 0.5, metalness: 0.3 });
  const accent = k.mat(0x3a3c42, { roughness: 0.35, metalness: 0.8 });
  const tex = backTextures();
  const slats = k.mat(0xffffff, { map: slatTexture(12), roughness: 0.7 });

  // ---- thin OLED panel: black frame, black glass border, screen
  g.add(at(box(PW, PH, PT, frame, 0.0028), 0, CY, FRONT - PT / 2));
  g.add(at(box(PW - 0.004, 0.0105, 0.0016, chin, 0.0007), 0, BOT + 0.0065, FRONT + 0.0001));
  const glassMesh = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.004, PH - 0.0145), glass);
  glassMesh.position.set(0, CY + 0.005, FRONT + 0.0006);
  g.add(glassMesh);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.set(0, BOT + 0.0125 + SH / 2, FRONT + 0.0009);
  g.add(screen);

  // ---- rear housing (angular ROG body, diagonal seam, wings with vents)
  // Two extrusions: the full-depth lower body and the top tab, whose rear face slopes toward the panel.
  const HD = 0.024, BV = 0.006, BS = 0.005;   // extrude depth, bevel thickness, bevel size
  const FULL = HD + 2 * BV;                   // total housing depth behind its front (z = HD + BV in geometry)
  const hz = BACK - HD - BV + 0.002;          // geometry max z lands just inside the panel back
  const backZ = hz - BV;                      // flat rear face of the lower body
  const TOP_SCALE = 0.4;                      // top tab is 40 % as deep at its upper edge
  const k2 = (FULL * (1 - TOP_SCALE)) / (HY1 - TAPER_Y);   // dz/dy of the sloped face
  const opts = { depth: HD, bevelEnabled: true, bevelThickness: BV, bevelSize: BS, bevelSegments: 3, curveSegments: 4 };
  const pieces = [[HY0 - 0.01, TAPER_Y], [TAPER_Y, 1]];
  for (const [y0, y1] of pieces) {
    const geo = new THREE.ExtrudeGeometry(housingShape(y0, y1), opts);
    const pos = geo.attributes.position, nrm = geo.attributes.normal, uv = geo.attributes.uv;
    const sloped = y0 >= TAPER_Y;
    const n = new THREE.Vector3(0, k2, -1).normalize();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const backCap = z < -BV + 1e-6 && nrm.getZ(i) < -0.99;
      if (sloped) {
        const t = THREE.MathUtils.clamp((y - TAPER_Y) / (HY1 - TAPER_Y), 0, 1);
        const front = HD + BV;
        pos.setZ(i, front - (front - z) * (1 - (1 - TOP_SCALE) * t));
        if (backCap) nrm.setXYZ(i, n.x, n.y, n.z);
      }
      // map the artwork across the whole housing (mirrored: we look at it from behind)
      uv.setXY(i, (HX - x) / (2 * HX), (y - HY0) / (HY1 - HY0));
    }
    const art = k.mat(0xffffff, { map: tex.map, roughnessMap: tex.rough, roughness: 1, metalness: 0.12 });
    const mesh = shadowed(new THREE.Mesh(geo, [art, shell]));
    mesh.position.set(0, BOT, hz);
    g.add(mesh);
  }

  // VESA 100 recess (round dish) in the centre of the back
  const vesaY = CY;
  const dish = cyl(0.058, 0.058, 0.002, recess, 40);
  dish.rotation.x = Math.PI / 2;
  dish.position.set(0, vesaY, backZ - 0.0006);
  g.add(dish);

  // angled vent grilles on the lower wing chamfers (facing down and out)
  const midZ = hz + HD / 2;
  for (const s of [-1, 1]) {
    const [ax, ay] = HOUSING[0], [bx, by] = HOUSING[1];       // wing chamfer
    const len = Math.hypot(bx - ax, by - ay), nx = (by - ay) / len, ny = -(bx - ax) / len;
    const grill = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.86, HD + BV), slats);
    grill.rotation.order = "ZXY";
    grill.rotation.set(Math.PI / 2, 0, s * Math.atan2(nx, -ny));
    grill.position.set(s * ((ax + bx) / 2 + nx * (BS + 0.0004)), BOT + (ay + by) / 2 + ny * (BS + 0.0004), midZ);
    g.add(grill);
  }
  // I/O recess on the underside of the housing: dark pockets + port faces
  const ioY = BOT + HOUSING[0][1] - BS - 0.0004;
  for (const [x, w] of [[-0.085, 0.11], [0.08, 0.12]]) {
    const pocket = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.018), recess);
    pocket.rotation.x = Math.PI / 2;
    pocket.position.set(x, ioY, midZ);
    g.add(pocket);
  }
  for (const [x, w] of [[-0.12, 0.014], [-0.095, 0.007], [-0.08, 0.007], [-0.065, 0.008], [0.04, 0.012], [0.06, 0.012], [0.08, 0.014], [0.105, 0.008], [0.12, 0.005]]) {
    g.add(at(box(w, 0.002, 0.005, port, 0.0005), x, ioY - 0.0006, midZ));
  }

  g.userData.audioIn = new THREE.Vector3(0.12, ioY - 0.002, midZ); // 3.5 mm jack: the IEMs plug in here

  // ---- monitor arm (black single gas-spring arm, desk clamp at the back edge)
  const vesaZ = backZ - 0.002;
  g.add(at(box(0.11, 0.11, 0.006, armM, 0.006), 0, vesaY, vesaZ - 0.003));      // VESA plate
  g.add(at(box(0.07, 0.07, 0.012, armDark, 0.008), 0, vesaY, vesaZ - 0.012));   // quick-release bracket
  const hinge = cyl(0.012, 0.012, 0.06, armM, 20);                              // tilt hinge
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(0, vesaY, vesaZ - 0.024);
  g.add(hinge);
  const head = new THREE.Vector3(0, vesaY, vesaZ - 0.042);
  g.add(at(box(0.03, 0.036, 0.03, armM, 0.008), head.x, head.y, head.z + 0.006));
  g.add(at(cyl(0.015, 0.015, 0.05, armM, 20), head.x, head.y + 0.006, head.z - 0.006));   // swivel

  // pole: slightly left of centre at the back edge
  const poleX = -0.11, poleZ = -0.152, poleTop = 0.29;
  g.add(at(cyl(0.017, 0.017, poleTop - 0.014, armM, 28), poleX, 0.014 + (poleTop - 0.014) / 2, poleZ));
  g.add(at(cyl(0.0185, 0.0185, 0.008, armDark, 28), poleX, poleTop, poleZ));
  // desk clamp: top plate, spine behind the desk edge, lower jaw + screw (desk is 40 mm thick)
  g.add(at(box(0.07, 0.014, 0.075, armM, 0.005), poleX, 0.007, -0.1505));
  g.add(at(box(0.07, 0.07, 0.012, armM, 0.004), poleX, -0.021, -0.191));
  g.add(at(box(0.07, 0.01, 0.06, armM, 0.004), poleX, -0.061, -0.16));
  g.add(at(cyl(0.006, 0.006, 0.05, accent, 12), poleX, -0.08, -0.155));
  g.add(at(cyl(0.016, 0.016, 0.006, armDark, 20), poleX, -0.105, -0.155));
  g.add(at(cyl(0.022, 0.022, 0.006, armDark, 24), poleX, -0.046, -0.155));

  // collar on the pole holding the first segment
  const y1 = 0.205;
  g.add(at(cyl(0.024, 0.024, 0.04, armM, 28), poleX, y1, poleZ));
  g.add(at(cyl(0.025, 0.025, 0.004, accent, 28), poleX, y1 + 0.022, poleZ));
  // segment 1: flat link from the pole to the elbow (folded behind the monitor)
  const p0 = new THREE.Vector3(poleX, y1, poleZ);
  const elbow = new THREE.Vector3(0.15, y1, -0.13);
  g.add(bar(p0, elbow, 0.036, 0.03, armM, 0.008));
  g.add(bar(p0.clone().setY(y1 + 0.0155), elbow.clone().setY(y1 + 0.0155), 0.026, 0.002, armCover, 0.001));
  g.add(at(cyl(0.022, 0.022, 0.07, armM, 28), elbow.x, y1 + 0.02, elbow.z));    // elbow joint
  g.add(at(cyl(0.023, 0.023, 0.004, accent, 28), elbow.x, y1 + 0.056, elbow.z));
  // segment 2: gas-spring forearm, tilted slightly down towards the head
  const e2 = new THREE.Vector3(elbow.x, y1 + 0.038, elbow.z);
  const h2 = new THREE.Vector3(head.x, head.y + 0.02, head.z - 0.02);
  const up = new THREE.Vector3(0, 0.0215, 0);
  g.add(bar(e2, h2, 0.04, 0.042, armM, 0.012));
  g.add(bar(e2.clone().add(up), h2.clone().add(up), 0.03, 0.002, armCover, 0.001));
  g.add(at(cyl(0.02, 0.02, 0.05, armM, 24), h2.x, h2.y - 0.008, h2.z));          // knuckle
  for (const t of [0.35, 0.7]) {                                                 // cable clips
    const p = p0.clone().lerp(elbow, t);
    g.add(at(box(0.02, 0.008, 0.03, armDark, 0.003), p.x, y1 - 0.019, p.z));
  }

  return g;
}
