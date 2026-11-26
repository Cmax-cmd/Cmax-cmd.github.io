// webcam model. Origin = bottom centre, resting on the desk top (y = 0). Units: metres.
import {
  THREE, RoundedBoxGeometry, reducedMotion, rainbow, rainbowMat, CYAN, PINK, glow, shadowed, box, cyl, at, rod,
  animators, woodTexture, skeletonTexture, meshTexture, pumpTexture, padTexture, carbonTexture, screenTex,
} from "../lib.js";

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  const body = k.mat(0x17181e, { roughness: 0.4, metalness: 0.4 });
  g.add(at(box(0.03, 0.008, 0.04, body, 0.002), 0, 0.004, 0));
  const barrel = at(cyl(0.016, 0.016, 0.09, body), 0, 0.027, 0.008);
  barrel.rotation.z = Math.PI / 2;
  g.add(barrel);
  const lens = at(cyl(0.009, 0.009, 0.004, new THREE.MeshStandardMaterial({ color: 0x050608, metalness: 1, roughness: 0.05 })), 0, 0.027, 0.025);
  lens.rotation.x = Math.PI / 2;
  g.add(lens);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.0105, 0.0012, 8, 32), glow(CYAN, 1.6));
  ring.position.set(0, 0.027, 0.0255);
  g.add(ring);
  g.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.0018, 8, 6), glow(0xff3355, 2)), 0.03, 0.027, 0.024));
  return g;
}
