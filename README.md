# Stacker

A 3D building game: a flying saucer ferries one floor at a time over your tower,
you drop it, and whatever hangs over the edge gets sliced off and tumbles into
the night. The tower is never finished — it keeps going until you miss a floor
completely.

Built with [three.js](https://threejs.org/) and [Vite](https://vitejs.dev/).
No art assets: the facades, roofs and night sky are generated in code, and the
sound effects are synthesised with the Web Audio API.

## Play

```bash
npm install
npm run dev      # then open the printed localhost URL
```

Build a static bundle with `npm run build` (output in `dist/`, paths are
relative so it can be hosted from any subdirectory) and check it with
`npm run preview`.

## How it works

- **Drop a floor** — click, tap, or press <kbd>Space</kbd>.
- **Scoring** — 1 point per floor placed. The run is endless; your best score is
  kept in `localStorage`.
- **Slicing** — the overlap between the carried floor and the one below it
  becomes the new floor. The overhang is cut loose and falls away, so a sloppy
  drop makes the tower narrower and every later drop harder.
- **Landing guide** — the glowing patch shows the footprint that would survive a
  drop right now. The camera looks down at an angle, so a floor in mid-air never
  lines up on screen with the one below it; keep the patch as wide as you can.
- **Perfect drops** — land within a whisker of dead centre and nothing is cut.
  Three perfect drops in a row start giving footprint back, so a good run can
  recover.
- **Missing** — if a drop has no overlap at all, the floor falls past the tower
  and the run ends.
- **Difficulty** — the carried floor moves faster the taller the tower gets, up
  to a cap, and it always swings along an axis alternating between X and Z.

## Source layout

| File | Purpose |
| --- | --- |
| `src/main.js` | Bootstrap, input handling, render loop |
| `src/game.js` | Game state: stacking, slicing, debris, camera |
| `src/config.js` | All the tuning numbers in one place |
| `src/world.js` | Renderer, camera, lights, ground, stars |
| `src/floors.js` | Builds a floor mesh at a given size and colour |
| `src/textures.js` | Canvas-generated facade and roof textures |
| `src/ufo.js` | The saucer that carries each floor |
| `src/hud.js` | Score, overlays, best-score storage |
| `src/audio.js` | Web Audio bleeps |

Floors that sink out of the fog are disposed of as the tower grows, so memory
stays flat however long a run lasts.
