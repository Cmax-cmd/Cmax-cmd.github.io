// speakers model. Origin = bottom centre, resting on the desk top (y = 0). Units: metres.
import {
  THREE, RoundedBoxGeometry, reducedMotion, rainbow, rainbowMat, CYAN, PINK, glow, shadowed, box, cyl, at, rod,
  animators, woodTexture, skeletonTexture, meshTexture, pumpTexture, padTexture, carbonTexture, screenTex,
} from "../lib.js";

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  const cab = k.mat(0x16171c, { roughness: 0.6 });
  const cone = k.mat(0x0b0c10, { roughness: 0.8 });
  for (const s of [-1, 1]) {
    const sp = new THREE.Group();
    sp.add(at(box(0.11, 0.19, 0.13, cab, 0.008), 0, 0.095, 0));
    const woof = at(cyl(0.037, 0.037, 0.006, cone), 0, 0.065, 0.066);
    woof.rotation.x = Math.PI / 2;
    const tw = at(cyl(0.015, 0.015, 0.006, cone), 0, 0.145, 0.066);
    tw.rotation.x = Math.PI / 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.039, 0.0018, 8, 40), glow(s < 0 ? CYAN : PINK, 1.6));
    ring.position.set(0, 0.065, 0.069);
    sp.add(woof, tw, ring);
    sp.position.x = s * 0.47;
    sp.rotation.y = -s * 0.25;
    g.add(sp);
  }
  return g;
}
