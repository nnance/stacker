import * as THREE from 'three';
import { CONFIG, travelFor } from './config.js';
import { FloorFactory } from './floors.js';
import { createUfo } from './ufo.js';

const AXES = ['x', 'z'];

/**
 * Outline of the footprint a drop would keep. The camera looks down at an
 * angle, so a floor in mid-air never lines up on screen with the one below it;
 * this traces the real landing spot instead. Drawn over the top of everything
 * (the sliding floor would otherwise hide it) and it shrinks as the drop drifts
 * off centre, so the player just keeps it as wide as they can.
 */
function createLandingGuide() {
  const guide = new THREE.Group();

  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      color: 0x6ee7ff,
      transparent: true,
      opacity: 0.2,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  fill.rotation.x = -Math.PI / 2;
  fill.renderOrder = 9;
  guide.add(fill);

  const half = 0.5;
  const corners = new Float32Array([
    -half, 0, -half,
    half, 0, -half,
    half, 0, half,
    -half, 0, half
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(corners, 3));

  const outline = new THREE.LineLoop(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xdffaff, transparent: true, opacity: 0.95, depthTest: false })
  );
  outline.renderOrder = 10;
  guide.add(outline);

  guide.visible = false;
  return guide;
}

const easeIn = (t) => t * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);

export class Game {
  constructor({ world, textures, sound, hud }) {
    this.world = world;
    this.sound = sound;
    this.hud = hud;
    this.factory = new FloorFactory(textures);

    this.tower = new THREE.Group();
    world.scene.add(this.tower);

    this.debrisGroup = new THREE.Group();
    world.scene.add(this.debrisGroup);

    this.ufo = createUfo();
    world.scene.add(this.ufo.group);

    this.landingGuide = createLandingGuide();
    world.scene.add(this.landingGuide);

    this.focus = new THREE.Vector3(0, 2.5, 0);
    this.ufoTarget = new THREE.Vector3();
    this.state = 'ready';
    this.floors = [];
    this.debris = [];
    this.dropping = [];
    this.effects = [];

    this.reset();
  }

  // ---------------------------------------------------------------- lifecycle

  reset() {
    // Floors still landing share their mesh with this.floors, hence the set.
    const meshes = new Set();
    for (const floor of this.floors) {
      if (floor.mesh) meshes.add(floor.mesh);
    }
    for (const piece of this.debris) {
      meshes.add(piece.mesh);
    }
    if (this.moving) meshes.add(this.moving.mesh);

    for (const mesh of meshes) {
      mesh.removeFromParent();
      this.factory.dispose(mesh);
    }
    for (const effect of this.effects) {
      this.world.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      effect.mesh.material.dispose();
    }

    this.floors = [];
    this.debris = [];
    this.dropping = [];
    this.effects = [];
    this.moving = null;
    this.score = 0;
    this.streak = 0;
    this.state = 'ready';

    for (let i = 0; i < CONFIG.foundationFloors; i++) {
      this.addFloor(0, 0, CONFIG.baseSize, CONFIG.baseSize, i * CONFIG.floorHeight);
    }
    this.focus.set(0, this.topFloor().y + 1.7, 0);
    this.snapCamera();
    this.hud.setScore(0);
  }

  start() {
    if (this.state !== 'ready') return;
    this.state = 'playing';
    this.spawnCarriedFloor();
    this.hud.onStart();
  }

  // ------------------------------------------------------------------ helpers

  topFloor() {
    return this.floors[this.floors.length - 1];
  }

  addFloor(cx, cz, width, depth, y) {
    const mesh = this.factory.create(width, CONFIG.floorHeight, depth, this.floors.length);
    mesh.position.set(cx, y, cz);
    this.tower.add(mesh);
    const floor = { mesh, cx, cz, w: width, d: depth, y };
    this.floors.push(floor);
    return floor;
  }

  /** Speed grows with the tower so it keeps getting harder forever. */
  currentSpeed() {
    return Math.min(CONFIG.maxSpeed, CONFIG.startSpeed + this.score * CONFIG.speedGain);
  }

  spawnCarriedFloor() {
    const top = this.topFloor();
    const axis = AXES[this.floors.length % 2];
    const size = axis === 'x' ? top.w : top.d;
    const centre = axis === 'x' ? top.cx : top.cz;
    const travel = travelFor(size);
    const direction = Math.random() < 0.5 ? 1 : -1;

    const mesh = this.factory.create(top.w, CONFIG.floorHeight, top.d, this.floors.length);
    mesh.position.set(top.cx, top.y + CONFIG.floorHeight + CONFIG.carryGap, top.cz);
    mesh.position[axis] = centre - direction * travel;
    this.tower.add(mesh);

    this.moving = {
      mesh,
      axis,
      centre,
      travel,
      direction,
      restY: top.y + CONFIG.floorHeight,
      w: top.w,
      d: top.d
    };
  }

  // --------------------------------------------------------------------- drop

