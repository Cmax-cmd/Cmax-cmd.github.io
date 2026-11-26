// mouse model: WLMOUSE Beast X Pro (black). Origin = bottom centre, resting on the pad (y = 0).
// +y up, +z = towards the user (palm end), buttons point -z. Built in millimetres, scaled to metres at the end.
//
// The shell is a parametric surface P(a, b): a = position along the length in mm (-61 front .. +61 back),
// b = arc-length position around the cross-section (-50 right bottom edge .. 0 top centre .. +50 left bottom edge).
// The open "skeleton" lattice is cut as real polygon holes in that (a, b) domain, triangulated, mapped onto the
// surface and given a 1 mm wall thickness, so the struts read as solid metal from every angle.
import { THREE, shadowed, box } from "../lib.js";
import { TessellateModifier } from "three/addons/modifiers/TessellateModifier.js";

const HALF_L = 61;      // half length (122 mm)
const Y0 = 2.2;         // height of the shell's lower edge (bottom plate + feet below it)
const PX = 0.82, PY = 0.72; // cross-section superellipse exponents (sides steep, dome on top)

/** Catmull-Rom through [x, y] knots (x ascending), clamped at the ends. */
function spline(pts) {
  return (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    const n = pts.length;
    if (x >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (x > pts[i + 1][0]) i++;
    const p0 = pts[Math.max(0, i - 1)][1], p1 = pts[i][1], p2 = pts[i + 1][1], p3 = pts[Math.min(n - 1, i + 2)][1];
    const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
    const t2 = t * t, t3 = t2 * t;
    return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };
}

// plan view: half width (mm) before the end rounding; side view: shell height above Y0 (mm). s = -1 front .. +1 back
const widthKnots = spline([[-1, 25.5], [-0.6, 26.8], [-0.2, 28.0], [0.25, 30.6], [0.5, 31.2], [0.8, 30.4], [1, 29]]);
const heightKnots = spline([[-1, 21.5], [-0.8, 25.2], [-0.5, 28.6], [-0.2, 31.4], [0.1, 34.0], [0.32, 34.8], [0.52, 34.0],
  [0.7, 30.6], [0.84, 25.5], [0.93, 18], [0.98, 10], [1, 2]]);
function halfW(s) {
  const p = s < 0 ? 3.6 : 2.9; // squarish front (button tips), rounder palm end
  return widthKnots(s) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(s), p)), 1 / p);
}

// ---- precomputed cross-sections, sampled by arc length so b is ~mm everywhere
const NS = 480, NT = 180;
const secX = [], secY = [], secC = [];
for (let i = 0; i <= NS; i++) {
  const s = -1 + (2 * i) / NS;
  const w = Math.max(halfW(s), 0.05), h = heightKnots(s);
  const xs = new Float32Array(NT + 1), ys = new Float32Array(NT + 1), cs = new Float32Array(NT + 1);
  for (let j = 0; j <= NT; j++) {
    const t = Math.PI * j / NT;
    const c = Math.cos(t), sn = Math.sin(t);
    xs[j] = w * Math.sign(c) * Math.pow(Math.abs(c), PX);
    ys[j] = h * Math.pow(Math.max(sn, 0), PY);
    if (j) cs[j] = cs[j - 1] + Math.hypot(xs[j] - xs[j - 1], ys[j] - ys[j - 1]);
  }
  secX.push(xs); secY.push(ys); secC.push(cs);
}
function sectionPoint(i, v, out) {
  const cs = secC[i], target = v * cs[NT];
  let lo = 0, hi = NT;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cs[m] < target) lo = m; else hi = m; }
  const f = cs[hi] > cs[lo] ? (target - cs[lo]) / (cs[hi] - cs[lo]) : 0;
  out[0] = secX[i][lo] + (secX[i][hi] - secX[i][lo]) * f;
  out[1] = secY[i][lo] + (secY[i][hi] - secY[i][lo]) * f;
}
const _p0 = [0, 0], _p1 = [0, 0];
/** Point on the outer shell surface for domain (a, b). */
function surf(a, b, out = new THREE.Vector3()) {
  const s = THREE.MathUtils.clamp(a / HALF_L, -0.9995, 0.9995);
  const v = THREE.MathUtils.clamp(0.5 + b / 100, 0, 1);
  const fi = (s + 1) / 2 * NS, i = Math.min(NS - 1, Math.floor(fi)), f = fi - i;
  sectionPoint(i, v, _p0);
  sectionPoint(i + 1, v, _p1);
  return out.set(_p0[0] + (_p1[0] - _p0[0]) * f, Y0 + _p0[1] + (_p1[1] - _p0[1]) * f, s * HALF_L);
}
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3();
/** Outward unit normal of the shell at (a, b). */
function surfNormal(a, b, out = new THREE.Vector3()) {
  a = THREE.MathUtils.clamp(a, -HALF_L + 0.25, HALF_L - 0.25); // the ends are poles: sample just inside them
  const e = 0.08;
  surf(a + e, b, _a); surf(a - e, b, _b); _a.sub(_b);
  surf(a, b + e, _c); surf(a, b - e, _d); _c.sub(_d);
  out.crossVectors(_c, _a);
  if (out.lengthSq() < 1e-12) out.set(0, 1, 0);
  out.normalize();
  // make sure it points away from the shell's core axis
  surf(a, b, _b);
  const s = THREE.MathUtils.clamp(a / HALF_L, -0.9995, 0.9995);
  _d.set(_b.x, _b.y - Y0 - heightKnots(s) * 0.3, 0);
  if (out.dot(_d) < 0) out.negate();
  return out;
}

