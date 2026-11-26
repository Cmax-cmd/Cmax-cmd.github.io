// headset model. Origin = bottom centre, resting on the desk top (y = 0). Units: metres.
import {
  THREE, RoundedBoxGeometry, reducedMotion, rainbow, rainbowMat, CYAN, PINK, glow, shadowed, box, cyl, at, rod,
  animators, woodTexture, skeletonTexture, meshTexture, pumpTexture, padTexture, carbonTexture, screenTex,
} from "../lib.js";

/** @param k builder kit (k.mat(color, opts) makes a hover-tintable material)  @param d gear.js entry */
export function build(k, d) {
  const g = new THREE.Group();
  const stand = k.mat(0x17181e, { metalness: 0.8, roughness: 0.25 });
  g.add(at(cyl(0.055, 0.06, 0.012, stand), 0, 0.006, 0));
  g.add(at(cyl(0.008, 0.008, 0.28, stand, 16), 0, 0.15, 0));
  g.add(at(box(0.07, 0.014, 0.035, stand, 0.004), 0, 0.29, 0));
  const shell = k.mat(0x22242d, { roughness: 0.5 });
  const band = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.012, 14, 48, Math.PI), shell));
  band.position.y = 0.297 - 0.088 + 0.004;
  g.add(band);
  for (const s of [-1, 1]) {
    const cup = at(cyl(0.046, 0.046, 0.034, shell), s * 0.09, 0.19, 0);
    cup.rotation.z = Math.PI / 2;
    g.add(cup);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0025, 8, 40), glow(s < 0 ? CYAN : PINK, 1.8));
    ring.position.set(s * 0.108, 0.19, 0);
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
    const pad = at(cyl(0.042, 0.042, 0.02, k.mat(0x0d0e12, { roughness: 1 })), s * 0.066, 0.19, 0);
    pad.rotation.z = Math.PI / 2;
    g.add(pad);
  }
  return g;
}
