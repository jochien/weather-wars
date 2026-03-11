const ATTACKS = [
  {
    id: "lightning",
    name: "Lightning",
    description: "Narrow strike, deep penetration + fire",
    speed: 470,
    spread: 3,
    radius: 8,
    impactWidth: 22,
    penetration: 3,
    pellets: 1,
    pelletScatter: 0,
    baseDamage: 3,
    burnDuration: 2.4,
    burnInterval: 0.6,
    color: "#fff4a3",
  },
  {
    id: "hail",
    name: "Hail",
    description: "Wide burst, shallow penetration",
    speed: 430,
    spread: 10,
    radius: 11,
    impactWidth: 56,
    penetration: 1,
    pellets: 16,
    pelletScatter: 40,
    baseDamage: 1,
    color: "#bfe8ff",
  },
  {
    id: "sunbeam",
    name: "Sun beam",
    description: "Medium width, scorching beam + fire",
    speed: 390,
    spread: 13,
    radius: 15,
    impactWidth: 28,
    penetration: 2,
    pellets: 2,
    pelletScatter: 10,
    baseDamage: 2,
    burnDuration: 3,
    burnInterval: 0.6,
    color: "#ffd166",
  },
  {
    id: "super-rain",
    name: "Super Rain",
    description: "Ultra wide rain, rising flood",
    speed: 0,
    spread: 7,
    radius: 0,
    impactWidth: 250,
    penetration: 0,
    pellets: 0,
    pelletScatter: 0,
    baseDamage: 1,
    duration: 3.2,
    erosionInterval: 0.45,
    floodHeight: 92,
    drops: 48,
    color: "#7fd6ff",
  },
];

const PLAYER_CASTLE_X = 90;
const ENEMY_CASTLE_X = 730;
const CASTLE_Y = 360;
const BLOCK_WIDTH = 34;
const BLOCK_HEIGHT = 34;
const BLOCK_GAP = 4;
const BLOCK_HP = 5;
const GROUND_Y = 470;
const CLOUD = {
  baseX: 480,
  baseY: 88,
  radius: 44,
  driftX: 210,
  driftY: 10,
  speed: 0.00022,
};
const GRAVITY = 240;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const attackList = document.getElementById("attack-list");
const angleSlider = document.getElementById("angle-slider");
const angleValue = document.getElementById("angle-value");
const fireButton = document.getElementById("fire-button");
const helpButton = document.getElementById("help-button");
const restartButton = document.getElementById("restart-button");
const helpDialog = document.getElementById("help-dialog");
const playerHpEl = document.getElementById("player-hp");
const enemyHpEl = document.getElementById("enemy-hp");
const turnStatusEl = document.getElementById("turn-status");
const messageLogEl = document.getElementById("message-log");

const state = {
  angle: 135,
  selectedAttack: 0,
  turn: "player",
  winner: null,
  projectile: null,
  weatherEffect: null,
  activeExplosion: null,
  lingeringEffects: [],
  pendingEnemyShotAt: 0,
  message: "Choose an attack, set an angle, and fire from the cloud.",
  cloud: {
    x: CLOUD.baseX,
    y: CLOUD.baseY,
  },
  wind: {
    current: 0,
    target: 0,
    nextShiftAt: 0,
  },
  castles: {
    player: [],
    enemy: [],
  },
};

function createCastle(side, x) {
  const blocks = [];
  const colors = side === "player"
    ? ["#7ce0ff", "#57c6ff", "#3aa8df"]
    : ["#d7dbe2", "#aeb7c2", "#8b96a3"];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      blocks.push({
        x: x + (col * (BLOCK_WIDTH + BLOCK_GAP)),
        y: CASTLE_Y + (row * (BLOCK_HEIGHT + BLOCK_GAP)),
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        hp: BLOCK_HP,
        maxHp: BLOCK_HP,
        color: colors[col],
      });
    }
  }

  return blocks;
}

function resetGame() {
  state.angle = 135;
  state.selectedAttack = 0;
  state.turn = "player";
  state.winner = null;
  state.projectile = null;
  state.weatherEffect = null;
  state.activeExplosion = null;
  state.lingeringEffects = [];
  state.pendingEnemyShotAt = 0;
  state.message = "Choose an attack, set an angle, and fire from the cloud.";
  state.cloud.x = CLOUD.baseX;
  state.cloud.y = CLOUD.baseY;
  state.wind.current = 0;
  state.wind.target = randomBetween(-1.4, 1.4);
  state.wind.nextShiftAt = performance.now() + randomBetween(2600, 4800);
  state.castles.player = createCastle("player", PLAYER_CASTLE_X);
  state.castles.enemy = createCastle("enemy", ENEMY_CASTLE_X);
  syncUi();
}

function updateCloud(now) {
  state.cloud.x = CLOUD.baseX + Math.sin(now * CLOUD.speed) * CLOUD.driftX + (state.wind.current * 48);
  state.cloud.y = CLOUD.baseY + Math.cos(now * CLOUD.speed * 1.8) * CLOUD.driftY;
}

function updateWind(now, deltaSeconds) {
  if (now >= state.wind.nextShiftAt) {
    state.wind.target = randomBetween(-2.2, 2.2);
    state.wind.nextShiftAt = now + randomBetween(2600, 5200);
  }

  const easing = 1 - Math.exp(-deltaSeconds * 1.3);
  state.wind.current += (state.wind.target - state.wind.current) * easing;
}

function totalHp(side) {
  return state.castles[side].reduce((sum, block) => sum + block.hp, 0);
}

function syncUi() {
  angleSlider.value = String(state.angle);
  angleValue.textContent = String(state.angle);
  playerHpEl.textContent = String(totalHp("player"));
  enemyHpEl.textContent = String(totalHp("enemy"));
  turnStatusEl.textContent = state.winner
    ? `${state.winner === "player" ? "You win" : "Enemy wins"}`
    : state.turn === "player"
      ? "Your move"
      : "Enemy aiming";
  messageLogEl.textContent = state.message;

  Array.from(attackList.children).forEach((button, index) => {
    button.classList.toggle("active", index === state.selectedAttack);
    button.setAttribute("aria-checked", index === state.selectedAttack ? "true" : "false");
  });

  const disabled = state.turn !== "player" || Boolean(state.projectile) || Boolean(state.weatherEffect) || Boolean(state.winner);
  fireButton.disabled = disabled;
  angleSlider.disabled = disabled;
}

function buildAttackOptions() {
  ATTACKS.forEach((attack, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "attack-option";
    button.setAttribute("role", "radio");
    button.innerHTML = `
      <span class="attack-index">${index + 1}</span>
      <span class="attack-meta">
        <strong>${attack.name}</strong>
        <span>${attack.description}</span>
      </span>
    `;
    button.addEventListener("click", () => {
      if (state.turn !== "player" || state.projectile || state.weatherEffect || state.winner) {
        return;
      }
      state.selectedAttack = index;
      state.message = `${attack.name} selected.`;
      syncUi();
    });
    attackList.appendChild(button);
  });
}