/* ---------------- mesh builder over the (a, b) domain ---------------- */
class Builder {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; }
  tri(p, n, uvs) {
    // keep the winding consistent with the supplied normals (front faces = normal side)
    _a.subVectors(p[1], p[0]); _b.subVectors(p[2], p[0]); _c.crossVectors(_a, _b);
    _d.copy(n[0]).add(n[1]).add(n[2]);
    const order = _c.dot(_d) < 0 ? [0, 2, 1] : [0, 1, 2];
    for (const k of order) {
      this.pos.push(p[k].x, p[k].y, p[k].z);
      this.nrm.push(n[k].x, n[k].y, n[k].z);
      if (uvs) this.uv.push(uvs[k][0], uvs[k][1]);
    }
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nrm, 3));
    if (this.uv.length) g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * A solid sheet following the shell: the domain shapes (with holes) are triangulated, tessellated, placed at
 * normal offset `outer`, mirrored at offset `inner` (reversed) and closed with walls along every contour.
 */
function sheet(shapes, { outer = 0, inner = null, maxEdge = 2.6, skipWall = null } = {}) {
  const B = new Builder();
  const flat = new TessellateModifier(maxEdge, 10).modify(new THREE.ShapeGeometry(shapes, 3));
  const P = flat.attributes.position;
  const cache = new Map();
  const vert = (a, b, off) => {
    const key = `${a.toFixed(4)},${b.toFixed(4)}`;
    let e = cache.get(key);
    if (!e) { e = { p: surf(a, b), n: surfNormal(a, b) }; cache.set(key, e); }
    return [e.p.clone().addScaledVector(e.n, off), e.n];
  };
  for (let i = 0; i < P.count; i += 3) {
    const pts = [], ns = [], nsIn = [], ptsIn = [];
    for (let k = 0; k < 3; k++) {
      const a = P.getX(i + k), b = P.getY(i + k);
      const [p, n] = vert(a, b, outer);
      pts.push(p); ns.push(n);
      if (inner !== null) { const [q] = vert(a, b, inner); ptsIn.push(q); nsIn.push(n.clone().negate()); }
    }
    B.tri(pts, ns);
    if (inner !== null) B.tri(ptsIn, nsIn);
  }
  if (inner !== null) {
    for (const shape of shapes) {
      const contours = [{ pts: shape.getPoints(3), hole: false }, ...shape.holes.map((h) => ({ pts: h.getPoints(3), hole: true }))];
      for (const { pts, hole } of contours) {
        // subdivide long edges so the wall hugs the curved surface
        const ring = [];
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i], q = pts[(i + 1) % pts.length];
          const n = Math.max(1, Math.ceil(p.distanceTo(q) / 2.5));
          for (let k = 0; k < n; k++) ring.push(new THREE.Vector2().lerpVectors(p, q, k / n));
        }
        for (let i = 0; i < ring.length; i++) {
          const p = ring[i], q = ring[(i + 1) % ring.length];
          if (p.distanceTo(q) < 1e-6) continue;
          const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
          if (skipWall && skipWall(mx, my)) continue;
          // the open side of the wall: inside a hole, outside the outer contour
          let nx = -(q.y - p.y), ny = q.x - p.x;
          const l = Math.hypot(nx, ny); nx /= l; ny /= l;
          const insideTest = pointInPoly(mx + nx * 0.05, my + ny * 0.05, pts);
          if ((hole ? insideTest : !insideTest) === false) { nx = -nx; ny = -ny; }
          const m0 = surf(mx, my), m1 = surf(mx + nx * 0.3, my + ny * 0.3);
          const wn = m1.sub(m0).normalize();
          const [po] = vert(p.x, p.y, outer), [pi] = vert(p.x, p.y, inner);
          const [qo] = vert(q.x, q.y, outer), [qi] = vert(q.x, q.y, inner);
          B.tri([po, qo, qi], [wn, wn, wn]);
          B.tri([po, qi, pi], [wn, wn, wn]);
        }
      }
    }
  }
  return B.geometry();
}

