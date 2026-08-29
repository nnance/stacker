import * as THREE from 'three';
import { CONFIG } from './config.js';

// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z.
const SIDE_GROUPS = [0, 1, 4, 5];

/**
 * Stretches the box UVs so the facade tile keeps a constant real-world size
 * however wide or deep the floor is. Cheaper than cloning textures per floor.
 */
function tileUVs(geometry, width, depth, height) {
  const uv = geometry.attributes.uv;
  const rows = height / CONFIG.floorHeight;

  for (const group of SIDE_GROUPS) {
    const cols = group < 2 ? depth : width; // ±X faces span depth, ±Z span width
    const start = group * 4;
    for (let i = start; i < start + 4; i++) {
      uv.setXY(i, uv.getX(i) * cols, uv.getY(i) * rows);
    }
  }
  uv.needsUpdate = true;
}

export function hueFor(index) {
  return CONFIG.hueStart + index * CONFIG.hueDrift;
}

export class FloorFactory {
  constructor(textures) {
    this.textures = textures;
  }

  /** Builds a single slab of building: lit facade on the sides, roof on top. */
  create(width, height, depth, index) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    tileUVs(geometry, width, depth, height);

    const variant = this.textures.facades[index % this.textures.facades.length];
    const color = new THREE.Color().setHSL(
      (((hueFor(index) % 360) + 360) % 360) / 360,
      0.52,
      0.56
    );

    const wall = new THREE.MeshStandardMaterial({
      color,
      map: variant.map,
      emissive: 0xffffff,
      emissiveMap: variant.emissive,
      emissiveIntensity: 1.1,
      roughness: 0.72,
      metalness: 0.05
    });

    const roof = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.82),
      map: this.textures.roof,
      roughness: 0.85,
      metalness: 0.02
    });

    const underside = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.45),
      roughness: 1
    });

    const mesh = new THREE.Mesh(geometry, [wall, wall, roof, underside, wall, wall]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  dispose(mesh) {
    mesh.geometry.dispose();
    for (const material of new Set(mesh.material)) {
      material.dispose();
    }
  }
}
