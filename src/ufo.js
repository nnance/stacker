import * as THREE from 'three';

/**
 * The little saucer that ferries each floor into place, matching the crane in
 * the arcade original: a domed hull, a ring of running lights and a tractor beam.
 */
export function createUfo() {
  const group = new THREE.Group();

  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 32, 16),
    new THREE.MeshStandardMaterial({
      color: 0xdbe6f7,
      emissive: 0x24406b,
      roughness: 0.35,
      metalness: 0.35
    })
  );
  hull.scale.set(1, 0.3, 1);
  hull.castShadow = true;
  group.add(hull);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x8fe9ff,
      emissive: 0x1c6a86,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.72
    })
  );
  dome.position.y = 0.16;
  group.add(dome);

  const lights = [];
  const lightGeometry = new THREE.SphereGeometry(0.1, 10, 8);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const bulb = new THREE.Mesh(
      lightGeometry,
      new THREE.MeshBasicMaterial({ color: 0xff5ea8 })
    );
    bulb.position.set(Math.cos(angle) * 1.06, -0.1, Math.sin(angle) * 1.06);
    group.add(bulb);
    lights.push(bulb);
  }

  const glow = new THREE.PointLight(0x7fd8ff, 14, 12, 2);
  glow.position.y = -0.6;
  group.add(glow);

  const color = new THREE.Color();
  let carrying = true;

  return {
    group,

    /** The underside light only burns bright while a floor is in tow. */
    setCarrying(active) {
      carrying = active;
    },

    /** Cycles the running lights and adds a slow hover bob. */
    update(time) {
      lights.forEach((bulb, i) => {
        const phase = time * 3 + i * 0.5;
        color.setHSL((0.86 + Math.sin(phase) * 0.14) % 1, 0.9, 0.6);
        bulb.material.color.copy(color);
      });
      group.rotation.y = time * 0.6;
      const target = carrying ? 12 + Math.sin(time * 4) * 3 : 2;
      glow.intensity += (target - glow.intensity) * 0.08;
    }
  };
}