/** Plain grid sheet (no holes) over a domain rectangle, at a normal offset, with uvs in mm * uvScale. */
function gridSheet(a0, a1, b0, b1, na, nb, off, uvScale) {
  const B = new Builder();
  const P = [], N = [];
  for (let i = 0; i <= na; i++) {
    P.push([]); N.push([]);
    for (let j = 0; j <= nb; j++) {
      const a = a0 + (a1 - a0) * i / na, b = b0 + (b1 - b0) * j / nb;
      const n = surfNormal(a, b);
      P[i].push(surf(a, b).addScaledVector(n, off)); N[i].push(n);
    }
  }
  const uv = (i, j) => [(a0 + (a1 - a0) * i / na) * uvScale, (b0 + (b1 - b0) * j / nb) * uvScale];
  for (let i = 0; i < na; i++) for (let j = 0; j < nb; j++) {
    B.tri([P[i][j], P[i + 1][j], P[i + 1][j + 1]], [N[i][j], N[i + 1][j], N[i + 1][j + 1]], [uv(i, j), uv(i + 1, j), uv(i + 1, j + 1)]);
    B.tri([P[i][j], P[i + 1][j + 1], P[i][j + 1]], [N[i][j], N[i + 1][j + 1], N[i][j + 1]], [uv(i, j), uv(i + 1, j + 1), uv(i, j + 1)]);
  }
  return B.geometry();
}

/* ---------------- 2D lattice design in the (a, b) domain ---------------- */
const area = (poly) => { let s = 0; for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; s += p.x * q.y - q.x * p.y; } return s / 2; };
/** Keep the part of a convex polygon where dot(p, n) >= c. */
function clipHalf(poly, nx, ny, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    const dp = p.x * nx + p.y * ny - c, dq = q.x * nx + q.y * ny - c;
    if (dp >= 0) out.push(p);
    if ((dp >= 0) !== (dq >= 0)) { const t = dp / (dp - dq); out.push(new THREE.Vector2(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t)); }
  }
  return out;
}
/** Shrink a convex polygon by d on every edge (the struts are 2 d wide). */
function inset(poly, d) {
  if (area(poly) < 0) poly = [...poly].reverse();
  let out = poly;
  for (let i = 0; i < poly.length && out.length >= 3; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    let nx = -(q.y - p.y), ny = q.x - p.x; const l = Math.hypot(nx, ny); nx /= l; ny /= l; // inward for CCW
    out = clipHalf(out, nx, ny, p.x * nx + p.y * ny + d);
  }
  return out;
}
/** Polygon -> path with filleted corners. */
function roundedPath(poly, r, PathType = THREE.Path) {
  const path = new PathType();
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const prev = poly[(i + n - 1) % n], v = poly[i], next = poly[(i + 1) % n];
    const lp = v.distanceTo(prev), ln = v.distanceTo(next);
    const rr = Math.min(r, lp * 0.4, ln * 0.4);
    const a = new THREE.Vector2().lerpVectors(v, prev, rr / lp), c = new THREE.Vector2().lerpVectors(v, next, rr / ln);
    if (i === 0) path.moveTo(a.x, a.y); else path.lineTo(a.x, a.y);
    path.quadraticCurveTo(v.x, v.y, c.x, c.y);
  }
  path.closePath();
  return path;
}
const V = (x, y) => new THREE.Vector2(x, y);
const rect = (a0, a1, b0, b1) => [V(a0, b0), V(a1, b0), V(a1, b1), V(a0, b1)];

