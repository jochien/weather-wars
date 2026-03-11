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
- **Castle durability**: each castle has multiple blocks and much more than the original 8 HP, so matches last longer.

### Actions

- **Lightning**: narrow, accurate, and deeply penetrating. It can punch through the castle path and damage every block it passes through.
- **Hail**: very wide surface attack made of many small pellets. It spreads across the outer face of the castle and leaves snow behind briefly.
- **Sun beam**: a long directed beam with medium spread and medium penetration.
- **Super Rain**: an ultra-wide rainstorm that pours from the cloud for a few seconds, creates a rising puddle/flood, and erodes castle blocks touched by the water.

### Battlefield details

- The cloud is not stationary. It drifts across the sky, and all attacks launch from its current position.
- Castle graphics are more detailed and show visible damage as blocks weaken.
- Some attacks leave temporary visual after-effects:
  - **Hail** leaves snow on the ground for a short time.
  - **Super Rain** leaves a visible flooded area while the storm is active.

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