function fire(side, chosenAngle, attackIndex) {
  const attack = ATTACKS[attackIndex];
  if (attack.id === "super-rain") {
    startSuperRain(side, chosenAngle, attackIndex);
    if (side === "enemy") {
      state.pendingEnemyShotAt = Number.POSITIVE_INFINITY;
    }
    return;
  }

  const radians = (chosenAngle * Math.PI) / 180;
  const offset = side === "player" ? randomBetween(-attack.spread, attack.spread) : randomBetween(-attack.spread - 2, attack.spread + 2);
  const adjustedRadians = radians + ((offset * Math.PI) / 180);

  state.projectile = {
    side,
    attackIndex,
    x: state.cloud.x,
    y: state.cloud.y + 10,
    vx: Math.cos(adjustedRadians) * attack.speed,
    vy: Math.sin(adjustedRadians) * attack.speed,
    windFactor: 18 + (Math.abs(Math.cos(adjustedRadians)) * 10),
    radius: attack.radius,
    color: attack.color,
    trail: [],
  };

  if (side === "enemy") {
    state.pendingEnemyShotAt = Number.POSITIVE_INFINITY;
  }

  state.message = `${side === "player" ? "You fire" : "Enemy fires"} ${attack.name.toLowerCase()} at ${Math.round(chosenAngle)}°.`;
  syncUi();
}

function startSuperRain(side, chosenAngle, attackIndex) {
  const attack = ATTACKS[attackIndex];
  const radians = ((chosenAngle + randomBetween(-attack.spread, attack.spread)) * Math.PI) / 180;
  const centerX = projectAngleToGround(radians);
  const maxWaterHeight = getFloodMaxHeight();
  state.weatherEffect = {
    id: attack.id,
    side,
    attackIndex,
    centerX,
    width: attack.impactWidth,
    duration: attack.duration,
    elapsed: 0,
    erosionInterval: attack.erosionInterval,
    erosionTimer: 0,
    waterHeight: 0,
    maxWaterHeight,
    totalHits: { player: 0, enemy: 0 },
    drops: createRainDrops(attack.drops),
  };
  state.message = `${side === "player" ? "You call" : "Enemy calls"} Super Rain over a wide zone.`;
  syncUi();
}

function projectAngleToGround(radians) {
  const startX = state.cloud.x;
  const startY = state.cloud.y + 10;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);

  if (dy <= 0.05) {
    return clamp(startX + (dx * 260), 40, canvas.width - 40);
  }

  const timeToGround = (GROUND_Y - startY) / dy;
  return clamp(startX + (dx * timeToGround), 40, canvas.width - 40);
}

function createRainDrops(count) {
  return Array.from({ length: count }, () => ({
    xOffset: randomBetween(-0.5, 0.5),
    phase: Math.random(),
    speed: randomBetween(0.9, 1.4),
    length: randomBetween(18, 36),
  }));
}

function scheduleEnemyTurn() {
  state.turn = "enemy";
  state.pendingEnemyShotAt = performance.now() + 800;
  syncUi();
}

function resolveTurnEnd(nextMessage) {
  const playerHp = totalHp("player");
  const enemyHp = totalHp("enemy");

  if (playerHp <= 0 || enemyHp <= 0) {
    state.winner = enemyHp <= 0 ? "player" : "enemy";
    state.turn = "ended";
    state.message = state.winner === "player"
      ? "Enemy castle shattered. Weather victory."
      : "Your castle fell. Restart to try again.";
    syncUi();
    return;
  }

  if (state.turn === "player") {
    scheduleEnemyTurn();
  } else {
    state.turn = "player";
    state.message = nextMessage || "Your turn. Adjust angle and fire.";
    syncUi();
  }
}

function updateWeatherEffect(deltaSeconds) {
  if (!state.weatherEffect) {
    return;
  }

  const effect = state.weatherEffect;
  const attack = ATTACKS[effect.attackIndex];
  effect.elapsed += deltaSeconds;
  effect.erosionTimer += deltaSeconds;
  const progress = clamp(effect.elapsed / effect.duration, 0, 1);
  effect.waterHeight = Math.min(effect.maxWaterHeight, attack.floodHeight * progress);

  while (effect.erosionTimer >= attack.erosionInterval) {
    effect.erosionTimer -= attack.erosionInterval;
    erodeCastleWithFlood(effect);
  }

  if (effect.elapsed >= effect.duration) {
    const totalHits = effect.totalHits.enemy + effect.totalHits.player;
    let finalMessage = "Super Rain soaks the battlefield without reaching the walls.";
    if (totalHits > 0) {
      const label = effect.totalHits.enemy > 0 ? "enemy" : "your";
      finalMessage = `Super Rain floods the ${label} castle, eroding ${totalHits} block${totalHits === 1 ? "" : "s"}.`;
    }
    state.weatherEffect = null;
    state.message = finalMessage;
    resolveTurnEnd(finalMessage);
  }
}

function erodeCastleWithFlood(effect) {
  const left = effect.centerX - (effect.width / 2);
  const right = effect.centerX + (effect.width / 2);
  const waterTop = GROUND_Y - effect.waterHeight;

  ["player", "enemy"].forEach((side) => {
    state.castles[side].forEach((block) => {
      if (block.hp <= 0) {
        return;
      }

      const blockLeft = block.x;
      const blockRight = block.x + block.width;
      const blockBottom = block.y + block.height;
      const overlapsFlood = blockRight >= left && blockLeft <= right;
      const touchesWater = blockBottom >= waterTop;

      if (overlapsFlood && touchesWater) {
        block.hp = Math.max(0, block.hp - 1);
        effect.totalHits[side] += 1;
      }
    });
  });
}

function getFloodMaxHeight() {
  const allBlocks = [...state.castles.player, ...state.castles.enemy];
  const bottomRowTop = Math.max(...allBlocks.map((block) => block.y));
  return Math.max(0, GROUND_Y - bottomRowTop);
}

function damageCastle(side, impactX, impactY, attack, travelDirection) {
  const targets = state.castles[side];

  if (attack.id === "lightning") {
    return damageCastleWithLightning(targets, impactX, impactY, attack);
  }

  const strikeXs = [];
  let totalHits = 0;

  for (let pellet = 0; pellet < attack.pellets; pellet += 1) {
    const offset = attack.pellets === 1
      ? 0
      : randomBetween(-attack.pelletScatter, attack.pelletScatter);
    strikeXs.push(impactX + offset);
  }

  strikeXs.forEach((strikeX) => {
    const candidates = targets
      .filter((block) => {
        if (block.hp <= 0) {
          return false;
        }

        const cx = block.x + (block.width / 2);
        const cy = block.y + (block.height / 2);
        const withinWidth = Math.abs(cx - strikeX) <= ((attack.impactWidth / 2) + (block.width / 2));
        const withinHeight = Math.abs(cy - impactY) <= (block.height + 18);
        return withinWidth && withinHeight;
      })
      .sort((left, right) => {
        const entryDelta = travelDirection >= 0
          ? left.x - right.x
          : right.x - left.x;

        if (entryDelta !== 0) {
          return entryDelta;
        }

        const leftY = Math.abs((left.y + (left.height / 2)) - impactY);
        const rightY = Math.abs((right.y + (right.height / 2)) - impactY);
        return leftY - rightY;
      });

    const depthLimit = attack.id === "hail" ? Math.min(1, candidates.length) : Math.min(attack.penetration, candidates.length);
    for (let depth = 0; depth < depthLimit; depth += 1) {
      const block = candidates[depth];
      const damage = Math.max(1, attack.baseDamage - depth);
      const previousHp = block.hp;
      block.hp = Math.max(0, block.hp - damage);
      if (block.hp < previousHp) {
        totalHits += 1;
      }
    }
  });

  return totalHits;
}