// button rear edge ("smile" across the top)
const grooveA = (b) => -0.009 * b * b;
const SIDE_FRONT = 5;  // on the sides the lattice starts behind the side buttons
const RIM = 47.6;      // bottom rim of the shell

/*
 * Hand-laid Beast X Pro web, traced from the official top shots (mouse-1/2/3) and the left-rear desk photo.
 * Nodes are strut junctions in (a, b) = (mm along the length, mm around the section), for the LEFT half (b >= 0);
 * the right half is mirrored with a small offset, as on the real shell. Cells are the openings between struts.
 */
const NODES = {
  // centre line
  C0: [0, 0], C1: [12.5, 0], C2: [21.5, 0], C3: [43.5, 0], C4: [60.2, 0],
  // first ring out: groove junction, then the long diagonals' far ends
  A0: [grooveA(12), 12], A1: [8.5, 10], A2: [24.5, 14], A3: [36.5, 11], A4: [49.5, 14.5], A5: [60.4, 8],
  // shoulder (top of the side wall)
  B0: [grooveA(22), 22], B1: [12, 25.5], B2: [27, 23], B3: [40, 27], B4: [51, 25.5], B5: [60.5, 20],
  // middle of the side wall
  S0: [8.5, 33], S1: [19.5, 36.5], S2: [33, 37.5], S3: [46, 36.5], S4: [60.2, 33],
  // bottom rim
  R0: [12.5, RIM], R1: [26, RIM], R2: [40, RIM], R3: [52.5, RIM], R4: [60.3, RIM],
};
const CELLS = [
  // behind the groove: wide trapezoids either side of the spine
  ["C0", "A0", "A1", "C1"], ["A0", "B0", "B1", "A1"],
  // the long diagonal struts A1 -> C2 meet their mirror on the spine (the "V" over the hump)
  ["C1", "A1", "C2"], ["A1", "A2", "C2"], ["A1", "B1", "B2", "A2"],
  // side wall, front: triangles behind the side buttons
  ["B0", "S0", "B1"], ["S0", "S1", "B1"], ["B1", "S1", "B2"],
  ["S0", "R0", "S1"], ["S1", "R0", "R1"],
  // rear hump: big 4-5 sided cells
  ["A2", "B2", "B3", "A3"], ["B2", "S1", "S2", "B3"], ["S1", "R1", "R2", "S2"],
  ["A3", "B3", "B4", "A4"], ["B3", "S2", "S3", "B4"], ["S2", "R2", "R3", "S3"],
  // palm end: smaller cells as the shell closes
  ["C4", "A4", "A5"], ["A4", "B4", "B5", "A5"], ["B4", "S3", "S4", "B5"], ["S3", "R3", "R4", "S4"],
];
// cells that straddle the centre line (the spine stops at C2): primed names are the mirrored right-hand nodes
const CENTRE_CELLS = [
  ["C2", "A2", "A3", "A3'", "A2'"],          // big pentagon over the hump
  ["A3'", "A3", "A4", "C4", "A4'"],          // the next one back, under the cross strut A3-A3'
];
// small per-node offsets for the right half, so the two halves are not mirror-perfect
const RIGHT_NUDGE = { A1: [1.5, -0.8], A2: [-1.2, 1.0], A3: [2.0, 0.6], A4: [-1.0, -1.2], B1: [1.0, 1.2], B2: [2.2, -0.8],
  B3: [-1.5, 0.8], B4: [1.2, 0], S1: [-1.5, 0], S2: [1.8, 0.5], S3: [-1.2, -0.6] };