  drop() {
    if (this.state === 'ready') {
      this.start();
      return;
    }
    if (this.state !== 'playing' || !this.moving) return;

    const top = this.topFloor();
    const { axis, mesh, restY } = this.moving;
    const size = axis === 'x' ? top.w : top.d;
    const centre = axis === 'x' ? top.cx : top.cz;
    const offset = mesh.position[axis] - centre;
    const overlap = size - Math.abs(offset);

    if (overlap <= CONFIG.missThreshold) {
      this.missed(offset);
      return;
    }

    const perfect = Math.abs(offset) <= CONFIG.perfectEps;
    let newSize;
    let newCentre;

    if (perfect) {
      this.streak += 1;
      // A sustained run of accurate drops hands some footprint back.
      newSize = this.streak >= CONFIG.rewardStreak
        ? Math.min(CONFIG.baseSize, size + CONFIG.perfectReward)
        : size;
      newCentre = centre;
    } else {
      newSize = overlap;
      newCentre = centre + offset / 2;
      this.streak = 0;
    }

    const width = axis === 'x' ? newSize : this.moving.w;
    const depth = axis === 'x' ? this.moving.d : newSize;
    const cx = axis === 'x' ? newCentre : top.cx;
    const cz = axis === 'x' ? top.cz : newCentre;

    const floor = this.addFloor(cx, cz, width, depth, restY);
    floor.mesh.position.y = mesh.position.y;
    this.dropping.push({ mesh: floor.mesh, from: mesh.position.y, to: restY, t: 0, phase: 'fall' });

    if (!perfect) {
      this.spawnOffcut(axis, offset, size, centre, mesh.position.y);
    } else {
      this.effects.push(this.createPulse(cx, restY, cz, Math.max(width, depth)));
    }

    this.tower.remove(mesh);
    this.factory.dispose(mesh);
    this.moving = null;

    this.score += 1;
    this.hud.setScore(this.score);
    if (perfect) {
      this.hud.showCombo(this.streak);
      this.sound.perfect(this.streak);
    } else {
      this.sound.place(this.score);
    }

    this.spawnCarriedFloor();
  }

