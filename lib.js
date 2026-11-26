// Shared 3D helpers, materials and procedural textures.
// Every model file in models/ imports what it needs from here.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export { THREE, RoundedBoxGeometry };
export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   Shared textures and material helpers
   ============================================================ */
export function makeRainbowTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 4;
  const g = c.getContext("2d");
  const grad = g.createLinearGradient(0, 0, 512, 0);
  for (let i = 0; i <= 12; i++) grad.addColorStop(i / 12, `hsl(${(i / 12) * 360} 100% 58%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
export const rainbow = makeRainbowTexture();
export const rainbowMat = new THREE.MeshBasicMaterial({ map: rainbow, toneMapped: false });

export const CYAN = new THREE.Color(0x4cf0ff);
export const PINK = new THREE.Color(0xff3df2);
export const glow = (color, strength = 1.6) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(strength), toneMapped: false });

/** Builder context: records every standard material so hover can tint the whole item. */
export function makeKit() {
  const mats = [];
  return {
    mats,
    mat(color, opts = {}) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...opts });
      mats.push(m);
      return m;
    },
  };
}

export function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }
export function box(w, h, d, mat, r = 0.004) {
  const rr = Math.min(r, w / 2, h / 2, d / 2) * 0.98;
  const geo = rr > 0.0005 ? new RoundedBoxGeometry(w, h, d, 3, rr) : new THREE.BoxGeometry(w, h, d);
  return shadowed(new THREE.Mesh(geo, mat));
}
export function cyl(rTop, rBot, h, mat, seg = 32) {
  return shadowed(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat));
}
export function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }

export const animators = []; // (t, hue) => void

/** Procedural walnut grain. */
export function woodTexture(rx, ry) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 512;
  const g = c.getContext("2d");
  g.fillStyle = "#6b4529";
  g.fillRect(0, 0, 512, 512);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 260; i++) {
    const y = rnd() * 512;
    const light = rnd() > 0.5;
    g.strokeStyle = light ? `rgba(160,110,70,${0.08 + rnd() * 0.15})` : `rgba(40,22,12,${0.1 + rnd() * 0.25})`;
    g.lineWidth = 0.5 + rnd() * 2.5;
    g.beginPath();
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4 + (rnd() - 0.5) * 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  return t;
}

/** Open-frame mouse shell: white = solid, black = hole (used as alphaMap). */
export function skeletonTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 512, 256);
  g.fillStyle = "#000";
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 12; col++) {
      const x = col * 42 + (row % 2) * 21 + 10;
      const y = 38 + row * 40;
      g.beginPath();
      g.ellipse(x, y, 16 + rnd() * 5, 14 + rnd() * 4, rnd() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
  }
  return new THREE.CanvasTexture(c);
}

/** Fine perforated metal / mic grille. */
export function meshTexture(repeat) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, 32, 32);
  g.fillStyle = "#6c6f76";
  for (const [x, y] of [[8, 8], [24, 8], [16, 24], [0, 24], [32, 24]]) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/** AIO pump screen showing the coolant temperature. */
export function pumpTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const bg = g.createLinearGradient(0, 0, 256, 256);
  bg.addColorStop(0, "#2a0a5e");
  bg.addColorStop(0.6, "#8a1bb8");
  bg.addColorStop(1, "#e0359b");
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = "#ffffff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "700 104px 'Space Grotesk', system-ui, sans-serif";
  g.fillText("54", 116, 120);
  g.font = "600 34px 'Space Grotesk', system-ui, sans-serif";
  g.fillText("°C", 200, 92);
  g.font = "500 20px 'JetBrains Mono', monospace";
  g.globalAlpha = 0.75;
  g.fillText("COOLANT", 128, 196);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Cloth pad surface with a small logo in the top-right corner. */
export function padTexture(logo, aspect) {
  const c = document.createElement("canvas");
  c.width = 1024; c.height = Math.round(1024 / aspect);
  const g = c.getContext("2d");
  g.fillStyle = "#2a2b30";
  g.fillRect(0, 0, c.width, c.height);
  if (logo) {
    g.fillStyle = "rgba(235,235,240,0.85)";
    g.font = "italic 700 34px 'Space Grotesk', system-ui, sans-serif";
    g.textAlign = "right";
    g.fillText(logo, c.width - 40, 60);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Red carbon-fibre weave. */
export function carbonTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#7a0b10";
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
    const lit = ((x + y) / 8) % 2 === 0;
    const grd = lit ? g.createLinearGradient(x, y, x + 8, y) : g.createLinearGradient(x, y, x, y + 8);
    grd.addColorStop(0, "#5c070b"); grd.addColorStop(0.5, "#e0202a"); grd.addColorStop(1, "#5c070b");
    g.fillStyle = grd;
    g.fillRect(x + 0.5, y + 0.5, 7, 7);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(30, 30);
  return t;
}

/** A thin rod between two points. */
export function rod(a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const mesh = cyl(r, r, dir.length(), mat, 12);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

export const screenCanvas = document.createElement("canvas");
screenCanvas.width = 1024; screenCanvas.height = 576;
export const screenTex = new THREE.CanvasTexture(screenCanvas);
screenTex.colorSpace = THREE.SRGBColorSpace;

