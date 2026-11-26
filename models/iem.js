// iem model: TRUTHEAR x Crinacle ZERO:RED. Origin = bottom centre, resting on the desk top (y = 0).
// Two earpieces lying on the desk (faceplates up, tilted onto their nozzles), each with a 2-pin connector,
// a pre-formed ear hook, a Y split and a loosely coiled twisted cable ending in a 3.5 mm plug.
// Built in millimetres, scaled to metres at the end.
import { THREE, RoundedBoxGeometry, shadowed } from "../lib.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** Rounded polygon outline. corners: [[x, y, radius], ...] (counter-clockwise). */
function roundedShape(corners) {
  const s = new THREE.Shape();
  const n = corners.length;
  const P = corners.map(([x, y]) => new THREE.Vector2(x, y));
  for (let i = 0; i < n; i++) {
    const prev = P[(i + n - 1) % n], v = P[i], next = P[(i + 1) % n];
    const r = corners[i][2];
    const a = new THREE.Vector2().lerpVectors(v, prev, r / v.distanceTo(prev));
    const c = new THREE.Vector2().lerpVectors(v, next, r / v.distanceTo(next));
    if (i === 0) s.moveTo(a.x, a.y); else s.lineTo(a.x, a.y);
    s.quadraticCurveTo(v.x, v.y, c.x, c.y);
  }
  s.closePath();
  return s;
}

/** Red herringbone fibre weave of the faceplate. */
function weaveTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#4a0207";
  g.fillRect(0, 0, 512, 512);
  let seed = 5;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const band = 64;
  for (let k = 0; k < 512 / band; k++) {
    g.save();
    g.beginPath(); g.rect(k * band, 0, band, 512); g.clip();
    const dir = k % 2 ? 1 : -1;
    for (let y = -band * 2; y < 512 + band * 2; y += 2) {
      const l = 22 + rnd() * 26;
      g.strokeStyle = `hsla(${356 + rnd() * 4}, ${92 + rnd() * 8}%, ${l}%, ${0.7 + rnd() * 0.3})`;
      g.lineWidth = 0.7 + rnd() * 1.3;
      g.beginPath();
      g.moveTo(k * band, y);
      g.lineTo(k * band + band, y + dir * band * 0.9);
      g.stroke();
    }
    // darker seam between the chevron bands
    g.restore();
    g.fillStyle = "rgba(60,0,4,0.5)";
    g.fillRect(k * band - 1, 0, 2, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 40, 1 / 40);
  t.rotation = 0.5;
  t.anisotropy = 8;
  return t;
}