  /** The overhang that got sliced off, tumbling away from the tower. */
  spawnOffcut(axis, offset, size, centre, y) {
    const cut = Math.abs(offset);
    const sign = Math.sign(offset);
    // The off-cut sits just beyond the edge of the floor below.
    const position = centre + sign * (size / 2 + cut / 2);

    const width = axis === 'x' ? cut : this.moving.w;
    const depth = axis === 'x' ? this.moving.d : cut;
    const mesh = this.factory.create(width, CONFIG.floorHeight, depth, this.floors.length - 1);
    mesh.position.set(this.moving.mesh.position.x, y, this.moving.mesh.position.z);
    mesh.position[axis] = position;
    this.debrisGroup.add(mesh);

    const velocity = new THREE.Vector3(0, 1.2, 0);
    velocity[axis] = sign * (1.6 + cut * 0.4);
    this.debris.push({
      mesh,
      velocity,
      spin: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        sign * (1.5 + Math.random())
      )
    });
  }

  missed(offset) {
    const { mesh, axis } = this.moving;
    this.debrisGroup.add(mesh); // hands the mesh over from the tower group

    const velocity = new THREE.Vector3(0, 1.5, 0);
    velocity[axis] = Math.sign(offset || 1) * 2.4;
    this.debris.push({
      mesh,
      velocity,
      spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.sign(offset || 1) * 2)
    });

    this.moving = null;
    this.state = 'over';
    this.sound.fail();
    this.hud.gameOver(this.score);
  }

  createPulse(x, y, z, size) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(size * 0.52, size * 0.6, 40),
      new THREE.MeshBasicMaterial({
        color: 0x9ff0ff,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + CONFIG.floorHeight / 2 + 0.02, z);
    this.world.scene.add(mesh);
    return { mesh, t: 0 };
  }

  // -------------------------------------------------------------------- frame

  update(dt, time) {
    this.updateCarried(dt);
    this.updateLandingGuide();
    this.updateDropping(dt);
    this.updateDebris(dt);
    this.updateEffects(dt);
    this.updateUfo(dt, time);
    this.updateCamera(dt);
    this.cullFloors();
  }

  updateCarried(dt) {
    if (!this.moving) return;
    const { axis, centre, travel } = this.moving;
    const position = this.moving.mesh.position;

    position[axis] += this.moving.direction * this.currentSpeed() * dt;

    if (position[axis] > centre + travel) {
      position[axis] = centre + travel;
      this.moving.direction = -1;
    } else if (position[axis] < centre - travel) {
      position[axis] = centre - travel;
      this.moving.direction = 1;
    }
  }

  /** Draws the slice that would survive a drop at the floor's current position. */
  updateLandingGuide() {
    if (!this.moving) {
      this.landingGuide.visible = false;
      return;
    }

    const top = this.topFloor();
    const { axis } = this.moving;
    const size = axis === 'x' ? top.w : top.d;
    const centre = axis === 'x' ? top.cx : top.cz;
    const offset = this.moving.mesh.position[axis] - centre;
    const overlap = size - Math.abs(offset);

    this.landingGuide.visible = overlap > CONFIG.missThreshold;
    if (!this.landingGuide.visible) return;

    const landing = centre + offset / 2;
    this.landingGuide.scale.set(
      axis === 'x' ? overlap : this.moving.w,
      1,
      axis === 'x' ? this.moving.d : overlap
    );
    this.landingGuide.position.set(
      axis === 'x' ? landing : top.cx,
      top.y + CONFIG.floorHeight / 2 + 0.012,
      axis === 'x' ? top.cz : landing
    );
  }

  updateDropping(dt) {
    for (let i = this.dropping.length - 1; i >= 0; i--) {
      const item = this.dropping[i];
      if (item.phase === 'fall') {
        item.t += dt / CONFIG.dropDuration;
        if (item.t >= 1) {
          item.mesh.position.y = item.to;
          item.t = 0;
          item.phase = 'settle';
        } else {
          item.mesh.position.y = item.from + (item.to - item.from) * easeIn(item.t);
        }
      } else {
        // Short squash-and-stretch so landings have some weight to them.
        item.t += dt / 0.16;
        const k = Math.sin(Math.min(item.t, 1) * Math.PI) * 0.16;
        item.mesh.scale.set(1 + k * 0.6, 1 - k, 1 + k * 0.6);
        if (item.t >= 1) {
          item.mesh.scale.set(1, 1, 1);
          this.dropping.splice(i, 1);
        }
      }
    }
  }

  updateDebris(dt) {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const piece = this.debris[i];
      piece.velocity.y -= CONFIG.gravity * dt;
      piece.mesh.position.addScaledVector(piece.velocity, dt);
      piece.mesh.rotation.x += piece.spin.x * dt;
      piece.mesh.rotation.y += piece.spin.y * dt;
      piece.mesh.rotation.z += piece.spin.z * dt;

      if (piece.mesh.position.y < this.focus.y - 40) {
        this.debrisGroup.remove(piece.mesh);
        this.factory.dispose(piece.mesh);
        this.debris.splice(i, 1);
      }
    }
  }

  updateEffects(dt) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.t += dt / 0.4;
      const k = Math.min(effect.t, 1);
      effect.mesh.scale.setScalar(1 + easeOut(k) * 0.45);
      effect.mesh.material.opacity = 0.85 * (1 - k);
      if (effect.t >= 1) {
        this.world.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
        this.effects.splice(i, 1);
      }
    }
  }

  updateUfo(dt, time) {
    const target = this.moving
      ? this.moving.mesh.position
      : this.ufoTarget.set(this.focus.x, this.topFloor().y + CONFIG.carryGap + 2.5, this.focus.z);

    const hover = 1.5 + Math.sin(time * 1.6) * 0.08;
    this.ufo.group.position.x += (target.x - this.ufo.group.position.x) * Math.min(1, dt * 12);
    this.ufo.group.position.z += (target.z - this.ufo.group.position.z) * Math.min(1, dt * 12);
    this.ufo.group.position.y += (target.y + hover - this.ufo.group.position.y) * Math.min(1, dt * 8);
    this.ufo.setCarrying(Boolean(this.moving));
    this.ufo.update(time);
  }

  updateCamera(dt) {
    const top = this.topFloor();
    const pullBack = this.state === 'over' ? 1.16 : 1;
    const targetY = top.y + 1.7;

    this.focus.x += (top.cx * 0.55 - this.focus.x) * Math.min(1, dt * 3);
    this.focus.z += (top.cz * 0.55 - this.focus.z) * Math.min(1, dt * 3);
    this.focus.y += (targetY - this.focus.y) * Math.min(1, dt * 4);

    const { camera, cameraOffset, key } = this.world;
    camera.position.set(
      this.focus.x + cameraOffset.x * pullBack,
      this.focus.y + cameraOffset.y * pullBack,
      this.focus.z + cameraOffset.z * pullBack
    );
    camera.lookAt(this.focus);

    key.position.set(this.focus.x + 9, this.focus.y + 16, this.focus.z + 7);
    key.target.position.copy(this.focus);
    key.target.updateMatrixWorld();
  }

  snapCamera() {
    const { camera, cameraOffset } = this.world;
    camera.position.copy(this.focus).add(cameraOffset);
    camera.lookAt(this.focus);
  }

  /**
   * Floors that have sunk out of the fog are never seen again, so their meshes
   * are thrown away. That keeps memory flat no matter how tall the tower gets.
   */
  cullFloors() {
    const cutoff = this.topFloor().y - CONFIG.visibleFloors * CONFIG.floorHeight;
    for (let i = this.floors.length - 1; i >= 0; i--) {
      const floor = this.floors[i];
      if (!floor.mesh) break; // everything below has already been recycled
      if (floor.y >= cutoff) continue;
      this.tower.remove(floor.mesh);
      this.factory.dispose(floor.mesh);
      floor.mesh = null;
    }
    this.world.ground.visible = cutoff <= 0;
  }
}