function latticeHoles() {
  const holes = [];
  const btnB0 = 21.5;
  for (const sg of [1, -1]) {
    // right half: mirrored, interior nodes nudged back a little (the real web is not perfectly symmetric)
    const node = (n) => {
      const [a, b] = NODES[n];
      const [da, db] = (sg < 0 && RIGHT_NUDGE[n]) || [0, 0];
      return V(a + da, (b + db) * sg);
    };
    for (const cell of CELLS) {
      if (sg < 0 && cell.every((n) => n.startsWith("C"))) continue;
      let poly = inset(cell.map(node), 0.65);
      // keep the side-button area solid
      if (poly.length >= 3 && poly.some((p) => Math.abs(p.y) > btnB0 && p.x < SIDE_FRONT)) {
        const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
        if (cx > SIDE_FRONT - 4) poly = clipHalf(poly, 1, 0, SIDE_FRONT + 1.2);
        else poly = clipHalf(poly, 0, -sg, -(btnB0 - 1.2));
      }
      if (poly.length < 3 || Math.abs(area(poly)) < 6) continue;
      holes.push(roundedPath(poly, 1.5));
    }
    // short slits in the rear of the buttons (the left one is a triangle, the right one longer)
    const slit = sg > 0 ? [V(-15, 10), V(-6.8, 6.5), V(-7.2, 15.5)] : [V(-20, -8.5), V(-7, -5), V(-8, -19)];
    holes.push(roundedPath(slit, 1.2));
    // the ribbed lower side wall: 8 long slanted rib openings from under the side buttons backwards
    for (let k = 0; k < 8; k++) {
      const a0 = -36 + k * 5.6;
      const r = [V(a0, 33 * sg), V(a0 + 3, 33 * sg), V(a0 + 3 - 3, 46.8 * sg), V(a0 - 3, 46.8 * sg)];
      holes.push(roundedPath(r, 1.2));
    }
  }
  for (const cell of CENTRE_CELLS) {
    const poly = inset(cell.map((n) => {
      const right = n.endsWith("'"), key = n.replace("'", "");
      const [a, b] = NODES[key];
      const [da, db] = (right && RIGHT_NUDGE[key]) || [0, 0];
      return V(a + da, right ? -(b + db) : b);
    }), 0.65);
    if (poly.length >= 3) holes.push(roundedPath(poly, 1.5));
  }
  // the narrow window beside the split behind the wheel (left only)
  holes.push(roundedPath([V(-21, 1.6), V(-8.5, 1.6), V(-8.5, 5.0), V(-19, 4.4)], 1));
  // centre split + wheel opening + button rear groove as one cut
  const w = 0.34, wb = 4.6, g = [];
  g.push(V(-60.2, -w), V(-47.5, -w), V(-47.5, -wb), V(-28.5, -wb), V(-28.5, -w), V(grooveA(0) - w, -w));
  for (let b = -2; b >= -26; b -= 2) g.push(V(grooveA(b) - w, b));
  for (let b = -26; b <= 26; b += 2) g.push(V(grooveA(b) + w, b));
  for (let b = 26; b >= 2; b -= 2) g.push(V(grooveA(b) - w, b));
  g.push(V(grooveA(0) - w, w), V(-28.5, w), V(-28.5, wb), V(-47.5, wb), V(-47.5, w), V(-60.2, w));
  const cut = new THREE.Path(g); cut.closePath();
  holes.push(cut);
  return holes;
}