/** Two-strand twisted cable along a base curve (the ZERO:RED cable is a twisted pair). */
class Strand extends THREE.Curve {
  constructor(base, length, offset, pitch, phase) {
    super();
    Object.assign(this, { base, length, offset, pitch, phase });
  }
  getPoint(t, target = new THREE.Vector3()) {
    const p = this.base.getPointAt(t);
    const T = this.base.getTangentAt(t);
    const up = Math.abs(T.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const N = new THREE.Vector3().crossVectors(T, up).normalize();
    const B = new THREE.Vector3().crossVectors(N, T).normalize();
    const th = (t * this.length / this.pitch) * Math.PI * 2 + this.phase;
    return target.copy(p).addScaledVector(N, Math.cos(th) * this.offset).addScaledVector(B, Math.sin(th) * this.offset);
  }
}
function twisted(points, mat, { r = 0.62, offset = 0.55, pitch = 5.2, step = 1.5 } = {}) {
  const base = new THREE.CatmullRomCurve3(points, false, "centripetal");
  const len = base.getLength();
  const grp = new THREE.Group();
  for (const phase of [0, Math.PI]) {
    const strand = new Strand(base, len, offset, pitch, phase);
    grp.add(shadowed(new THREE.Mesh(new THREE.TubeGeometry(strand, Math.ceil(len / step), r, 6, false), mat)));
  }
  return { mesh: grp, curve: base };
}

/** A part aligned so its local +y runs along `dir`, centred at `pos`. */
function along(mesh, pos, dir) {
  mesh.position.copy(pos);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  const phys = (o) => { const m = new THREE.MeshPhysicalMaterial(o); k.mats.push(m); return m; };
  // glossy smoked-black resin shell, red weave faceplate under a clear coat
  const shellMat = phys({ color: 0x141218, roughness: 0.14, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.06 });
  const plateMat = phys({ color: 0xffffff, map: weaveTexture(), roughness: 0.3, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.03 });
  const chrome = k.mat(0x8e9196, { roughness: 0.35, metalness: 1 });
  const grille = k.mat(0x1a1a1c, { roughness: 0.6, metalness: 0.6 });
  const cableMat = k.mat(0x1c1d21, { roughness: 0.5, metalness: 0.05 });
  const plugMat = k.mat(0x18191c, { roughness: 0.35, metalness: 0.2 });
  const gold = k.mat(0xb39858, { roughness: 0.32, metalness: 1 });

  // faceplate outline of the right earpiece (seen from the faceplate side, apex = connector end)
  const outline = [[1.4, 10, 2.4], [-3.8, 10, 2.4], [-11, 1.2, 4.2], [-11.2, -9.2, 3.4], [10.8, -10, 3.4], [11, -2.6, 4]];
  const ends = [];

  for (const side of [-1, 1]) {           // -1 = R earpiece (desk left), +1 = L earpiece (desk right)
    const m = side < 0 ? 1 : -1;            // mirror the shape for the left earpiece
    const pts = outline.map(([x, y, r]) => [x * m, y, r]);
    if (m < 0) pts.reverse();
    const shape = roundedShape(pts);

    const ear = new THREE.Group();
    // body: rounded extrusion, tapered towards the ear side
    const body = new THREE.ExtrudeGeometry(shape, { depth: 4.5, bevelEnabled: true, bevelThickness: 3.6, bevelSize: 2.0, bevelSegments: 5, curveSegments: 8 });
    const P = body.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const z = P.getZ(i);
      const f = THREE.MathUtils.lerp(0.6, 1, THREE.MathUtils.smoothstep(z, -3.6, 6.5));
      P.setXY(i, P.getX(i) * f + 1.2 * m * (1 - f), P.getY(i) * f - 1.5 * (1 - f));
    }
    body.deleteAttribute("uv"); body.deleteAttribute("normal");
    const bodyGeo = mergeVertices(body, 1e-4);
    bodyGeo.computeVertexNormals();
    ear.add(shadowed(new THREE.Mesh(bodyGeo, shellMat)));

    // faceplate: slightly inset, domed weave plate under the clear coat
    const plate = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.6, bevelSegments: 3, curveSegments: 8 });
    const pm = new THREE.Mesh(plate, [plateMat, shellMat]);
    pm.scale.set(1.08, 1.08, 1);
    pm.position.set(0, -0.1, 7.7);
    ear.add(shadowed(pm));

    // nozzle: resin neck + chrome tip with a lip and a dark grille
    const nDir = new THREE.Vector3(0.5 * m, 0.05, -0.86).normalize();
    const nBase = new THREE.Vector3(2.5 * m, -1.5, -0.5);
    ear.add(shadowed(along(new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.6, 7, 24), shellMat), nBase.clone().addScaledVector(nDir, 3.5), nDir)));
    ear.add(shadowed(along(new THREE.Mesh(new THREE.CylinderGeometry(2.85, 2.85, 3.2, 24), chrome), nBase.clone().addScaledVector(nDir, 8.2), nDir)));
    ear.add(shadowed(along(new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.15, 0.8, 24), chrome), nBase.clone().addScaledVector(nDir, 9.5), nDir)));
    ear.add(along(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 0.2, 20), grille), nBase.clone().addScaledVector(nDir, 9.85), nDir));

    // 0.78 mm 2-pin socket at the apex and the cable's connector housing
    const u = new THREE.Vector3(0.22 * m, 1, 0).normalize();
    const apex = new THREE.Vector3(-1.4 * m, 7.4, 5.2);
    ear.add(shadowed(along(new THREE.Mesh(new RoundedBoxGeometry(6.4, 2.4, 4.6, 2, 0.8), shellMat), apex.clone().addScaledVector(u, 1.2), u)));
    const housing = new THREE.Mesh(new RoundedBoxGeometry(6.0, 9.5, 4.2, 3, 1.2), plugMat);
    ear.add(shadowed(along(housing, apex.clone().addScaledVector(u, 7.2), u)));
    ear.add(shadowed(along(new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.7, 5, 14), plugMat), apex.clone().addScaledVector(u, 14.2), u)));

    // place it: faceplate up, connector pointing away from the user, rolled onto the nozzle side
    const roll = new THREE.Group();
    ear.rotation.x = -Math.PI / 2;
    roll.add(ear);
    roll.rotation.z = -side * 0.3;
    const hold = new THREE.Group();
    hold.add(roll);
    hold.rotation.y = side * 0.18;
    hold.position.set(side * 21, 0, 0);
    g.add(hold);
    hold.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(hold);
    hold.position.y -= box.min.y;
    hold.updateMatrixWorld(true);
    ends.push({
      p: ear.localToWorld(apex.clone().addScaledVector(u, 16.5)),
      dir: ear.localToWorld(apex.clone().addScaledVector(u, 20)).sub(ear.localToWorld(apex.clone().addScaledVector(u, 16.5))).normalize(),
    });
  }

  // ear hooks: up from the connector, over in an arc and down the outside to the Y split
  const R = 1.2; // cable rests on the desk at its own radius
  const Y = new THREE.Vector3(0, 2.6, 56);
  for (const [i, side] of [[0, -1], [1, 1]]) {
    const { p, dir } = ends[i];
    const sx = side;
    const pts = [
      p, p.clone().addScaledVector(dir, 6),
      new THREE.Vector3(sx * 22, R + 2, -32), new THREE.Vector3(sx * 34, R, -38), new THREE.Vector3(sx * 45, R, -31),
      new THREE.Vector3(sx * 50, R, -15), new THREE.Vector3(sx * 48, R, 3), new THREE.Vector3(sx * 40, R, 20),
      new THREE.Vector3(sx * 26, R, 34), new THREE.Vector3(sx * 10, R, 46), new THREE.Vector3(sx * 2.2, 2.4, Y.z - 5),
    ];
    g.add(twisted(pts, cableMat).mesh);
  }
  // Y splitter
  g.add(shadowed(along(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 11, 20), plugMat), Y.clone().setY(3), new THREE.Vector3(0, 0, 1))));

  // main cable: loose loop around the left earpiece's side, ending in the plug across the top
  const main = [
    new THREE.Vector3(0, 2.6, Y.z + 5), new THREE.Vector3(4, R, 70), new THREE.Vector3(20, R, 80), new THREE.Vector3(42, R, 78),
    new THREE.Vector3(58, R, 62), new THREE.Vector3(63, R, 40), new THREE.Vector3(62, R, 14), new THREE.Vector3(62, R, -12),
    new THREE.Vector3(57, R + 1.8, -36), new THREE.Vector3(45, R + 2, -50), new THREE.Vector3(26, R, -56), new THREE.Vector3(10, R, -56),
  ];
  const { mesh: mainMesh, curve: mainCurve } = twisted(main, cableMat);
  g.add(mainMesh);
  // 3.5 mm plug: strain relief, housing, gold/silver pin with insulator rings
  const endP = mainCurve.getPointAt(1), endT = mainCurve.getTangentAt(1);
  const plugAt = (dist) => endP.clone().addScaledVector(endT, dist).setY(3.2);
  g.add(shadowed(along(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 2.4, 6, 16), plugMat), plugAt(3), endT)));
  g.add(shadowed(along(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 14, 24), plugMat), plugAt(13), endT)));
  g.add(shadowed(along(new THREE.Mesh(new THREE.CylinderGeometry(3.25, 3.25, 1.2, 24), chrome), plugAt(19.6), endT)));
  for (let i = 0; i < 3; i++) {
    g.add(along(new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, i < 2 ? 3.6 : 3.2, 16), gold), plugAt(22.3 + i * 4.2), endT));
    if (i < 2) g.add(along(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.6, 16), plugMat), plugAt(24.4 + i * 4.2), endT));
  }
  g.add(along(new THREE.Mesh(new THREE.SphereGeometry(1.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), gold), plugAt(33.4), endT));

  g.scale.setScalar(0.001);
  return g;
}
