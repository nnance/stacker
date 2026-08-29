import * as THREE from 'three';

const FACADE_VARIANTS = 6;
const TILE = 128;

function canvas2d(w, h) {
  const el = document.createElement('canvas');
  el.width = w;
  el.height = h;
  return { el, ctx: el.getContext('2d') };
}

function toTexture(el, anisotropy) {
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = anisotropy;
  return tex;
}

// One tile is one world unit wide and one floor tall: two windows side by side,
// a slab line at the bottom, and a lit/unlit pattern that varies per variant.
function drawFacade(seed) {
  const base = canvas2d(TILE, TILE);
  const glow = canvas2d(TILE, TILE);

  base.ctx.fillStyle = '#ffffff';
  base.ctx.fillRect(0, 0, TILE, TILE);

  // Slab band between floors, drawn slightly darker than the wall.
  base.ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  base.ctx.fillRect(0, 0, TILE, TILE * 0.14);
  base.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  base.ctx.fillRect(0, TILE * 0.14, TILE, 3);

  glow.ctx.fillStyle = '#000000';
  glow.ctx.fillRect(0, 0, TILE, TILE);

  const cols = 2;
  const w = TILE * 0.2;
  const h = TILE * 0.42;
  const top = TILE * 0.32;

  for (let c = 0; c < cols; c++) {
    const x = TILE * (0.18 + c * 0.46);
    const lit = ((seed * 7 + c * 13 + 3) % 5) > 1;

    base.ctx.fillStyle = lit ? '#ffe6b0' : 'rgba(0, 0, 0, 0.45)';
    roundRect(base.ctx, x, top, w, h, 3);
    base.ctx.fill();

    // Window frame.
    base.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    base.ctx.lineWidth = 2;
    roundRect(base.ctx, x, top, w, h, 3);
    base.ctx.stroke();

    if (lit) {
      glow.ctx.fillStyle = '#ffc978';
      roundRect(glow.ctx, x, top, w, h, 3);
      glow.ctx.fill();
    }
  }

  return { base: base.el, glow: glow.el };
}

function drawRoof() {
  const { el, ctx } = canvas2d(TILE, TILE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, TILE, TILE);

  // Parapet around the edge.
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, TILE - 10, TILE - 10);

  // A little rooftop clutter so the top of the tower reads as a building.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  ctx.fillRect(TILE * 0.22, TILE * 0.24, TILE * 0.2, TILE * 0.16);
  ctx.fillRect(TILE * 0.58, TILE * 0.56, TILE * 0.24, TILE * 0.2);
  return el;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createTextures(anisotropy = 4) {
  const facades = [];
  for (let i = 0; i < FACADE_VARIANTS; i++) {
    const { base, glow } = drawFacade(i);
    facades.push({
      map: toTexture(base, anisotropy),
      emissive: toTexture(glow, anisotropy)
    });
  }
  return { facades, roof: toTexture(drawRoof(), anisotropy) };
}
