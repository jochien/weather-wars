# Weather Wars

A tiny, dependency-free browser aiming game you can run locally.

## Run

- Open `index.html` in a browser (double-click it).
- Or serve the folder with any static server if you prefer.
- The game is fully client-side and has no external dependencies.

## How to play

- **Goal**: destroy the enemy castle before the enemy destroys yours.
- **Origin**: every attack starts from the moving cloud at the top of the arena.
- **Turn flow**: pick an attack + set the angle -> fire -> enemy fires -> repeat.
- **Castle durability**: each castle now uses a 3x3 block grid, so matches last longer and damage spreads across a larger facade.

### Actions

- **Lightning**: narrow, accurate, deeply penetrating, and now leaves a short-lived fire effect after impact.
- **Hail**: very wide surface attack made of many small pellets. It now only damages the top row of castle blocks and leaves snow behind briefly on the ground and on the castle surface.
- **Sun beam**: a long directed beam with medium spread and medium penetration that leaves a short-lived burning patch where it lands.
- **Super Rain**: an ultra-wide rainstorm that pours from the cloud for a few seconds, creates a rising puddle/flood, and erodes castle blocks touched by the water. The flood only rises high enough to threaten the bottom row of castle blocks.

### Battlefield details

- The cloud is not stationary. It drifts across the sky, and all attacks launch from its current position.
- Wind now shifts smoothly over time. It affects cloud motion and projectile drift, and the current wind direction/speed is shown in the in-canvas HUD.
- Castles now use image-based artwork for each side and show visible damage as blocks weaken.
- The space between castles includes destructible scenery such as trees, livestock, and villagers that can be wiped out by attacks.
- Some attacks leave temporary visual after-effects:
  - **Hail** leaves snow on the ground and on impacted castle surfaces for a short time.
  - **Lightning** and **Sun beam** can leave lingering fire effects.
  - **Super Rain** leaves a visible flooded area while the storm is active.
- When the match ends, a `Game Over` overlay appears directly on the playfield.

### Angle

- The angle is measured **from the cloud**:
  - **0°** = right
  - **90°** = down
  - **180°** = left

### Keyboard

- **1–4**: select attack
- **Arrow left/right**: adjust angle by 1°
- **Space**: fire
- **H**: help

## Files

- `index.html`: layout + UI
- `styles.css`: styling
- `main.js`: game logic + canvas rendering
- `assets/`: castle artwork used by the canvas renderer
