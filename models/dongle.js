// dongle model: WLMOUSE 8K receiver ("cat head"). Origin = bottom centre on the desk (y = 0), +z = towards the
// user (the face), metres. Built in millimetres and scaled at the end.
// g.userData.cableOut = where the USB cable leaves the strain relief (local coords, metres).
import { THREE, shadowed, glow } from "../lib.js";

const SX = 20, SY = 13.5, SZ = 14; // body half extents (40 wide, 27 tall, 28 deep)
const N = 2.6;                      // superellipsoid exponent: soft, slightly boxy head
const CY = 14;                      // body centre height
const BASE = 1.6;                   // rubber base thickness

/** Distance from the body centre to its surface along unit direction u. */
const radius = (ux, uy, uz) => Math.pow(Math.abs(ux / SX) ** N + Math.abs(uy / SY) ** N + Math.abs(uz / SZ) ** N, -1 / N);
/** Point on the front surface (+z) at (x, y). */
function frontZ(x, y) {
  const r = 1 - Math.abs(x / SX) ** N - Math.abs((y - CY) / SY) ** N;
  return SZ * Math.pow(Math.max(r, 0), 1 / N);
}

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  const body = k.mat(0x16171a, { roughness: 0.62, metalness: 0.05 });
  const rubber = k.mat(0x0c0c0e, { roughness: 0.95, metalness: 0 });

  // head: a sphere pushed out to a superellipsoid, with the underside flattened onto the base
  const geo = new THREE.SphereGeometry(1, 64, 40);
  const P = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i).normalize();
    v.multiplyScalar(radius(v.x, v.y, v.z));
    v.y = Math.max(v.y + CY, BASE + 0.4 + 0.6 * (1 - Math.min(1, Math.hypot(v.x / SX, v.z / SZ)))) ;
    P.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  g.add(shadowed(new THREE.Mesh(geo, body)));

  // ears: small rounded bumps on top, leaning outwards
  for (const s of [-1, 1]) {
    const ear = shadowed(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), body));
    ear.scale.set(4.2, 5.4, 3.9);
    ear.position.set(s * 11.5, CY + SY - 2.6, -1.5);
    ear.rotation.z = -s * 0.45;
    g.add(ear);
  }

  // flat rubber base
  const base = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, BASE, 48), rubber));
  base.scale.set(SX * 0.78, 1, SZ * 0.76);
  base.position.y = BASE / 2;
  g.add(base);

  // closed, happy eyes: thin glowing arcs (like a smile) on the face
  const eyeMat = glow(0xffd23a, 1.5);
  for (const s of [-1, 1]) {
    const x = s * 7.2, y = 10.8;
    const eye = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.42, 8, 28, Math.PI * 0.9), eyeMat);
    eye.rotation.z = Math.PI + Math.PI * 0.05; // open side up: a "U"
    // sit on the curved face, tilted to its normal
    const z = frontZ(x, y);
    const dzdx = (frontZ(x + 0.5, y) - frontZ(x - 0.5, y)) / 1;
    const dzdy = (frontZ(x, y + 0.5) - frontZ(x, y - 0.5)) / 1;
    const holder = new THREE.Group();
    holder.position.set(x, y, z - 0.15);
    holder.rotation.set(Math.atan(dzdy), -Math.atan(dzdx), 0, "YXZ");
    holder.add(eye);
    eye.position.y = 1.2;
    g.add(holder);
  }

  // strain relief out of the back, low down
  const relief = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(2.6, 1.7, 8, 20), rubber));
  relief.rotation.x = Math.PI / 2;
  const backZ = -SZ * Math.pow(1 - Math.abs((7 - CY) / SY) ** N, 1 / N);
  relief.position.set(0, 7, backZ - 3);
  g.add(relief);
  const out = new THREE.Vector3(0, 7, backZ - 7);

  g.scale.setScalar(0.001);
  g.userData.cableOut = out.multiplyScalar(0.001);
  return g;
}