function damageCastleWithLightning(targets, impactX, impactY, attack) {
  const touched = targets
    .filter((block) => {
      if (block.hp <= 0) {
        return false;
      }
      return segmentIntersectsExpandedRect(
        state.cloud.x,
        state.cloud.y + 10,
        impactX,
        GROUND_Y,
        block.x,
        block.y,
        block.width,
        block.height,
        attack.impactWidth / 2,
      );
    })
    .sort((left, right) => left.y - right.y);

  let hits = 0;
  touched.forEach((block) => {
    const previousHp = block.hp;
    block.hp = Math.max(0, block.hp - attack.baseDamage);
    if (block.hp < previousHp) {
      hits += 1;
    }
  });

  return hits;
}

function segmentIntersectsExpandedRect(x1, y1, x2, y2, rx, ry, rw, rh, padding) {
  const minX = rx - padding;
  const minY = ry - padding;
  const maxX = rx + rw + padding;
  const maxY = ry + rh + padding;

  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const edges = [
    [-dx, x1 - minX],
    [dx, maxX - x1],
    [-dy, y1 - minY],
    [dy, maxY - y1],
  ];

  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) {
        return false;
      }
      continue;
    }

    const ratio = q / p;
    if (p < 0) {
      if (ratio > t1) {
        return false;
      }
      if (ratio > t0) {
        t0 = ratio;
      }
    } else {
      if (ratio < t0) {
        return false;
      }
      if (ratio < t1) {
        t1 = ratio;
      }
    }
  }

  return true;
}

function explode(x, y, projectile) {
  const attack = ATTACKS[projectile.attackIndex];
  const travelDirection = Math.sign(projectile.vx) || (projectile.side === "player" ? 1 : -1);
  const enemyHits = damageCastle("enemy", x, y, attack, travelDirection);
  const playerHits = damageCastle("player", x, y, attack, travelDirection);
  if (attack.id === "hail") {
    const castleSnow = findCastleSurfaceEffects(x, y, attack, 46);
    state.lingeringEffects.push({
      id: "hail-snow",
      x,
      y: GROUND_Y,
      width: attack.impactWidth + 28,
      ttl: 5,
      maxTtl: 5,
      castleSnow,
    });
  } else if (attack.id === "lightning") {
    const castleFlames = findLightningCastleFlames(x, attack);
    state.lingeringEffects.push({
      id: "lightning-fire",
      x,
      y: GROUND_Y,
      width: attack.impactWidth + 20,
      ttl: attack.burnDuration,
      maxTtl: attack.burnDuration,
      burnInterval: attack.burnInterval,
      burnTimer: 0,
      damage: 1,
      castleFlames,
    });
  } else if (attack.id === "sunbeam") {
    const castleFlames = findCastleSurfaceEffects(x, y, attack, 42);
    state.lingeringEffects.push({
      id: "sunbeam-fire",
      x,
      y: GROUND_Y,
      width: attack.impactWidth + 54,
      ttl: attack.burnDuration,
      maxTtl: attack.burnDuration,
      burnInterval: attack.burnInterval,
      burnTimer: 0,
      damage: 1,
      castleFlames,
    });
  }
  state.activeExplosion = {
    x,
    y,
    radius: 10,
    maxRadius: Math.max(42, attack.impactWidth + 18),
    ttl: 0.28,
    color: attack.color,
  };
  let impactMessage;

  if (enemyHits > 0 || playerHits > 0) {
    const label = enemyHits > 0 ? "enemy" : "your";
    impactMessage = attack.id === "lightning"
      ? `${attack.name} punches through the ${label} castle, damaging ${enemyHits + playerHits} block${enemyHits + playerHits === 1 ? "" : "s"}.`
      : `${attack.name} tears into the ${label} castle for ${enemyHits + playerHits} hit${enemyHits + playerHits === 1 ? "" : "s"}.`;
  } else {
    impactMessage = `${attack.name} misses both castles.`;
  }

  state.message = impactMessage;
  resolveTurnEnd(impactMessage);
}

function hitLiveBlock(x, y) {
  const allBlocks = [...state.castles.player, ...state.castles.enemy];
  return allBlocks.find((block) => (
    block.hp > 0
      && x >= block.x
      && x <= block.x + block.width
      && y >= block.y
      && y <= block.y + block.height
  ));
}

function updateProjectile(deltaSeconds) {
  if (!state.projectile) {
    return;
  }

  const projectile = state.projectile;
  projectile.trail.push({ x: projectile.x, y: projectile.y });
  if (projectile.trail.length > 18) {
    projectile.trail.shift();
  }

  projectile.x += projectile.vx * deltaSeconds;
  projectile.y += projectile.vy * deltaSeconds;
  projectile.vx += state.wind.current * projectile.windFactor * deltaSeconds;
  projectile.vy += GRAVITY * deltaSeconds;

  const hitBlock = hitLiveBlock(projectile.x, projectile.y);
  const outOfBounds = projectile.x < -40 || projectile.x > canvas.width + 40 || projectile.y > canvas.height + 60;
  const hitGround = projectile.y >= GROUND_Y;

  if (hitBlock || outOfBounds || hitGround) {
    const impactY = Math.min(projectile.y, GROUND_Y);
    const impactX = Math.max(0, Math.min(canvas.width, projectile.x));
    const impactProjectile = projectile;
    state.projectile = null;
    explode(impactX, impactY, impactProjectile);
  }
}

function updateExplosion(deltaSeconds) {
  if (!state.activeExplosion) {
    return;
  }

  state.activeExplosion.ttl -= deltaSeconds;
  state.activeExplosion.radius += 180 * deltaSeconds;

  if (state.activeExplosion.ttl <= 0) {
    state.activeExplosion = null;
  }
}

function updateLingeringEffects(deltaSeconds) {
  const nextEffects = [];

  state.lingeringEffects.forEach((effect) => {
    const nextEffect = {
      ...effect,
      ttl: effect.ttl - deltaSeconds,
    };

    if (nextEffect.id === "sunbeam-fire" || nextEffect.id === "lightning-fire") {
      nextEffect.burnTimer += deltaSeconds;
      while (nextEffect.burnTimer >= nextEffect.burnInterval && nextEffect.ttl > 0) {
        nextEffect.burnTimer -= nextEffect.burnInterval;
        burnCastleWithFire(nextEffect);
      }
    }

    if (nextEffect.ttl > 0) {
      nextEffects.push(nextEffect);
    }
  });

  state.lingeringEffects = nextEffects;
}

