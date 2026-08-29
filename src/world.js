import * as THREE from 'three';
import { CONFIG } from './config.js';

// Narrowest lens the game uses; it widens only when a screen is too narrow to
// fit the play area from a sensible distance.
const MIN_HALF_FOV = THREE.MathUtils.degToRad(17);
const MAX_HALF_FOV = THREE.MathUtils.degToRad(30);
const PREFERRED_DISTANCE = 26;

// A low, near-corner view, matching the arcade cabinet: the roof is only just
// visible, so a floor in mid-air sits almost straight above the one below it
// on screen and lining the two up is a matter of reading their side edges.
const CAMERA_ELEVATION = THREE.MathUtils.degToRad(15);
const CAMERA_AZIMUTH = Math.PI / 4;
const CAMERA_DIRECTION = new THREE.Vector3(
  Math.cos(CAMERA_ELEVATION) * Math.sin(CAMERA_AZIMUTH),
  Math.sin(CAMERA_ELEVATION),
  Math.cos(CAMERA_ELEVATION) * Math.cos(CAMERA_AZIMUTH)
);

// World-space box the camera has to keep in shot around the top of the tower:
// wide enough for a floor sliding out to the end of its travel.
const FRAME_WIDTH = 13.5;
const FRAME_HEIGHT = 12;

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

  const camera = new THREE.PerspectiveCamera(34, 1, 0.5, 240);
  // Filled in by resize(): direction is fixed, distance is whatever it takes
  // to fit the play area on the screen at hand.
  const cameraOffset = new THREE.Vector3();

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

  return { renderer, scene, camera, cameraOffset, key, ground };
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

/**
 * Fits the play area on screen by moving the camera along a fixed viewing
 * direction, widening the lens only for screens too narrow to manage from a
 * sensible distance. The arcade angle survives everything from a phone in
 * portrait to a wide desktop window.
 */
export function resize({ renderer, camera, cameraOffset }) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;

  // Widen the lens only as far as this screen shape demands, then back the
  // camera off by however much that lens needs to frame the play area.
  const wanted = Math.atan(FRAME_WIDTH / 2 / PREFERRED_DISTANCE / camera.aspect);
  const halfV = THREE.MathUtils.clamp(wanted, MIN_HALF_FOV, MAX_HALF_FOV);
  camera.fov = THREE.MathUtils.radToDeg(halfV * 2);
  camera.updateProjectionMatrix();

  const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
  const distance = Math.max(
    FRAME_WIDTH / 2 / Math.tan(halfH),
    FRAME_HEIGHT / 2 / Math.tan(halfV)
  );
  cameraOffset.copy(CAMERA_DIRECTION).multiplyScalar(distance);
}
