import * as THREE from 'three';
import { CONFIG } from './config.js';

/** Renderer, camera, lights and the static scenery the tower is built on. */
export function createWorld(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0d1430, 26, 54);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.5, 240);
  const CAMERA_OFFSET = new THREE.Vector3(15.5, 11, 15.5);

  scene.add(new THREE.HemisphereLight(0x9fc4ff, 0x1b2140, 1.5));

  const key = new THREE.DirectionalLight(0xfff0d8, 2.1);
  key.position.set(9, 16, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.camera.left = -14;
  key.shadow.camera.right = 14;
  key.shadow.camera.top = 18;
  key.shadow.camera.bottom = -18;
  key.shadow.bias = -0.0015;
  scene.add(key);
  scene.add(key.target);

  const rim = new THREE.DirectionalLight(0x6ee7ff, 0.7);
  rim.position.set(-10, 6, -8);
  scene.add(rim);

  // The plot the tower stands on.
  const ground = new THREE.Group();

  const podium = new THREE.Mesh(
    new THREE.CylinderGeometry(7.5, 8.2, 1.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x33477e, roughness: 0.85, metalness: 0.1 })
  );
  podium.position.y = -0.7 - CONFIG.floorHeight / 2;
  podium.receiveShadow = true;
  ground.add(podium);

  const apron = new THREE.Mesh(
    new THREE.CylinderGeometry(13, 13, 0.6, 48),
    new THREE.MeshStandardMaterial({ color: 0x1b2547, roughness: 1 })
  );
  apron.position.y = -1.6 - CONFIG.floorHeight / 2;
  apron.receiveShadow = true;
  ground.add(apron);

  scene.add(ground);

  scene.add(createStars());

  return { renderer, scene, camera, cameraOffset: CAMERA_OFFSET, key, ground };
}

function createStars() {
  const count = 420;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = 60 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 0.9);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) * 0.9 + 20;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: 0xbcd8ff, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.85 })
  );
  stars.frustumCulled = false;
  return stars;
}

export function resize(renderer, camera) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  // Pull back a little on tall/narrow phone screens so the tower still fits.
  camera.fov = camera.aspect < 0.72 ? 48 : 36;
  camera.updateProjectionMatrix();
}