function burnCastleWithFire(effect) {
  const left = effect.x - (effect.width / 2);
  const right = effect.x + (effect.width / 2);

  ["player", "enemy"].forEach((side) => {
    state.castles[side].forEach((block) => {
      if (block.hp <= 0) {
        return;
      }

      const blockLeft = block.x;
      const blockRight = block.x + block.width;
      const blockBottom = block.y + block.height;
      const overlapsFire = blockRight >= left && blockLeft <= right;
      const touchesGroundFire = blockBottom >= GROUND_Y - 14;

      if (overlapsFire && touchesGroundFire) {
        block.hp = Math.max(0, block.hp - effect.damage);
      }
    });
  });
}

function findCastleSurfaceEffects(impactX, impactY, attack, heightPadding) {
  const effects = [];

  ["player", "enemy"].forEach((side) => {
    const bounds = getCastleBounds(side);
    const facadeRegions = [
      {
        kind: "gate",
        x: bounds.minX + ((bounds.totalWidth - 42) / 2),
        y: CASTLE_Y + 46,
        width: 42,
        height: 58,
      },
      {
        kind: "left-tower",
        x: bounds.minX - 10,
        y: bounds.minY - 54,
        width: 48,
        height: 134,
      },
      {
        kind: "right-tower",
        x: bounds.maxX - 24,
        y: bounds.minY - 54,
        width: 48,
        height: 134,
      },
    ];

    state.castles[side].forEach((block, index) => {
      const cx = block.x + (block.width / 2);
      const cy = block.y + (block.height / 2);
      const withinWidth = Math.abs(cx - impactX) <= ((attack.impactWidth / 2) + 18);
      const withinHeight = Math.abs(cy - impactY) <= heightPadding;

      if (withinWidth && withinHeight) {
        effects.push({
          kind: "block",
          side,
          index,
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
        });
      }
    });

    facadeRegions.forEach((region) => {
      const cx = region.x + (region.width / 2);
      const cy = region.y + (region.height / 2);
      const withinWidth = Math.abs(cx - impactX) <= ((attack.impactWidth / 2) + (region.width / 2));
      const withinHeight = Math.abs(cy - impactY) <= (heightPadding + (region.height / 4));

      if (withinWidth && withinHeight) {
        effects.push({
          ...region,
          side,
        });
      }
    });
  });

  return effects;
}

function findLightningCastleFlames(impactX, attack) {
  const effects = [];

  ["player", "enemy"].forEach((side) => {
    const bounds = getCastleBounds(side);
    const facadeRegions = [
      {
        kind: "gate",
        x: bounds.minX + ((bounds.totalWidth - 42) / 2),
        y: CASTLE_Y + 46,
        width: 42,
        height: 58,
      },
      {
        kind: "left-tower",
        x: bounds.minX - 10,
        y: bounds.minY - 54,
        width: 48,
        height: 134,
      },
      {
        kind: "right-tower",
        x: bounds.maxX - 24,
        y: bounds.minY - 54,
        width: 48,
        height: 134,
      },
    ];

    state.castles[side].forEach((block, index) => {
      if (segmentIntersectsExpandedRect(
        state.cloud.x,
        state.cloud.y + 10,
        impactX,
        GROUND_Y,
        block.x,
        block.y,
        block.width,
        block.height,
        attack.impactWidth / 2,
      )) {
        effects.push({
          kind: "block",
          side,
          index,
          x: block.x,
          y: block.y,
          width: block.width,
          height: block.height,
        });
      }
    });

    facadeRegions.forEach((region) => {
      if (segmentIntersectsExpandedRect(
        state.cloud.x,
        state.cloud.y + 10,
        impactX,
        GROUND_Y,
        region.x,
        region.y,
        region.width,
        region.height,
        attack.impactWidth / 2,
      )) {
        effects.push({
          ...region,
          side,
        });
      }
    });
  });

  return effects;
}

function getCastleBounds(side) {
  const blocks = state.castles[side];
  const blockXs = blocks.map((block) => block.x);
  const blockYs = blocks.map((block) => block.y);
  const minX = Math.min(...blockXs);
  const maxX = Math.max(...blockXs) + BLOCK_WIDTH;
  const minY = Math.min(...blockYs);
  const totalWidth = maxX - minX;
  return {
    minX,
    maxX,
    minY,
    totalWidth,
  };
}

function maybeEnemyFire(now) {
  if (state.turn !== "enemy" || state.projectile || state.weatherEffect || state.winner || now < state.pendingEnemyShotAt) {
    return;
  }

  const livePlayerBlocks = state.castles.player.filter((block) => block.hp > 0);
  const target = livePlayerBlocks[Math.floor(Math.random() * livePlayerBlocks.length)] || { x: PLAYER_CASTLE_X + 40, y: CASTLE_Y + 20 };
  const targetX = target.x + (BLOCK_WIDTH / 2);
  const targetY = target.y + (BLOCK_HEIGHT / 2);
  const angle = Math.atan2(targetY - state.cloud.y, targetX - state.cloud.x) * (180 / Math.PI);
  fire("enemy", clamp(Math.round(angle), 0, 180), Math.floor(Math.random() * ATTACKS.length));
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#8bd3ff");
  sky.addColorStop(0.6, "#a8e6ff");
  sky.addColorStop(1, "#f3c56f");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#d49e52";
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  drawCloud(180, 84, 24);
  drawCloud(780, 110, 20);
  drawCloud(state.cloud.x, state.cloud.y, CLOUD.radius);
}