/** Dark hexagon-pattern texture for the internal chassis seen through the lattice. */
function hexTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#3a3c42";
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#1b1c20";
  g.lineWidth = 5;
  const R = 21, h = R * Math.sqrt(3);
  for (let row = -1; row < 14; row++) for (let col = -1; col < 6; col++) {
    const cx = col * R * 3 + (row % 2 ? R * 1.5 : 0), cy = row * h / 2;
    g.beginPath();
    for (let k = 0; k <= 6; k++) { const t = Math.PI / 3 * k; g.lineTo(cx + R * Math.cos(t), cy + R * Math.sin(t)); }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Chevron tread for the scroll wheel. */
function treadTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#24252a";
  g.fillRect(0, 0, 64, 256);
  g.strokeStyle = "#08080a";
  g.lineWidth = 6;
  for (let y = -32; y < 290; y += 21) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(32, y + 14); g.lineTo(64, y); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  const shellMat = k.mat(0x16171a, { roughness: 0.42, metalness: 0.25 });
  const darkMat = k.mat(0x0b0b0d, { roughness: 0.7, metalness: 0.1 });

  // outer magnesium shell with the lattice cut out (1 mm thick)
  const shellShape = new THREE.Shape(rect(-HALF_L, HALF_L, -50, 50));
  shellShape.holes.push(...latticeHoles());
  const shell = shadowed(new THREE.Mesh(sheet([shellShape], { outer: 0, inner: -1.6, maxEdge: 6,
    skipWall: (a) => Math.abs(a) > HALF_L - 0.5 }), shellMat));
  shell.name = "shell";
  g.add(shell);

  // internals seen through the openings: dark inner side walls, PCB, battery, sensor housing, coil, flex cable
  const chassisMat = k.mat(0x3a3c42, { roughness: 0.8, metalness: 0.1, map: hexTexture() });
  for (const [b0, b1] of [[-50, -30], [30, 50]]) {
    const band = shadowed(new THREE.Mesh(gridSheet(-HALF_L + 4, HALF_L - 3, b0, b1, 40, 6, -2.6, 1 / 26), chassisMat));
    band.name = "chassis";
    g.add(band);
  }
  const parts = [
    [box(38, 1.6, 80, k.mat(0x1b2420, { roughness: 0.6 }), 0.6), 0, 4.3, -6],                     // PCB
    [box(22, 10, 32, k.mat(0x2c2e33, { roughness: 0.5, metalness: 0.45 }), 2.2), 0, 10.2, 25],    // battery pack (dark, as seen through the shell)
    [box(19, 0.6, 26, k.mat(0x1c1d21, { roughness: 0.5 }), 0.2), 0, 15.5, 25],                     // battery label
    [box(13, 5, 15, k.mat(0x26272b, { roughness: 0.55 }), 1.2), 0, 7.5, -16],                      // sensor housing
    [box(30, 9, 8, k.mat(0x3c3e44, { roughness: 0.5, metalness: 0.3 }), 1.5), 0, 9.5, 3],         // frame cross-member
    [box(4, 0.5, 28, k.mat(0x9a5626, { roughness: 0.4, metalness: 0.6 }), 0.2), -15, 5.4, 12],    // flex cable
    [box(16, 14, 3, k.mat(0x44474d, { roughness: 0.45, metalness: 0.4 }), 1), 0, 10, 44],          // rear bracket
  ];
  for (const [m, x, y, z] of parts) { m.position.set(x, y, z); m.name = "chassis-part"; g.add(m); }
  const coil = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 3, 20), k.mat(0xb8642e, { roughness: 0.3, metalness: 0.8 })));
  coil.position.set(13, 6.6, 6);
  g.add(coil);

  // side buttons (left = -x = +b), raised pads on the shell
  for (const [a0, a1] of [[-27, -13.2], [-12.2, 1.5]]) {
    const pad = roundedPath(rect(a0, a1, 23.8, 30.8), 2.4, THREE.Shape);
    g.add(shadowed(new THREE.Mesh(sheet([pad], { outer: 1.8, inner: -0.4, maxEdge: 1.5 }), shellMat)));
  }

  // scroll wheel in its opening
  const wheelA = -38;
  const top = surf(wheelA, 0);
  const R = 9.6, Wd = 6.6, prof = [];
  for (let i = 0; i <= 12; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / 12;
    prof.push(V(R - 1.2 + Math.cos(t) * 1.2, (Wd / 2 - 1.2) * Math.sign(Math.sin(t)) + Math.sin(t) * 1.2));
  }
  prof.unshift(V(0.01, prof[0].y)); prof.push(V(0.01, prof[prof.length - 1].y));
  const tread = treadTexture();
  tread.repeat.set(1, 3);
  const wheel = shadowed(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), k.mat(0xffffff, { roughness: 0.85, map: tread })));
  wheel.rotation.z = Math.PI / 2;
  wheel.position.set(0, top.y - R + 2.6, wheelA);
  g.add(wheel);

  // bottom plate and PTFE feet
  const foot = new THREE.Shape();
  for (let i = 0; i <= 80; i++) { const s = -1 + 2 * i / 80; const x = Math.max(halfW(s) - 0.4, 0); const z = s * (HALF_L - 0.3); i ? foot.lineTo(x, -z) : foot.moveTo(x, -z); }
  for (let i = 80; i >= 0; i--) { const s = -1 + 2 * i / 80; const x = Math.max(halfW(s) - 0.4, 0); foot.lineTo(-x, -s * (HALF_L - 0.3)); }
  const plate = shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(foot, { depth: Y0 - 0.5, bevelEnabled: false, curveSegments: 4 }), darkMat));
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.5;
  g.add(plate);
  const ptfe = k.mat(0x2a2b2f, { roughness: 0.25, metalness: 0.0 });
  for (const [z, w, l] of [[-50, 34, 5], [50, 30, 5]]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.5, 24), ptfe);
    m.scale.set(w / 2, 1, l / 2);
    m.position.set(0, 0.25, z);
    g.add(m);
  }

  g.scale.setScalar(0.001);
  return g;
}