function drawLingeringEffects(layer = "ground") {
  state.lingeringEffects.forEach((effect) => {
    if (effect.id === "hail-snow") {
      if (layer === "ground") {
        const alpha = clamp(effect.ttl / effect.maxTtl, 0, 1);
        const left = effect.x - (effect.width / 2);
        const top = effect.y - 12;

        ctx.save();
        const snowGradient = ctx.createLinearGradient(0, top, 0, effect.y + 2);
        snowGradient.addColorStop(0, `rgba(245, 251, 255, ${alpha * 0.95})`);
        snowGradient.addColorStop(1, `rgba(187, 221, 240, ${alpha * 0.85})`);
        ctx.fillStyle = snowGradient;
        ctx.beginPath();
        ctx.moveTo(left, effect.y);
        for (let step = 0; step <= 10; step += 1) {
          const waveX = left + ((effect.width / 10) * step);
          const waveY = top + (Math.sin(step * 0.9) * 4) + (step % 2 === 0 ? 2 : -1);
          ctx.lineTo(waveX, waveY);
        }
        ctx.lineTo(left + effect.width, effect.y);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.35})`;
        ctx.fillRect(left + 6, top + 2, effect.width - 12, 2);
        ctx.restore();
        return;
      }

      if (layer === "castle") {
        const alpha = clamp(effect.ttl / effect.maxTtl, 0, 1);
        ctx.save();
        effect.castleSnow.forEach((snow, index) => {
          const region = snow.kind === "block"
            ? state.castles[snow.side][snow.index]
            : snow;
          if (!region) {
            return;
          }
          if (snow.kind === "block" && region.hp <= 0) {
            return;
          }

          const driftLeft = region.x + 2;
          const driftWidth = region.width - 4;
          const faceTop = region.y + 5;
          const faceBottom = region.y + (region.height * 0.62);

          const wallSnowGradient = ctx.createLinearGradient(0, faceTop, 0, faceBottom);
          wallSnowGradient.addColorStop(0, `rgba(252, 254, 255, ${alpha * 0.95})`);
          wallSnowGradient.addColorStop(1, `rgba(200, 224, 236, ${alpha * 0.9})`);
          ctx.fillStyle = wallSnowGradient;

          ctx.fillStyle = `rgba(245, 251, 255, ${alpha * 0.22})`;
          ctx.fillRect(
            region.x + 3,
            region.y + 4,
            region.width - 6,
            region.height - 8,
          );
          ctx.fillStyle = wallSnowGradient;

          ctx.beginPath();
          ctx.moveTo(driftLeft, faceBottom);
          for (let step = 0; step <= 5; step += 1) {
            const x = driftLeft + ((driftWidth / 5) * step);
            const y = faceTop + ((step % 2 === 0 ? 2 : 7) + ((index + step) % 2));
            ctx.lineTo(x, y);
          }
          ctx.lineTo(driftLeft + driftWidth, faceBottom);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = `rgba(255,255,255,${alpha * 0.42})`;
          ctx.fillRect(driftLeft + 2, faceTop + 2, driftWidth - 4, 2);
        });
        ctx.restore();
        return;
      }
    }

    if (effect.id === "sunbeam-fire" || effect.id === "lightning-fire") {
      const alpha = clamp(effect.ttl / effect.maxTtl, 0, 1);
      if (layer === "ground") {
        const left = effect.x - (effect.width / 2);
        const flameBaseY = effect.y;
        ctx.save();

        const emberGradient = ctx.createLinearGradient(0, flameBaseY - 28, 0, flameBaseY);
        if (effect.id === "lightning-fire") {
          emberGradient.addColorStop(0, `rgba(255, 249, 205, ${alpha * 0.95})`);
          emberGradient.addColorStop(0.35, `rgba(255, 181, 64, ${alpha})`);
          emberGradient.addColorStop(0.75, `rgba(235, 89, 25, ${alpha * 0.96})`);
          emberGradient.addColorStop(1, `rgba(132, 34, 10, ${alpha * 0.82})`);
        } else {
          emberGradient.addColorStop(0, `rgba(255, 246, 190, ${alpha * 0.95})`);
          emberGradient.addColorStop(0.35, `rgba(255, 139, 48, ${alpha})`);
          emberGradient.addColorStop(0.75, `rgba(233, 62, 20, ${alpha * 0.98})`);
          emberGradient.addColorStop(1, `rgba(132, 24, 8, ${alpha * 0.85})`);
        }
        ctx.fillStyle = emberGradient;

        const flameCount = Math.max(7, Math.floor(effect.width / 10));
        for (let index = 0; index < flameCount; index += 1) {
          const flameX = left + (index * (effect.width / flameCount)) + ((index % 2 === 0) ? 4 : 0);
          const flameHeight = 18 + ((index % 4) * 7) + (alpha * 8);
          ctx.beginPath();
          ctx.moveTo(flameX, flameBaseY);
          ctx.quadraticCurveTo(
            flameX - 4,
            flameBaseY - (flameHeight * 0.45),
            flameX + 1,
            flameBaseY - flameHeight,
          );
          ctx.quadraticCurveTo(
            flameX + 8,
            flameBaseY - (flameHeight * 0.4),
            flameX + 6,
            flameBaseY,
          );
          ctx.closePath();
          ctx.fill();
        }

        ctx.fillStyle = `rgba(117, 28, 10, ${alpha * 0.48})`;
        ctx.fillRect(left, flameBaseY - 4, effect.width, 6);
        ctx.restore();
        return;
      }

      if (layer === "castle") {
        ctx.save();
        effect.castleFlames.forEach((flame, index) => {
          const region = flame.kind === "block"
            ? state.castles[flame.side][flame.index]
            : flame;
          if (!region) {
            return;
          }
          if (flame.kind === "block" && region.hp <= 0) {
            return;
          }

          const localBaseY = region.y + (region.height * 0.78);
          const localCenterX = region.x + (region.width / 2);
          const localGradient = ctx.createLinearGradient(0, localBaseY - 18, 0, localBaseY + 4);
          if (effect.id === "lightning-fire") {
            localGradient.addColorStop(0, `rgba(255, 246, 196, ${alpha * 0.9})`);
            localGradient.addColorStop(0.45, `rgba(255, 156, 48, ${alpha * 0.95})`);
            localGradient.addColorStop(1, `rgba(171, 48, 14, ${alpha * 0.75})`);
            ctx.fillStyle = `rgba(255, 112, 36, ${alpha * 0.2})`;
          } else {
            localGradient.addColorStop(0, `rgba(255, 243, 180, ${alpha * 0.9})`);
            localGradient.addColorStop(0.45, `rgba(255, 121, 34, ${alpha * 0.95})`);
            localGradient.addColorStop(1, `rgba(170, 33, 10, ${alpha * 0.75})`);
            ctx.fillStyle = `rgba(255, 92, 30, ${alpha * 0.18})`;
          }
          ctx.fillRect(
            region.x + 3,
            region.y + 6,
            region.width - 6,
            region.height - 10,
          );

          ctx.fillStyle = localGradient;
          for (let lick = 0; lick < 3; lick += 1) {
            const offset = (lick - 1) * 8;
            const flameHeight = 10 + (((index + lick) % 3) * 4) + (alpha * 4);
            ctx.beginPath();
            ctx.moveTo(localCenterX + offset, localBaseY);
            ctx.quadraticCurveTo(
              localCenterX + offset - 3,
              localBaseY - (flameHeight * 0.45),
              localCenterX + offset + 1,
              localBaseY - flameHeight,
            );
            ctx.quadraticCurveTo(
              localCenterX + offset + 5,
              localBaseY - (flameHeight * 0.35),
              localCenterX + offset + 4,
              localBaseY + 1,
            );
            ctx.closePath();
            ctx.fill();
          }
        });
        ctx.restore();
      }
    }
  });
}

function drawWeatherEffect() {
  if (!state.weatherEffect) {
    return;
  }

  const effect = state.weatherEffect;
  const attack = ATTACKS[effect.attackIndex];
  const left = effect.centerX - (effect.width / 2);
  const right = effect.centerX + (effect.width / 2);
  const waterTop = GROUND_Y - effect.waterHeight;
  const cloudBottom = state.cloud.y + 18;
  const mouthLeft = state.cloud.x - 34;
  const mouthRight = state.cloud.x + 34;

  ctx.save();

  const rainGradient = ctx.createLinearGradient(0, cloudBottom, 0, GROUND_Y);
  rainGradient.addColorStop(0, "rgba(180, 235, 255, 0.08)");
  rainGradient.addColorStop(1, "rgba(100, 180, 230, 0.18)");
  ctx.fillStyle = rainGradient;
  ctx.beginPath();
  ctx.moveTo(mouthLeft, cloudBottom);
  ctx.lineTo(mouthRight, cloudBottom);
  ctx.lineTo(right, GROUND_Y);
  ctx.lineTo(left, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  effect.drops.forEach((drop, index) => {
    const travel = (effect.elapsed * 280 * drop.speed) + (drop.phase * 160);
    const fallSpan = Math.max(30, GROUND_Y - cloudBottom + 40);
    const y = cloudBottom + (travel % fallSpan) - 20;
    const t = clamp((y - cloudBottom) / Math.max(1, GROUND_Y - cloudBottom), 0, 1);
    const topX = state.cloud.x + (drop.xOffset * 28);
    const bottomX = effect.centerX + (drop.xOffset * effect.width);
    const x = topX + ((bottomX - topX) * t);
    const dx = bottomX - topX;
    const dy = GROUND_Y - cloudBottom;
    const magnitude = Math.max(1, Math.hypot(dx, dy));
    const streakX = (dx / magnitude) * drop.length * 0.35;
    const streakY = (dy / magnitude) * drop.length;
    ctx.strokeStyle = index % 3 === 0 ? "rgba(220, 247, 255, 0.75)" : "rgba(143, 215, 255, 0.7)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - streakX, y - streakY);
    ctx.stroke();
  });

  const puddleGradient = ctx.createLinearGradient(0, waterTop, 0, GROUND_Y);
  puddleGradient.addColorStop(0, "rgba(126, 213, 255, 0.65)");
  puddleGradient.addColorStop(1, "rgba(42, 118, 184, 0.82)");
  ctx.fillStyle = puddleGradient;
  ctx.fillRect(left, waterTop, effect.width, effect.waterHeight);

  ctx.fillStyle = "rgba(219, 247, 255, 0.35)";
  ctx.fillRect(left, waterTop, effect.width, 4);

  const rippleCount = Math.floor(effect.width / 26);
  ctx.strokeStyle = "rgba(235, 250, 255, 0.35)";
  ctx.lineWidth = 1;
  for (let index = 0; index < rippleCount; index += 1) {
    const rippleX = left + (index * 26) + ((effect.elapsed * 40) % 24);
    ctx.beginPath();
    ctx.arc(rippleX, waterTop + 4, 8, Math.PI, 0);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCloud(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x - radius * 0.7, y, radius * 0.55, 0, Math.PI * 2);
  ctx.arc(x, y - radius * 0.18, radius * 0.7, 0, Math.PI * 2);
  ctx.arc(x + radius * 0.75, y, radius * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawCastle(side) {
  const blocks = state.castles[side];
  const liveBlocks = blocks.filter((block) => block.hp > 0);
  const blockXs = blocks.map((block) => block.x);
  const blockYs = blocks.map((block) => block.y);
  const minX = Math.min(...blockXs);
  const maxX = Math.max(...blockXs) + BLOCK_WIDTH;
  const minY = Math.min(...blockYs);
  const totalWidth = maxX - minX;
  const direction = side === "player" ? 1 : -1;
  const stoneBase = side === "player" ? "#7bccef" : "#aeb7c2";
  const stoneShade = side === "player" ? "#3f86ae" : "#6f7b88";
  const mortar = side === "player" ? "rgba(219, 247, 255, 0.45)" : "rgba(232, 238, 245, 0.42)";
  const trim = side === "player" ? "#d7f6ff" : "#e9eef5";
  const banner = side === "player" ? "#4dd8ff" : "#8f9aaa";

  ctx.save();

  const baseX = minX - 22;
  const baseY = CASTLE_Y + 78;
  const baseWidth = totalWidth + 44;
  const baseHeight = 28;
  const baseGradient = ctx.createLinearGradient(baseX, baseY, baseX, baseY + baseHeight);
  baseGradient.addColorStop(0, side === "player" ? "#4e89a8" : "#8b949f");
  baseGradient.addColorStop(1, side === "player" ? "#2d5364" : "#5f6771");
  ctx.fillStyle = baseGradient;
  ctx.fillRect(baseX, baseY, baseWidth, baseHeight);
  ctx.fillStyle = side === "player" ? "rgba(210, 247, 255, 0.14)" : "rgba(244, 247, 252, 0.14)";
  ctx.fillRect(baseX, baseY, baseWidth, 4);
  ctx.fillStyle = "rgba(0, 0, 0, 0.16)";
  ctx.fillRect(baseX, baseY + baseHeight - 5, baseWidth, 5);

  const leftTowerX = minX - 10;
  const rightTowerX = maxX - 24;
  const towerTopY = minY - 54;
  const towerWidth = 48;
  const towerHeight = 134;
  drawTower(leftTowerX, towerTopY, towerWidth, towerHeight, stoneBase, stoneShade, mortar, trim, banner, direction, true);
  drawTower(rightTowerX, towerTopY, towerWidth, towerHeight, stoneBase, stoneShade, mortar, trim, banner, direction, false);

  drawWallMass(minX - 2, minY - 18, totalWidth + 4, 92, stoneBase, stoneShade, mortar, trim);

  liveBlocks.forEach((block) => {
    drawDetailedBlock(block, mortar, trim);
  });

  const gateX = minX + ((totalWidth - 42) / 2);
  const gateY = CASTLE_Y + 46;
  drawGate(gateX, gateY, 42, 58, side === "player" ? "#214659" : "#48515b", trim);

  const bridgeY = CASTLE_Y + 50;
  ctx.strokeStyle = side === "player" ? "#9feeff" : "#ffdca7";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(leftTowerX + towerWidth - 8, bridgeY);
  ctx.lineTo(rightTowerX + 8, bridgeY);
  ctx.stroke();
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.moveTo(leftTowerX + towerWidth - 8, bridgeY + 6);
  ctx.lineTo(rightTowerX + 8, bridgeY + 6);
  ctx.stroke();

  const pennantX = side === "player" ? leftTowerX + 18 : rightTowerX + 30;
  drawPennant(pennantX, towerTopY - 10, banner, direction);

  ctx.restore();
}

function drawWallMass(x, y, width, height, stoneBase, stoneShade, mortar, trim) {
  const wallGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  wallGradient.addColorStop(0, brighten(stoneBase, 10));
  wallGradient.addColorStop(1, darken(stoneShade, 6));
  ctx.fillStyle = wallGradient;
  ctx.fillRect(x, y, width, height);

  drawCrenellations(x, y - 12, width, 12, trim);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(x + 4, y + 4, width - 8, 5);
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.fillRect(x + 4, y + height - 8, width - 8, 5);

  ctx.strokeStyle = mortar;
  ctx.lineWidth = 1;
  for (let row = 14; row < height - 6; row += 16) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y + row);
    ctx.lineTo(x + width - 4, y + row);
    ctx.stroke();
  }

  const buttressXs = [x + 16, x + width - 24];
  buttressXs.forEach((bx) => {
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(bx, y + 10, 10, height - 10);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(bx + 1.5, y + 12, 2, height - 16);
  });

  const slitY = y + 26;
  drawArrowSlit(x + 20, slitY, trim);
  drawArrowSlit(x + width - 28, slitY + 14, trim);
}

function drawTower(x, y, width, height, stoneBase, stoneShade, mortar, trim, banner, direction, isLeft) {
  const towerGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  towerGradient.addColorStop(0, stoneBase);
  towerGradient.addColorStop(1, stoneShade);
  ctx.fillStyle = towerGradient;
  ctx.fillRect(x, y, width, height);

  drawCrenellations(x, y - 12, width, 12, trim);
  drawTowerRoof(x - 2, y - 18, width + 4, 18, trim, stoneShade);

  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(x + 4, y + 4, 6, height - 8);

  ctx.strokeStyle = mortar;
  ctx.lineWidth = 1;
  for (let row = 12; row < height - 10; row += 14) {
    ctx.beginPath();
    ctx.moveTo(x + 3, y + row);
    ctx.lineTo(x + width - 3, y + row);
    ctx.stroke();
  }

  for (let col = 10; col < width - 6; col += 12) {
    ctx.beginPath();
    ctx.moveTo(x + col, y + 10);
    ctx.lineTo(x + col, y + height - 8);
    ctx.stroke();
  }

  const windowX = isLeft ? x + 14 : x + 12;
  drawWindow(windowX, y + 32, 10, 20, trim);
  drawWindow(windowX + 12, y + 72, 10, 20, trim);
  drawArrowSlit(x + (isLeft ? 30 : 8), y + 104, trim);

  ctx.fillStyle = banner;
  const flagPoleX = isLeft ? x + width - 6 : x + 6;
  ctx.fillRect(flagPoleX, y - 24, 2, 24);
  ctx.beginPath();
  ctx.moveTo(flagPoleX + (isLeft ? 2 : 0), y - 22);
  ctx.lineTo(flagPoleX + (direction * 18), y - 16);
  ctx.lineTo(flagPoleX + (isLeft ? 2 : 0), y - 8);
  ctx.closePath();
  ctx.fill();
}

function drawDetailedBlock(block, mortar, trim) {
  const topGradient = ctx.createLinearGradient(block.x, block.y, block.x, block.y + block.height);
  topGradient.addColorStop(0, brighten(block.color, 18));
  topGradient.addColorStop(1, darken(block.color, 18));
  ctx.fillStyle = topGradient;
  ctx.fillRect(block.x, block.y, block.width, block.height);

  ctx.strokeStyle = mortar;
  ctx.lineWidth = 1;
  ctx.strokeRect(block.x + 0.5, block.y + 0.5, block.width - 1, block.height - 1);

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(block.x + 2, block.y + 2, block.width - 4, 3);
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  ctx.fillRect(block.x + 2, block.y + block.height - 5, block.width - 4, 3);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(block.x + 6, block.y + 8);
  ctx.lineTo(block.x + 18, block.y + 6);
  ctx.lineTo(block.x + 27, block.y + 11);
  ctx.moveTo(block.x + 5, block.y + 20);
  ctx.lineTo(block.x + 15, block.y + 17);
  ctx.lineTo(block.x + 29, block.y + 22);
  ctx.stroke();

  const damageRatio = block.hp / block.maxHp;
  if (damageRatio < 1) {
    ctx.strokeStyle = damageRatio <= 0.4 ? "rgba(64, 25, 12, 0.7)" : "rgba(255, 248, 232, 0.58)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(block.x + 7, block.y + 4);
    ctx.lineTo(block.x + 18, block.y + 15);
    ctx.lineTo(block.x + 11, block.y + 25);
    ctx.lineTo(block.x + 22, block.y + 31);
    ctx.stroke();
  }

  if (damageRatio <= 0.4) {
    ctx.fillStyle = "rgba(31, 14, 10, 0.16)";
    ctx.fillRect(block.x, block.y, block.width, block.height);
  }
}

function drawCrenellations(x, y, width, height, trim) {
  ctx.fillStyle = trim;
  const notchWidth = width / 5;
  for (let index = 0; index < 5; index += 1) {
    if (index % 2 === 1) {
      continue;
    }
    ctx.fillRect(x + (index * notchWidth), y, notchWidth - 2, height);
  }
}

function drawTowerRoof(x, y, width, height, trim, stoneShade) {
  const roofGradient = ctx.createLinearGradient(x, y, x, y + height);
  roofGradient.addColorStop(0, brighten(trim.includes("rgba") ? "#d7dfe8" : trim, 2));
  roofGradient.addColorStop(1, darken(stoneShade, 12));
  ctx.fillStyle = roofGradient;
  ctx.beginPath();
  ctx.moveTo(x + 2, y + height);
  ctx.lineTo(x + (width / 2), y);
  ctx.lineTo(x + width - 2, y + height);
  ctx.closePath();
  ctx.fill();
}

function drawArrowSlit(x, y, trim) {
  ctx.fillStyle = "#162b37";
  ctx.fillRect(x, y, 4, 16);
  ctx.fillRect(x - 2, y + 5, 8, 3);
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 0.5, y - 0.5, 5, 17);
}

function drawWindow(x, y, width, height, trim) {
  ctx.fillStyle = "#173040";
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x + width - 4, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + 4);
  ctx.lineTo(x + width, y + height - 4);
  ctx.quadraticCurveTo(x + width, y + height, x + width - 4, y + height);
  ctx.lineTo(x + 4, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - 4);
  ctx.lineTo(x, y + 4);
  ctx.quadraticCurveTo(x, y, x + 4, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGate(x, y, width, height, fill, trim) {
  const gateGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gateGradient.addColorStop(0, brighten(fill, 10));
  gateGradient.addColorStop(1, darken(fill, 10));
  ctx.fillStyle = gateGradient;
  ctx.beginPath();
  ctx.moveTo(x - 6, y + height);
  ctx.lineTo(x - 2, y + 18);
  ctx.quadraticCurveTo(x + (width / 2), y - 18, x + width + 2, y + 18);
  ctx.lineTo(x + width + 6, y + height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x, y + 16);
  ctx.quadraticCurveTo(x + (width / 2), y - 8, x + width, y + 16);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = trim;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  for (let index = 8; index < width; index += 8) {
    ctx.beginPath();
    ctx.moveTo(x + index, y + 8);
    ctx.lineTo(x + index, y + height - 4);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(x + 10, y + (height * 0.58), 2.2, 0, Math.PI * 2);
  ctx.arc(x + width - 10, y + (height * 0.58), 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPennant(x, y, color, direction) {
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + 26);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x + (direction * 20), y + 8);
  ctx.lineTo(x, y + 15);
  ctx.closePath();
  ctx.fill();
}

function brighten(hex, amount) {
  return adjustColor(hex, amount);
}

function darken(hex, amount) {
  return adjustColor(hex, -amount);
}

function adjustColor(hex, amount) {
  const value = hex.replace("#", "");
  const base = Number.parseInt(value, 16);
  const r = clamp(((base >> 16) & 255) + amount, 0, 255);
  const g = clamp(((base >> 8) & 255) + amount, 0, 255);
  const b = clamp((base & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function drawAimGuide() {
  if (state.turn !== "player" || state.projectile || state.weatherEffect || state.winner) {
    return;
  }

  const radians = (state.angle * Math.PI) / 180;
  const guideLength = 120;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.cloud.x, state.cloud.y + 10);
  ctx.lineTo(state.cloud.x + Math.cos(radians) * guideLength, state.cloud.y + 10 + Math.sin(radians) * guideLength);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawProjectile() {
  if (!state.projectile) {
    return;
  }

  const { projectile } = state;
  const attack = ATTACKS[projectile.attackIndex];

  projectile.trail.forEach((point, index) => {
    const alpha = (index + 1) / projectile.trail.length;
    ctx.fillStyle = `${hexToRgba(projectile.color, alpha * 0.28)}`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, Math.max(2, projectile.radius * alpha * 0.35), 0, Math.PI * 2);
    ctx.fill();
  });

  if (attack.id === "lightning") {
    const angle = Math.atan2(projectile.vy, projectile.vx);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(angle);
    ctx.strokeStyle = projectile.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-28, -8);
    ctx.lineTo(-10, -2);
    ctx.lineTo(-18, 5);
    ctx.lineTo(6, -1);
    ctx.lineTo(-2, 10);
    ctx.lineTo(24, 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (attack.id === "hail") {
    const hailOffsets = [
      [-22, -12], [-18, -2], [-14, 8], [-10, -8],
      [-6, 2], [-2, 11], [2, -5], [6, 7],
      [10, -10], [14, 0], [18, 9], [22, -4],
      [-12, 15], [-1, -14], [11, 15], [24, 10],
    ];
    hailOffsets.forEach(([offsetX, offsetY], index) => {
      const size = index % 3 === 0 ? 3.8 : 3.2;
      ctx.fillStyle = "#eefbff";
      ctx.beginPath();
      ctx.arc(projectile.x + offsetX, projectile.y + offsetY, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(145, 207, 235, 0.9)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    return;
  }

  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
  const beamGradient = ctx.createLinearGradient(-68, 0, 68, 0);
  beamGradient.addColorStop(0, "rgba(255, 209, 102, 0.02)");
  beamGradient.addColorStop(0.2, "rgba(255, 209, 102, 0.35)");
  beamGradient.addColorStop(0.5, "rgba(255, 246, 201, 1)");
  beamGradient.addColorStop(0.8, "rgba(255, 209, 102, 0.35)");
  beamGradient.addColorStop(1, "rgba(255, 209, 102, 0.02)");
  ctx.fillStyle = beamGradient;
  ctx.beginPath();
  ctx.rect(-68, -6, 136, 12);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 248, 220, 0.95)";
  ctx.fillRect(-62, -2, 124, 4);
  ctx.restore();
}

function drawExplosion() {
  if (!state.activeExplosion) {
    return;
  }

  const {
    x, y, radius, ttl, color = "#ffd166",
  } = state.activeExplosion;
  const alpha = Math.max(0, ttl / 0.28);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
  gradient.addColorStop(0.3, hexToRgba(color, alpha * 0.9));
  gradient.addColorStop(1, "rgba(255, 124, 72, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawHudText() {
  ctx.fillStyle = "rgba(14, 32, 52, 0.68)";
  ctx.fillRect(682, 18, 250, 74);
  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Georgia";
  ctx.fillText(`Attack: ${ATTACKS[state.selectedAttack].name}`, 700, 38);
  ctx.fillText(`Angle: ${state.angle}°`, 700, 58);
  const windDir = state.wind.current > 0.15 ? "E" : state.wind.current < -0.15 ? "W" : "Calm";
  const windMag = Math.abs(state.wind.current).toFixed(1);
  ctx.fillText(`Wind: ${windDir} ${windMag}`, 700, 78);
}

function drawGameOverOverlay() {
  if (!state.winner) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(8, 17, 37, 0.52)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(10, 24, 42, 0.82)";
  ctx.fillRect(250, 180, 460, 150);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.strokeRect(250, 180, 460, 150);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 42px Georgia";
  ctx.fillText("Game Over", 382, 238);
  ctx.font = "26px Georgia";
  ctx.fillText(state.winner === "player" ? "You win the weather war." : "Enemy castle stands.", 322, 278);
  ctx.font = "18px Georgia";
  ctx.fillText("Press Restart to play again.", 372, 308);
  ctx.restore();
}

function render() {
  drawBackground();
  drawAimGuide();
  drawWeatherEffect();
  drawLingeringEffects("ground");
  drawCastle("player");
  drawCastle("enemy");
  drawLingeringEffects("castle");
  drawProjectile();
  drawExplosion();
  drawHudText();
  drawGameOverOverlay();
}

let previousTimestamp = performance.now();

function frame(timestamp) {
  const deltaSeconds = Math.min(0.032, (timestamp - previousTimestamp) / 1000);
  previousTimestamp = timestamp;

  updateWind(timestamp, deltaSeconds);
  updateCloud(timestamp);
  maybeEnemyFire(timestamp);
  updateProjectile(deltaSeconds);
  updateWeatherEffect(deltaSeconds);
  updateExplosion(deltaSeconds);
  updateLingeringEffects(deltaSeconds);
  render();

  requestAnimationFrame(frame);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomBetween(min, max) {
  return min + (Math.random() * (max - min));
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

angleSlider.addEventListener("input", (event) => {
  state.angle = Number(event.target.value);
  syncUi();
});

fireButton.addEventListener("click", () => {
  if (state.turn !== "player" || state.projectile || state.weatherEffect || state.winner) {
    return;
  }
  fire("player", state.angle, state.selectedAttack);
});

helpButton.addEventListener("click", () => {
  if (helpDialog.open) {
    helpDialog.close();
  } else {
    helpDialog.showModal();
  }
});

restartButton.addEventListener("click", () => {
  resetGame();
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "h") {
    event.preventDefault();
    if (helpDialog.open) {
      helpDialog.close();
    } else {
      helpDialog.showModal();
    }
    return;
  }

  if (helpDialog.open) {
    return;
  }

  if (event.key >= "1" && event.key <= "4" && state.turn === "player" && !state.projectile && !state.weatherEffect && !state.winner) {
    state.selectedAttack = Number(event.key) - 1;
    state.message = `${ATTACKS[state.selectedAttack].name} selected.`;
    syncUi();
    return;
  }

  if (event.key === "ArrowLeft" && state.turn === "player" && !state.projectile && !state.weatherEffect && !state.winner) {
    event.preventDefault();
    state.angle = clamp(state.angle - 1, 0, 180);
    syncUi();
    return;
  }

  if (event.key === "ArrowRight" && state.turn === "player" && !state.projectile && !state.weatherEffect && !state.winner) {
    event.preventDefault();
    state.angle = clamp(state.angle + 1, 0, 180);
    syncUi();
    return;
  }

  if (event.code === "Space" && state.turn === "player" && !state.projectile && !state.weatherEffect && !state.winner) {
    event.preventDefault();
    fire("player", state.angle, state.selectedAttack);
  }
});

buildAttackOptions();
resetGame();
requestAnimationFrame(frame);
