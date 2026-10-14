/* Godzilla Battle — fan-made arcade fighter. Not affiliated with Toho. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof root !== "undefined") root.GZGame = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const W = 960;
  const H = 540;
  const GROUND = 456;
  const GRAV = 1800;
  const JUMP = 810;
  const SPEED = 250;

  const DIFFS = {
    easy: { eh: 0.75, ed: 0.7 },
    normal: { eh: 1, ed: 1 },
    hard: { eh: 1.28, ed: 1.26 },
  };

  const KINDS = {
    blood: { name: "Blood Godzilla", behavior: "lunge", hp: 34, scale: 0.84, score: 600 },
    armored: { name: "Armored Godzilla", behavior: "armor", hp: 76, scale: 0.98, score: 1100 },
    warden: { name: "Wardenzilla", behavior: "shriek", hp: 68, scale: 1.02, score: 1400 },
    gold: { name: "Gold Godzilla", behavior: "charge", hp: 82, scale: 1.04, score: 1600 },
    omni: { name: "Omni Godzilla", behavior: "omni", hp: 310, scale: 1.26, score: 8000, boss: true },
  };

  const WAVES = [
    {
      name: "Blood Godzilla",
      tip: "J strikes. Hold K for atomic breath. L roars.",
      spawns: [
        { kind: "blood", t: 0.35, side: 1 },
        { kind: "blood", t: 1.45, side: -1 },
      ],
    },
    {
      name: "Armored Godzilla",
      tip: "Jump the cannon shot, or cut it down with a strike.",
      spawns: [
        { kind: "armored", t: 0.4, side: 1 },
        { kind: "blood", t: 1.25, side: -1 },
      ],
    },
    {
      name: "Wardenzilla",
      tip: "The shriek flies at chest height. Jump it.",
      spawns: [
        { kind: "warden", t: 0.4, side: 1 },
        { kind: "blood", t: 2.05, side: -1 },
      ],
    },
    {
      name: "Gold Godzilla",
      tip: "A gold line marks the charge. Jump as it runs.",
      spawns: [
        { kind: "gold", t: 0.4, side: 1 },
        { kind: "blood", t: 1.65, side: -1 },
      ],
    },
    {
      name: "Omni Godzilla",
      tip: "Jump the low beam. Step off the lightning.",
      spawns: [{ kind: "omni", t: 0.45, side: 1 }],
    },
  ];

  const BEAM_Y = [GROUND - 42, GROUND - 108, GROUND - 186];
  const TITLE = [
    { kind: "blood", x: 168 },
    { kind: "armored", x: 332 },
    { kind: "warden", x: 496 },
    { kind: "gold", x: 660 },
    { kind: "omni", x: 824 },
  ];

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function boxesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleHitsBox(cx, cy, r, b) {
    const x = Math.max(b.x, Math.min(cx, b.x + b.w));
    const y = Math.max(b.y, Math.min(cy, b.y + b.h));
    const dx = cx - x;
    const dy = cy - y;
    return dx * dx + dy * dy <= r * r;
  }

  function createGame() {
    const g = {
      mode: "title",
      time: 0,
      modeT: 0,
      wave: 0,
      waveT: 0,
      score: 0,
      best: 0,
      kills: 0,
      diff: "normal",
      reduce: false,
      player: null,
      enemies: [],
      shots: [],
      parts: [],
      floats: [],
      pickups: [],
      buildings: [],
      skyline: [],
      queue: [],
      snap: null,
      shake: 0,
      latch: { start: false, pause: false, roar: false },
      events: [],
    };

    function emit(name) {
      g.events.push(name);
    }

    function ed() {
      return DIFFS[g.diff].ed;
    }

    function makeSkyline() {
      const out = [];
      let x = 0;
      const widths = [78, 54, 96, 64, 110, 48, 88, 70, 120, 60, 84, 92];
      const heights = [110, 70, 150, 90, 180, 60, 130, 100, 200, 80, 140, 160];
      for (let i = 0; i < widths.length; i++) {
        out.push({ x: x, w: widths[i], h: heights[i], seed: i * 17 + 3 });
        x += widths[i] + 8;
      }
      return out;
    }

    function makeBuildings() {
      return [
        { x: 18, w: 86, h: 168, hp: 46, hpMax: 46, seed: 2 },
        { x: 118, w: 62, h: 112, hp: 32, hpMax: 32, seed: 5 },
        { x: 742, w: 98, h: 196, hp: 54, hpMax: 54, seed: 9 },
        { x: 858, w: 78, h: 140, hp: 38, hpMax: 38, seed: 12 },
      ];
    }

    function resetPlayer(hp, energy) {
      g.player = {
        kind: "player",
        scale: 1.08,
        x: 210,
        y: GROUND,
        vx: 0,
        vy: 0,
        facing: 1,
        onGround: true,
        landed: false,
        hp: hp,
        energy: energy,
        state: "idle",
        stateT: 0,
        didHit: false,
        invuln: 0.55,
        flash: 0,
        combo: 0,
        comboT: 0,
        roarCd: 0,
        dead: false,
        slamDone: false,
      };
    }

    function bodyBox(a) {
      const s = a.scale;
      const w = 68 * s;
      const h = 136 * s;
      return { x: a.x - w * 0.48, y: a.y - h, w: w, h: h };
    }

    function breathBox() {
      const p = g.player;
      const s = p.scale;
      const len = 292;
      const bh = 32 * s;
      const my = p.y - 114 * s;
      const mx = p.x + p.facing * 78 * s;
      const x = p.facing > 0 ? mx : mx - len;
      return { x: x, y: my - bh / 2, w: len, h: bh };
    }

    function physics(a, dt) {
      const wasAir = !a.onGround;
      a.vy += GRAV * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      if (a.y >= GROUND) {
        a.y = GROUND;
        a.vy = 0;
        a.landed = wasAir;
        a.onGround = true;
      } else {
        a.onGround = false;
        a.landed = false;
      }
      const pad = a.boss ? 150 : 56;
      a.x = clamp(a.x, pad, W - pad);
    }

    function spawnEnemy(kind, side, xOverride) {
      const k = KINDS[kind];
      const hp = Math.max(8, Math.round(k.hp * DIFFS[g.diff].eh));
      const x = xOverride == null ? (side > 0 ? W - 90 : 90) : xOverride;
      const e = {
        kind: kind,
        name: k.name,
        behavior: k.behavior,
        score: k.score,
        boss: !!k.boss,
        scale: k.scale,
        hp: hp,
        hpMax: hp,
        x: x,
        y: GROUND,
        vx: 0,
        vy: 0,
        facing: g.player && x < g.player.x ? 1 : -1,
        onGround: true,
        landed: false,
        state: "walk",
        stateT: 0,
        cd: 0.45 + Math.random() * 0.35,
        touch: 0.4,
        stun: 0,
        didHit: false,
        flash: 0,
        phase: 1,
        didSummon: false,
        beamH: 0,
        tick: 0,
        dashFacing: 1,
        alive: true,
      };
      g.enemies.push(e);
      return e;
    }

    function floatText(x, y, text, tone) {
      g.floats.push({ x: x, y: y, text: text, life: 0.75, tone: tone || "text" });
      if (g.floats.length > 14) g.floats.shift();
    }

    function burst(x, y, tone, n, speed) {
      if (g.reduce) n = Math.ceil(n * 0.3);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.35 + Math.random());
        g.parts.push({
          x: x,
          y: y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 30,
          life: 0.35 + Math.random() * 0.35,
          tone: tone,
          r: 2 + Math.random() * 2.2,
        });
      }
      if (g.parts.length > 90) g.parts.splice(0, g.parts.length - 90);
    }

    function hurtPlayer(dmg, srcX) {
      const p = g.player;
      if (!p || p.dead || p.invuln > 0 || g.mode !== "fight") return false;
      const amount = Math.max(1, Math.round(dmg));
      p.hp -= amount;
      p.invuln = 0.55;
      p.flash = 0.12;
      p.combo = 0;
      g.shake = Math.max(g.shake, 0.45);
      floatText(p.x, p.y - 150, String(amount), "hp");
      emit("hurt");
      if (srcX != null) p.vx = p.x >= srcX ? 140 : -140;
      if (p.hp <= 0) {
        p.hp = 0;
        p.dead = true;
        p.invuln = 0;
        p.state = "idle";
        p.vx = 0;
        g.mode = "dying";
        g.modeT = 0;
        emit("defeat");
      }
      return true;
    }

    function killEnemy(e) {
      if (!e.alive) return;
      e.alive = false;
      e.hp = 0;
      const bonus = 1 + Math.min(g.player.combo, 8) * 0.12;
      const pts = Math.round(e.score * bonus);
      g.score += pts;
      g.kills += 1;
      floatText(e.x, e.y - 160 * e.scale, String(pts), "energy");
      burst(e.x, e.y - 70 * e.scale, e.kind === "gold" ? "gold" : "hp", 16, 180);
      emit("boom");
      if (Math.random() < 0.5) {
        g.pickups.push({
          kind: Math.random() < 0.45 ? "hp" : "en",
          x: e.x,
          y: e.y - 40,
          vy: -160,
          life: 8,
        });
      }
      g.shake = Math.max(g.shake, e.boss ? 0.8 : 0.25);
    }

    function damageEnemy(e, dmg, popup, combo) {
      if (!e.alive || e.hp <= 0) return;
      e.hp -= dmg;
      e.flash = 0.09;
      if (combo) {
        g.player.combo += 1;
        g.player.comboT = 2.1;
      }
      if (popup) floatText(e.x, e.y - 148 * e.scale, String(Math.round(dmg)), "text");
      if (e.hp <= 0) killEnemy(e);
    }

    function destroyShotAt(x, y, r) {
      let hit = false;
      g.shots = g.shots.filter(function (s) {
        if (s.kind === "bolt") return true;
        const dx = s.x - x;
        const dy = s.y - y;
        if (dx * dx + dy * dy <= (r + (s.r || 8)) * (r + (s.r || 8))) {
          hit = true;
          return false;
        }
        return true;
      });
      return hit;
    }

    function meleePoint() {
      const p = g.player;
      return { x: p.x + p.facing * 82 * p.scale, y: p.y - 74 * p.scale, r: 54 * p.scale };
    }

    function applyMelee() {
      const m = meleePoint();
      let hit = false;
      g.enemies.forEach(function (e) {
        if (!e.alive) return;
        if (circleHitsBox(m.x, m.y, m.r, bodyBox(e))) {
          damageEnemy(e, 18, true, true);
          e.x += g.player.facing * 28;
          hit = true;
        }
      });
      if (destroyShotAt(m.x, m.y, m.r)) hit = true;
      if (hit) {
        emit("hit");
        g.shake = Math.max(g.shake, 0.16);
      }
    }

    function applySlam() {
      const p = g.player;
      let hit = false;
      g.enemies.forEach(function (e) {
        if (!e.alive) return;
        if (Math.abs(e.x - p.x) < 118 && e.y > GROUND - 20) {
          damageEnemy(e, 24, true, true);
          hit = true;
        }
      });
      g.shots = g.shots.filter(function (s) {
        if (s.kind === "bolt") return true;
        if (Math.abs(s.x - p.x) < 110 && s.y > GROUND - 90) {
          hit = true;
          return false;
        }
        return true;
      });
      if (hit) {
        emit("hit");
        g.shake = Math.max(g.shake, 0.4);
        burst(p.x, GROUND, "text", 10, 160);
      }
    }

    function applyBreath(dt) {
      const box = breathBox();
      g.enemies.forEach(function (e) {
        if (!e.alive) return;
        if (boxesOverlap(box, bodyBox(e))) damageEnemy(e, 27 * dt, false, false);
      });
      g.buildings.forEach(function (b) {
        const bb = { x: b.x, y: GROUND - b.h, w: b.w, h: b.h };
        if (boxesOverlap(box, bb)) b.hp -= 20 * dt;
      });
      g.shots = g.shots.filter(function (s) {
        if (s.kind === "bolt") return true;
        return !circleHitsBox(s.x, s.y, s.r || 8, box);
      });
      const p = g.player;
      if (Math.random() < 0.7) {
        const m = breathBox();
        g.parts.push({
          x: p.facing > 0 ? m.x + Math.random() * m.w : m.x + Math.random() * m.w,
          y: m.y + Math.random() * m.h,
          vx: p.facing * (80 + Math.random() * 140),
          vy: (Math.random() - 0.5) * 40,
          life: 0.18 + Math.random() * 0.12,
          tone: "breath",
          r: 2 + Math.random() * 2,
        });
      }
    }

    function applyRoar() {
      const p = g.player;
      p.energy -= 38;
      p.roarCd = 5.5;
      emit("roar");
      g.shake = Math.max(g.shake, 0.4);
      burst(p.x, p.y - 80, "sonic", 12, 220);
      g.enemies.forEach(function (e) {
        if (!e.alive) return;
        if (Math.abs(e.x - p.x) < 260) {
          e.stun = e.boss ? 1.05 : 1.35;
          if (e.state === "dash" || e.state === "windup" || e.state === "hop") e.state = "walk";
          damageEnemy(e, 10, true, true);
        }
      });
      g.shots = g.shots.filter(function (s) {
        return Math.abs(s.x - p.x) > 250;
      });
    }

    function facePlayer(e) {
      if (!g.player) return;
      if (Math.abs(g.player.x - e.x) > 12) e.facing = g.player.x > e.x ? 1 : -1;
    }

    function updateBlood(e) {
      const p = g.player;
      const dist = Math.abs(p.x - e.x);
      if (e.state === "walk") {
        facePlayer(e);
        e.vx = e.facing * 150;
        if (e.cd <= 0 && dist < 240 && dist > 36) {
          e.state = "hop";
          e.stateT = 0;
          e.didHit = false;
          e.vy = -580;
          e.onGround = false;
          e.vx = e.facing * 340;
          e.cd = 1.35;
        } else if (e.touch <= 0 && dist < 62 && p.y > GROUND - 30) {
          if (hurtPlayer(6 * ed(), e.x)) e.touch = 0.8;
        }
      } else if (e.state === "hop") {
        e.vx = e.facing * 340;
        if (!e.didHit && p.y > GROUND - 34 && Math.abs(p.x - e.x) < 64) {
          e.didHit = true;
          hurtPlayer(8 * ed(), e.x);
        }
        if (e.landed) e.state = "walk";
      }
    }

    function updateArmor(e) {
      const p = g.player;
      const dist = Math.abs(p.x - e.x);
      if (e.state === "walk") {
        facePlayer(e);
        if (dist < 120) e.vx = -e.facing * 60;
        else if (dist > 300) e.vx = e.facing * 88;
        else e.vx = 0;
        if (dist < 108 && e.cd <= 0) {
          e.state = "punch";
          e.stateT = 0;
          e.didHit = false;
          e.vx = 0;
          e.cd = 1.15;
        } else if (dist > 130 && dist < 560 && e.cd <= 0) {
          e.cd = 2.2;
          emit("missile");
          g.shots.push({
            kind: "missile",
            x: e.x + e.facing * 78 * e.scale,
            y: e.y - 108 * e.scale,
            vx: e.facing * 290,
            vy: -20,
            life: 3.2,
            r: 10,
          });
        }
      } else if (e.state === "punch") {
        e.vx = 0;
        if (!e.didHit && e.stateT > 0.14 && e.stateT < 0.26 && Math.abs(p.x - e.x) < 108 && p.y > GROUND - 36) {
          e.didHit = true;
          hurtPlayer(10 * ed(), e.x);
        }
        if (e.stateT > 0.42) e.state = "walk";
      }
    }

    function updateWarden(e) {
      const p = g.player;
      const dist = Math.abs(p.x - e.x);
      if (e.state === "walk") {
        facePlayer(e);
        if (dist < 230) e.vx = -e.facing * 78;
        else if (dist > 360) e.vx = e.facing * 96;
        else e.vx = 0;
        if (e.cd <= 0 && dist < 680 && dist > 70) {
          e.cd = 2.15;
          e.state = "shriek";
          e.stateT = 0;
          e.vx = 0;
        }
      } else if (e.state === "shriek") {
        e.vx = 0;
        facePlayer(e);
        if (e.stateT > 0.38) {
          emit("missile");
          g.shots.push({
            kind: "sonic",
            x: e.x + e.facing * 88 * e.scale,
            y: GROUND - 64,
            vx: e.facing * 400,
            vy: 0,
            life: 2.5,
            r: 16,
          });
          e.state = "walk";
        }
      }
    }

    function updateGold(e) {
      const p = g.player;
      const dist = Math.abs(p.x - e.x);
      if (e.state === "walk") {
        facePlayer(e);
        e.vx = dist > 48 ? e.facing * 105 : 0;
        if (e.cd <= 0 && dist < 540 && dist > 90) {
          e.state = "windup";
          e.stateT = 0;
          e.vx = 0;
          e.dashFacing = e.facing;
          e.cd = 2.55;
        }
      } else if (e.state === "windup") {
        e.vx = 0;
        e.facing = e.dashFacing;
        if (e.stateT > 0.64) {
          e.state = "dash";
          e.stateT = 0;
          e.didHit = false;
        }
      } else if (e.state === "dash") {
        e.facing = e.dashFacing;
        e.vx = e.dashFacing * 580;
        if (!e.didHit && p.y > GROUND - 26 && Math.abs(p.x - e.x) < 62) {
          e.didHit = true;
          hurtPlayer(14 * ed(), e.x);
        }
        if (e.stateT > 0.5) e.state = "walk";
      }
    }

    function beamHitsPlayer(e) {
      const p = g.player;
      const s = e.scale;
      const mouthX = e.x + e.facing * 96 * s;
      const far = e.facing > 0 ? W + 20 : -20;
      const x0 = Math.min(mouthX, far);
      const x1 = Math.max(mouthX, far);
      const box = bodyBox(p);
      if (box.x > x1 || box.x + box.w < x0) return false;
      if (e.beamH === 0) return p.y > GROUND - 10;
      if (e.beamH === 2) return p.y < GROUND - 48;
      const y = BEAM_Y[1];
      return box.y < y + 16 && box.y + box.h > y - 16;
    }

    function updateOmni(e, dt) {
      const p = g.player;
      const dist = Math.abs(p.x - e.x);
      if (e.phase === 1 && e.hp <= e.hpMax * 0.5 && !e.didSummon) {
        e.didSummon = true;
        e.phase = 2;
        emit("boom");
        const side = p.x < e.x ? -1 : 1;
        spawnEnemy("blood", side, clamp(e.x + side * 130, 80, W - 80));
      }
      if (e.state === "walk") {
        facePlayer(e);
        e.vx = dist > 240 ? e.facing * 72 : dist < 150 ? -e.facing * 40 : 0;
        if (dist < 110 && e.cd <= 0) {
          e.state = "bite";
          e.stateT = 0;
          e.didHit = false;
          e.vx = e.facing * 30;
          e.cd = 1.3;
        } else if (e.cd <= 0) {
          e.cd = e.phase === 2 ? 1.35 : 2.15;
          if (e.phase === 2 && Math.random() < 0.42) {
            g.shots.push({ kind: "bolt", x: clamp(p.x, 70, W - 70), life: 0.7, struck: false, r: 8 });
          } else {
            e.state = "beamWind";
            e.stateT = 0;
            e.vx = 0;
            e.beamH = Math.floor(Math.random() * 3);
          }
        }
      } else if (e.state === "beamWind") {
        e.vx = 0;
        if (e.stateT > 0.48) {
          e.state = "beam";
          e.stateT = 0;
          e.tick = 0;
          emit("missile");
        }
      } else if (e.state === "beam") {
        e.vx = 0;
        e.tick -= dt;
        if (beamHitsPlayer(e) && e.tick <= 0) {
          e.tick = 0.12;
          hurtPlayer(4 * ed(), e.x);
        }
        if (e.stateT > 0.34) {
          e.state = "walk";
          e.cd = e.phase === 2 ? 0.35 : 0.55;
        }
      } else if (e.state === "bite") {
        e.vx = e.facing * 50;
        if (!e.didHit && e.stateT > 0.16 && e.stateT < 0.3) {
          if (Math.abs(p.x - (e.x + e.facing * 100)) < 78 && p.y > GROUND - 40) {
            e.didHit = true;
            hurtPlayer(12 * ed(), e.x);
          }
        }
        if (e.stateT > 0.48) e.state = "walk";
      }
    }

    function updateEnemy(e, dt) {
      if (!e.alive) return;
      e.flash = Math.max(0, e.flash - dt);
      e.touch = Math.max(0, e.touch - dt);
      e.stateT += dt;
      if (e.stun > 0) {
        e.stun -= dt;
        e.vx = 0;
        if (e.behavior === "omni" && (e.state === "beam" || e.state === "beamWind")) updateOmni(e, dt);
        physics(e, dt);
        return;
      }
      e.cd -= dt;
      if (e.behavior === "lunge") updateBlood(e);
      else if (e.behavior === "armor") updateArmor(e);
      else if (e.behavior === "shriek") updateWarden(e);
      else if (e.behavior === "charge") updateGold(e);
      else if (e.behavior === "omni") updateOmni(e, dt);
      physics(e, dt);
    }

    function updatePlayer(dt, input) {
      const p = g.player;
      if (!p || p.dead) return;
      p.invuln = Math.max(0, p.invuln - dt);
      p.flash = Math.max(0, p.flash - dt);
      p.roarCd = Math.max(0, p.roarCd - dt);
      p.comboT -= dt;
      if (p.comboT <= 0) p.combo = 0;
      p.stateT += dt;

      const locked = p.state === "roar" || p.state === "breath";
      if (!locked) {
        if (input.left && !input.right) {
          p.vx = -SPEED;
          p.facing = -1;
        } else if (input.right && !input.left) {
          p.vx = SPEED;
          p.facing = 1;
        } else if (p.state !== "slam") p.vx *= 0.55;
      } else if (p.state !== "slam") {
        p.vx = 0;
      }

      if (input.jump && p.onGround && p.state !== "roar") {
        p.vy = -JUMP;
        p.onGround = false;
        if (p.state === "breath" || p.state === "strike") p.state = "idle";
      }

      if (input.roar && !g.latch.roar && p.roarCd <= 0 && p.energy >= 38 && p.onGround && p.state !== "strike") {
        g.latch.roar = true;
        p.state = "roar";
        p.stateT = 0;
        p.didHit = false;
        p.vx = 0;
      }

      if (p.state === "roar" && !p.didHit && p.stateT > 0.08) {
        p.didHit = true;
        applyRoar();
      }
      if (p.state === "roar" && p.stateT > 0.55) p.state = "idle";

      if (input.strike && p.state === "idle" && p.onGround) {
        p.state = "strike";
        p.stateT = 0;
        p.didHit = false;
        p.vx = 0;
      } else if (input.strike && !p.onGround && p.state !== "slam" && p.state !== "roar") {
        p.state = "slam";
        p.stateT = 0;
        p.slamDone = false;
        p.vy = Math.max(p.vy, 520);
      }

      if (p.state === "strike") {
        if (!p.didHit && p.stateT > 0.08 && p.stateT < 0.18) {
          p.didHit = true;
          applyMelee();
        }
        if (p.stateT > 0.3) p.state = "idle";
      }

      const wantBreath = input.breath && p.energy > 0.5 && p.onGround && (p.state === "idle" || p.state === "breath");
      if (wantBreath) {
        if (p.state !== "breath") {
          p.state = "breath";
          p.stateT = 0;
          emit("breath");
        }
        p.vx = 0;
        p.energy = Math.max(0, p.energy - 28 * dt);
        applyBreath(dt);
        if (p.energy <= 0) p.state = "idle";
      } else if (p.state === "breath") {
        p.state = "idle";
      } else {
        p.energy = Math.min(100, p.energy + 17 * dt);
      }

      physics(p, dt);
      if (Math.abs(p.vx) < 8) p.vx = 0;

      if (p.state === "slam") {
        if (p.landed && !p.slamDone) {
          p.slamDone = true;
          applySlam();
        }
        if (p.slamDone && p.onGround && p.stateT > 0.16) p.state = "idle";
      }
    }

    function updateShots(dt) {
      const p = g.player;
      const next = [];
      g.shots.forEach(function (s) {
        if (s.kind === "bolt") {
          s.life -= dt;
          if (!s.struck && s.life <= 0) {
            s.struck = true;
            g.shake = Math.max(g.shake, 0.55);
            emit("boom");
            if (p && Math.abs(p.x - s.x) < 48) hurtPlayer(11 * ed(), s.x);
            burst(s.x, GROUND - 20, "gold", 8, 140);
          }
          if (s.life > -0.18) next.push(s);
          return;
        }
        s.life -= dt;
        if (s.kind === "missile") s.vy += 380 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.life <= 0 || s.x < -40 || s.x > W + 40 || s.y > GROUND + 10) return;
        if (p && !p.dead && g.mode === "fight" && circleHitsBox(s.x, s.y, s.r, bodyBox(p))) {
          const dmg = s.kind === "sonic" ? 8 : 6;
          hurtPlayer(dmg * ed(), s.x);
          burst(s.x, s.y, s.kind === "sonic" ? "sonic" : "gold", 6, 100);
          return;
        }
        next.push(s);
      });
      g.shots = next;
    }

    function updatePickups(dt) {
      const p = g.player;
      const next = [];
      g.pickups.forEach(function (o) {
        o.life -= dt;
        o.vy += GRAV * 0.45 * dt;
        o.y += o.vy * dt;
        if (o.y > GROUND - 16) {
          o.y = GROUND - 16;
          o.vy = 0;
        }
        if (o.life <= 0) return;
        if (p && !p.dead && Math.abs(p.x - o.x) < 46 && Math.abs(p.y - o.y) < 150) {
          if (o.kind === "hp") {
            p.hp = Math.min(100, p.hp + 20);
            floatText(p.x, p.y - 160, "+20", "energy");
          } else {
            p.energy = Math.min(100, p.energy + 34);
            floatText(p.x, p.y - 160, "+EN", "sonic");
          }
          emit("hit");
          return;
        }
        next.push(o);
      });
      g.pickups = next;
    }

    function updateBits(dt) {
      g.parts.forEach(function (p) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 500 * dt;
      });
      g.parts = g.parts.filter(function (p) {
        return p.life > 0;
      });
      g.floats.forEach(function (f) {
        f.life -= dt;
        f.y -= 28 * dt;
      });
      g.floats = g.floats.filter(function (f) {
        return f.life > 0;
      });
      const still = [];
      g.buildings.forEach(function (b) {
        if (b.hp > 0) {
          still.push(b);
          return;
        }
        g.score += 40;
        burst(b.x + b.w / 2, GROUND - 30, "text", 12, 150);
        emit("boom");
      });
      g.buildings = still;
    }

    function separate() {
      const list = g.enemies.filter(function (e) {
        return e.alive;
      });
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          const min = (a.scale + b.scale) * 38;
          const dx = b.x - a.x;
          const ad = Math.abs(dx);
          if (ad < min && ad > 0.01) {
            const push = (min - ad) / 2;
            const s = Math.sign(dx);
            a.x -= s * push;
            b.x += s * push;
          }
        }
      }
    }

    function checkClear() {
      if (g.mode !== "fight") return;
      if (!g.queue.length) return;
      if (!g.queue.every(function (s) { return s.done; })) return;
      if (g.enemies.some(function (e) { return e.alive; })) return;
      g.mode = "waveClear";
      g.modeT = 0;
      emit("wave");
    }

    function openWave(index, heal) {
      g.wave = index;
      g.mode = "announce";
      g.modeT = 0;
      g.enemies = [];
      g.shots = [];
      g.queue = [];
      const p = g.player;
      if (p) {
        p.dead = false;
        p.state = "idle";
        p.vx = 0;
        p.vy = 0;
        p.invuln = 0.7;
        if (heal) {
          p.hp = Math.min(100, p.hp + 22);
          p.energy = 100;
        }
      }
    }

    function beginFight() {
      g.mode = "fight";
      g.modeT = 0;
      g.waveT = 0;
      g.queue = WAVES[g.wave].spawns.map(function (s) {
        return { kind: s.kind, t: s.t, side: s.side, done: false };
      });
      const p = g.player;
      g.snap = {
        hp: p.hp,
        energy: p.energy,
        score: g.score,
        kills: g.kills,
        buildings: g.buildings.map(function (b) { return { x: b.x, w: b.w, h: b.h, hp: b.hp, hpMax: b.hpMax, seed: b.seed }; }),
      };
    }

    function newGame() {
      g.score = 0;
      g.kills = 0;
      g.shots = [];
      g.parts = [];
      g.floats = [];
      g.pickups = [];
      g.buildings = makeBuildings();
      resetPlayer(100, 100);
      openWave(0, false);
      emit("wave");
    }

    function retryWave() {
      const snap = g.snap;
      g.buildings = snap ? snap.buildings.map(function (b) { return { x: b.x, w: b.w, h: b.h, hp: b.hp, hpMax: b.hpMax, seed: b.seed }; }) : makeBuildings();
      g.shots = [];
      g.parts = [];
      g.floats = [];
      g.pickups = [];
      resetPlayer(snap ? snap.hp : 100, snap ? snap.energy : 100);
      g.score = snap ? snap.score : 0;
      g.kills = snap ? snap.kills : 0;
      openWave(g.wave, false);
    }

    function toTitle() {
      g.mode = "title";
      g.modeT = 0;
      g.enemies = [];
      g.shots = [];
      g.parts = [];
      g.floats = [];
      g.pickups = [];
    }

    function onStart() {
      if (g.mode === "title" || g.mode === "victory") newGame();
      else if (g.mode === "announce") beginFight();
      else if (g.mode === "gameover") retryWave();
      else if (g.mode === "pause") g.mode = "fight";
    }

    function onPause() {
      if (g.mode === "fight") g.mode = "pause";
      else if (g.mode === "pause") g.mode = "fight";
      else if (g.mode === "gameover" || g.mode === "victory") toTitle();
    }

    function step(dt, input) {
      dt = clamp(dt || 0, 0, 0.05);
      input = input || {};
      g.events = [];
      g.time += dt;
      g.modeT += dt;
      g.shake = Math.max(0, g.shake - dt * 1.8);

      const startPressed = !!(input.start || ((g.mode === "title" || g.mode === "gameover" || g.mode === "victory") && input.jump));
      if (startPressed && !g.latch.start) {
        g.latch.start = true;
        onStart();
      }
      if (!startPressed) g.latch.start = false;
      if (input.pause && !g.latch.pause) {
        g.latch.pause = true;
        onPause();
      }
      if (!input.pause) g.latch.pause = false;
      if (!input.roar) g.latch.roar = false;

      if (g.mode === "title") {
        updateBits(dt);
        return g.events;
      }

      if (g.mode === "announce") {
        if (g.modeT > 1.35) beginFight();
        updateBits(dt);
        return g.events;
      }

      if (g.mode === "waveClear") {
        updateBits(dt);
        if (g.modeT > 1.25) {
          if (g.wave >= WAVES.length - 1) {
            g.mode = "victory";
            g.modeT = 0;
            emit("victory");
          } else openWave(g.wave + 1, true);
        }
        return g.events;
      }

      if (g.mode === "dying") {
        updateBits(dt);
        if (g.modeT > 1.05) {
          g.mode = "gameover";
          g.modeT = 0;
        }
        return g.events;
      }

      if (g.mode === "pause" || g.mode === "gameover" || g.mode === "victory") {
        updateBits(dt);
        if (g.score > g.best) {
          g.best = g.score;
          emit("best");
        }
        return g.events;
      }

      if (g.mode === "fight") {
        g.waveT += dt;
        g.queue.forEach(function (s) {
          if (!s.done && g.waveT >= s.t) {
            s.done = true;
            spawnEnemy(s.kind, s.side);
          }
        });
        updatePlayer(dt, input);
        g.enemies.forEach(function (e) { updateEnemy(e, dt); });
        separate();
        updateShots(dt);
        updatePickups(dt);
        updateBits(dt);
        g.enemies = g.enemies.filter(function (e) { return e.alive; });
        checkClear();
        if (g.score > g.best) {
          g.best = g.score;
          emit("best");
        }
      }
      return g.events;
    }

    function styleFor(kind, pal, mouthOpen) {
      if (kind === "player") {
        return { body: pal.gz, belly: pal.gzBelly, plate: pal.gzPlate, eye: pal.gzEye, pupil: pal.pupil, plateColors: null, horns: false, core: null, armor: false, cannon: null, drips: false, shine: null, mouthOpen: mouthOpen };
      }
      if (kind === "blood") {
        return { body: pal.blood, belly: pal.bloodDeep, plate: pal.bloodDeep, eye: pal.gzEye, pupil: pal.pupil, plateColors: null, horns: false, core: null, armor: false, cannon: null, drips: true, shine: null, mouthOpen: false };
      }
      if (kind === "armored") {
        return { body: pal.armor, belly: pal.armorDark, plate: pal.armorDark, eye: pal.gzEye, pupil: pal.pupil, plateColors: null, horns: false, core: null, armor: true, cannon: pal.cannon, drips: false, shine: null, mouthOpen: false };
      }
      if (kind === "warden") {
        return { body: pal.warden, belly: pal.warden, plate: pal.wardenGlow, eye: pal.wardenGlow, pupil: pal.pupil, plateColors: null, horns: true, core: pal.wardenGlow, armor: false, cannon: null, drips: false, shine: null, mouthOpen: false };
      }
      if (kind === "gold") {
        return { body: pal.gold, belly: pal.goldDeep, plate: pal.goldDeep, eye: pal.pupil, pupil: pal.goldDeep, plateColors: null, horns: false, core: null, armor: false, cannon: null, drips: false, shine: pal.moon, mouthOpen: false };
      }
      const plates = pal.omniPlates || [pal.gzPlate, pal.gold, pal.sonic, pal.blood];
      return { body: pal.omni, belly: pal.armor, plate: plates[0], eye: pal.gold, pupil: pal.pupil, plateColors: plates, horns: true, core: null, armor: false, cannon: null, drips: false, shine: pal.moon, mouthOpen: false };
    }

    function drawPlate(ctx, x, y, h, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 4);
      ctx.lineTo(x + 8, y + 8);
      ctx.lineTo(x + 1, y - h);
      ctx.closePath();
      ctx.fill();
    }

    function drawZilla(ctx, pal, o) {
      const st = styleFor(o.kind, pal, !!o.mouthOpen);
      const bob = o.bob || 0;
      ctx.save();
      ctx.translate(o.x, o.y - bob);
      if (o.dead) ctx.rotate(o.facing * 0.55);
      ctx.scale((o.facing || 1) * o.scale, o.scale);

      ctx.fillStyle = st.body;
      ctx.beginPath();
      ctx.moveTo(-14, -14);
      ctx.quadraticCurveTo(-86, -6, -138, -34);
      ctx.quadraticCurveTo(-100, -22, -72, -58);
      ctx.quadraticCurveTo(-36, -40, -14, -66);
      ctx.fill();

      ctx.fillRect(-40, -62, 24, 62);
      ctx.fillRect(4, -70, 28, 70);

      ctx.beginPath();
      ctx.moveTo(-24, -2);
      ctx.lineTo(-18, -62);
      ctx.quadraticCurveTo(-4, -98, 22, -122);
      ctx.quadraticCurveTo(40, -140, 52, -156);
      ctx.lineTo(102, -134);
      ctx.lineTo(108, -118);
      ctx.lineTo(90, -110);
      ctx.quadraticCurveTo(62, -102, 46, -90);
      ctx.quadraticCurveTo(34, -70, 28, -36);
      ctx.lineTo(24, -2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = st.belly;
      ctx.beginPath();
      ctx.ellipse(16, -62, 15, 26, -0.15, 0, Math.PI * 2);
      ctx.fill();

      const plateCols = st.plateColors;
      const platePts = [
        { x: -6, y: -104, h: 22 },
        { x: 16, y: -126, h: 28 },
        { x: 36, y: -148, h: 30 },
        { x: 54, y: -162, h: 20 },
      ];
      platePts.forEach(function (pt, i) {
        drawPlate(ctx, pt.x, pt.y, pt.h, plateCols ? plateCols[i % plateCols.length] : st.plate);
      });

      ctx.fillStyle = st.body;
      ctx.beginPath();
      ctx.moveTo(34, -108);
      ctx.quadraticCurveTo(62, -96, 74, -78);
      ctx.lineTo(60, -74);
      ctx.quadraticCurveTo(46, -88, 30, -98);
      ctx.fill();

      if (st.shine) {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = st.shine;
        ctx.beginPath();
        ctx.ellipse(8, -78, 7, 16, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (st.horns) {
        ctx.fillStyle = st.core || st.plate;
        ctx.beginPath();
        ctx.moveTo(46, -150);
        ctx.lineTo(58, -146);
        ctx.lineTo(44, -196);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(64, -146);
        ctx.lineTo(76, -140);
        ctx.lineTo(86, -188);
        ctx.fill();
      }

      if (st.core) {
        ctx.fillStyle = st.core;
        ctx.beginPath();
        ctx.arc(22, -84, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.moon;
        ctx.beginPath();
        ctx.arc(22, -84, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (st.armor) {
        ctx.fillStyle = st.plate;
        ctx.fillRect(2, -100, 30, 24);
        ctx.fillRect(24, -128, 28, 12);
        ctx.fillStyle = st.cannon || st.plate;
        ctx.fillRect(48, -126, 40, 9);
        ctx.fillRect(84, -129, 8, 15);
      }

      ctx.fillStyle = st.eye;
      ctx.beginPath();
      ctx.arc(78, -132, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.pupil;
      ctx.beginPath();
      ctx.arc(80, -132, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = pal.moon;
      const teethY = st.mouthOpen ? -104 : -112;
      for (let i = 0; i < 3; i++) {
        const tx = 86 + i * 6;
        ctx.beginPath();
        ctx.moveTo(tx, teethY);
        ctx.lineTo(tx + 4, teethY);
        ctx.lineTo(tx + 2, teethY + 6);
        ctx.fill();
      }
      if (st.mouthOpen) {
        ctx.fillStyle = pal.breathCore;
        ctx.fillRect(84, -112, 22, 8);
      }

      if (st.drips) {
        ctx.fillStyle = st.body;
        for (let i = 0; i < 3; i++) {
          const dy = 6 + ((g.time * 36 + i * 15) % 28);
          ctx.beginPath();
          ctx.arc(92, -108 + dy, 2.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }

    function drawShadow(ctx, pal, a) {
      ctx.save();
      ctx.translate(a.x, GROUND + 2);
      ctx.scale(1, 0.32);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = pal.shadow;
      ctx.beginPath();
      ctx.ellipse(0, 0, 40 * a.scale, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function roundRect(ctx, x, y, w, h) {
      ctx.fillRect(x, y, w, h);
    }

    function drawBuilding(ctx, pal, b, wreckable) {
      const top = GROUND - b.h;
      ctx.fillStyle = wreckable ? pal.building : pal.skyline;
      ctx.fillRect(b.x, top, b.w, b.h);
      ctx.strokeStyle = pal.buildingEdge;
      ctx.strokeRect(b.x + 0.5, top + 0.5, b.w - 1, b.h - 1);
      const lit = pal.window;
      const dim = pal.windowDim;
      for (let y = top + 10; y < GROUND - 16; y += 16) {
        for (let x = b.x + 8; x < b.x + b.w - 10; x += 14) {
          const n = (x * 13 + y * 7 + b.seed * 19) % 10;
          ctx.fillStyle = n > 6 ? lit : dim;
          ctx.fillRect(x, y, 6, 8);
        }
      }
      if (wreckable && b.hp < b.hpMax) {
        const f = b.hp / b.hpMax;
        ctx.fillStyle = pal.hp;
        ctx.fillRect(b.x, top - 6, b.w * f, 3);
      }
    }

    function drawActor(ctx, pal, a, mouthOpen) {
      if (a.invuln > 0 && Math.sin(g.time * 38) > 0) ctx.globalAlpha = 0.45;
      drawZilla(ctx, pal, {
        kind: a.kind,
        x: a.x,
        y: a.y,
        facing: a.facing,
        scale: a.scale,
        mouthOpen: mouthOpen,
        dead: !!a.dead,
        bob: a.onGround ? Math.sin(g.time * (Math.abs(a.vx) > 20 ? 12 : 2) + a.x * 0.01) * 1.4 : 0,
      });
      ctx.globalAlpha = 1;
      if (a.kind !== "player" && a.hp > 0) {
        const bw = 54 * a.scale;
        const bx = a.x - bw / 2;
        const by = a.y - 168 * a.scale;
        ctx.fillStyle = pal.hpBack;
        roundRect(ctx, bx, by, bw, 5);
        ctx.fillStyle = a.boss ? pal.gold : pal.hp;
        roundRect(ctx, bx, by, bw * clamp(a.hp / a.hpMax, 0, 1), 5);
      }
    }

    function drawShots(ctx, pal) {
      g.shots.forEach(function (s) {
        if (s.kind === "missile") {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(Math.atan2(s.vy, s.vx));
          ctx.fillStyle = pal.missile;
          ctx.fillRect(-8, -3, 16, 6);
          ctx.fillStyle = pal.gold;
          ctx.beginPath();
          ctx.moveTo(8, -4);
          ctx.lineTo(16, 0);
          ctx.lineTo(8, 4);
          ctx.fill();
          ctx.restore();
        } else if (s.kind === "sonic") {
          ctx.strokeStyle = pal.sonic;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(s.x - Math.sign(s.vx) * 10, s.y, s.r * 0.55, 0, Math.PI * 2);
          ctx.stroke();
        } else if (s.kind === "bolt") {
          ctx.strokeStyle = pal.warn;
          ctx.lineWidth = s.struck ? 8 : 2;
          ctx.globalAlpha = s.struck ? 0.95 : 0.7;
          ctx.beginPath();
          ctx.moveTo(s.x, 30);
          ctx.lineTo(s.x, GROUND);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = pal.warn;
          ctx.fillRect(s.x - 16, GROUND - 4, 32, 4);
        }
      });
    }

    function drawBeams(ctx, pal) {
      g.enemies.forEach(function (e) {
        if (e.kind !== "omni") return;
        if (e.state !== "beam" && e.state !== "beamWind") return;
        const cols = pal.omniPlates || [pal.sonic];
        const col = cols[e.beamH % cols.length];
        const y = BEAM_Y[e.beamH] || BEAM_Y[0];
        const mouthX = e.x + e.facing * 96 * e.scale;
        const far = e.facing > 0 ? W : 0;
        const x = Math.min(mouthX, far);
        const w = Math.abs(far - mouthX);
        ctx.fillStyle = col;
        ctx.globalAlpha = e.state === "beam" ? 0.9 : 0.35;
        const thick = e.state === "beam" ? 16 : 3;
        ctx.fillRect(x, y - thick / 2, w, thick);
        ctx.globalAlpha = 1;
      });
    }

    function drawChargeLine(ctx, pal) {
      g.enemies.forEach(function (e) {
        if (e.kind !== "gold" || e.state !== "windup") return;
        ctx.fillStyle = pal.warn;
        ctx.globalAlpha = 0.85;
        const x = e.dashFacing > 0 ? e.x : 0;
        const w = e.dashFacing > 0 ? W - e.x : e.x;
        ctx.fillRect(x, GROUND - 6, w, 4);
        ctx.globalAlpha = 1;
      });
    }

    function bar(ctx, x, y, w, h, frac, back, fill) {
      ctx.fillStyle = back;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
    }

    function drawHud(ctx, pal) {
      const p = g.player;
      ctx.fillStyle = pal.text;
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("HP", 16, 22);
      ctx.fillText("EN", 16, 40);
      if (p) {
        bar(ctx, 40, 12, 180, 10, p.hp / 100, pal.hpBack, pal.hp);
        bar(ctx, 40, 30, 180, 10, p.energy / 100, pal.energyBack, pal.energy);
        const roar = p.roarCd <= 0 ? "ROAR READY" : "ROAR " + p.roarCd.toFixed(1);
        ctx.fillStyle = p.roarCd <= 0 ? pal.energy : pal.textDim;
        ctx.fillText(roar, 232, 40);
        if (p.combo > 1) {
          ctx.fillStyle = pal.gold;
          ctx.fillText(p.combo + " HIT", 232, 22);
        }
      }
      ctx.fillStyle = pal.text;
      ctx.textAlign = "right";
      ctx.fillText("SCORE " + g.score, W - 16, 22);
      ctx.fillStyle = pal.textDim;
      ctx.fillText("BEST " + g.best, W - 16, 40);
      ctx.textAlign = "center";
      ctx.fillStyle = pal.text;
      const wave = WAVES[g.wave];
      ctx.fillText("WAVE " + (g.wave + 1) + "  " + (wave ? wave.name.toUpperCase() : ""), W / 2, 22);
      ctx.fillStyle = pal.textDim;
      ctx.fillText(g.diff.toUpperCase(), W / 2, 40);

      const boss = g.enemies.filter(function (e) { return e.boss; })[0];
      if (boss) {
        ctx.fillStyle = pal.text;
        ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(boss.phase === 2 ? "OMNI GODZILLA  PHASE 2" : "OMNI GODZILLA", W / 2, 62);
        bar(ctx, W / 2 - 160, 68, 320, 8, boss.hp / boss.hpMax, pal.hpBack, pal.gold);
      }

      if (g.mode === "fight" && g.waveT < 4 && wave) {
        ctx.fillStyle = pal.text;
        ctx.font = "13px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(wave.tip, W / 2, H - 16);
      }
    }

    function panel(ctx, pal, x, y, w, h) {
      ctx.save();
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = pal.panel;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = pal.buildingEdge;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      ctx.restore();
    }

    function drawBackdrop(ctx, pal) {
      ctx.fillStyle = pal.sky;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = pal.moon;
      ctx.beginPath();
      ctx.arc(780, 78, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.sky;
      ctx.beginPath();
      ctx.arc(792, 72, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.moon;
      for (let i = 0; i < 28; i++) {
        const sx = (i * 97) % W;
        const sy = 16 + ((i * 53) % 160);
        ctx.globalAlpha = 0.35 + ((i * 3) % 5) * 0.1;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
      g.skyline.forEach(function (b) { drawBuilding(ctx, pal, b, false); });
      g.buildings.forEach(function (b) { drawBuilding(ctx, pal, b, true); });
      ctx.fillStyle = pal.ground;
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = pal.groundTop;
      ctx.fillRect(0, GROUND, W, 4);
    }

    function toneColor(pal, tone) {
      if (tone === "hp") return pal.hp;
      if (tone === "energy") return pal.energy;
      if (tone === "sonic") return pal.sonic;
      if (tone === "gold") return pal.gold;
      if (tone === "breath") return pal.breath;
      return pal.text;
    }

    function drawWorld(ctx, pal) {
      drawBackdrop(ctx, pal);
      drawChargeLine(ctx, pal);
      g.pickups.forEach(function (o) {
        ctx.fillStyle = o.kind === "hp" ? pal.hp : pal.energy;
        ctx.beginPath();
        ctx.moveTo(o.x, o.y - 10);
        ctx.lineTo(o.x + 8, o.y);
        ctx.lineTo(o.x, o.y + 10);
        ctx.lineTo(o.x - 8, o.y);
        ctx.fill();
      });
      const actors = g.enemies.slice();
      actors.sort(function (a, b) { return a.x - b.x; });
      actors.forEach(function (e) {
        if (e.state === "shriek") {
          ctx.strokeStyle = pal.sonic;
          ctx.globalAlpha = 0.6;
          ctx.beginPath();
          ctx.arc(e.x + e.facing * 40, e.y - 90, 18 + e.stateT * 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        drawShadow(ctx, pal, e);
        drawActor(ctx, pal, e, e.state === "beam" || e.state === "bite");
      });
      if (g.player && g.mode !== "title") {
        drawShadow(ctx, pal, g.player);
        const breathing = g.player.state === "breath" && g.mode === "fight";
        if (breathing) {
          const box = breathBox();
          ctx.fillStyle = pal.breath;
          ctx.globalAlpha = 0.9;
          ctx.fillRect(box.x, box.y, box.w, box.h);
          ctx.fillStyle = pal.breathCore;
          ctx.fillRect(box.x + (g.player.facing > 0 ? 0 : box.w * 0.15), box.y + box.h * 0.28, box.w * 0.82, box.h * 0.4);
          ctx.globalAlpha = 1;
        }
        if (g.player.state === "roar") {
          ctx.strokeStyle = pal.sonic;
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(g.player.x, g.player.y - 80, 40 + g.player.stateT * 280, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        drawActor(ctx, pal, g.player, breathing || g.player.state === "roar");
      }
      drawBeams(ctx, pal);
      drawShots(ctx, pal);
      g.parts.forEach(function (pt) {
        ctx.globalAlpha = clamp(pt.life * 2, 0, 1);
        ctx.fillStyle = toneColor(pal, pt.tone);
        ctx.fillRect(pt.x, pt.y, pt.r, pt.r);
      });
      ctx.globalAlpha = 1;
      g.floats.forEach(function (f) {
        ctx.globalAlpha = clamp(f.life, 0, 1);
        ctx.fillStyle = toneColor(pal, f.tone);
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(f.text, f.x, f.y);
      });
      ctx.globalAlpha = 1;
    }

    function draw(ctx, pal) {
      ctx.save();
      if (g.shake > 0 && !g.reduce) {
        const m = g.shake * 10;
        ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
      }
      if (!g.skyline.length) g.skyline = makeSkyline();
      if (g.mode === "title") {
        drawBackdrop(ctx, pal);
        TITLE.forEach(function (t) {
          const k = KINDS[t.kind];
          const scale = 0.56 * (t.kind === "omni" ? 1.12 : 1);
          drawShadow(ctx, pal, { x: t.x, scale: scale });
          drawZilla(ctx, pal, { kind: t.kind, x: t.x, y: GROUND, facing: -1, scale: scale, bob: Math.sin(g.time * 2 + t.x) * 1.2 });
          ctx.fillStyle = pal.text;
          ctx.font = "12px system-ui, sans-serif";
          ctx.textAlign = "center";
          const label = t.kind === "warden" ? "WARDENZILLA" : k.name.toUpperCase();
          ctx.fillText(label, t.x, GROUND - 168 * scale - 8);
        });
        ctx.fillStyle = pal.text;
        ctx.textAlign = "left";
        ctx.font = "bold 32px system-ui, sans-serif";
        ctx.fillText("GODZILLA BATTLE", 28, 78);
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillStyle = pal.textDim;
        ctx.fillText("You are Godzilla. Five custom kaiju stand in the city.", 28, 104);
        ctx.fillStyle = pal.text;
        ctx.font = "13px system-ui, sans-serif";
        const lines = [
          "A D or arrows  move     W or Space  jump",
          "J or Z  strike     hold K or X  atomic breath",
          "L or C  roar     Esc  pause     M  mute     1 2 3  difficulty",
        ];
        lines.forEach(function (line, i) { ctx.fillText(line, 28, 146 + i * 20); });
        ctx.fillStyle = pal.energy;
        ctx.font = "16px system-ui, sans-serif";
        ctx.globalAlpha = 0.65 + Math.sin(g.time * 3) * 0.35;
        ctx.fillText("ENTER TO START", 28, 230);
        ctx.globalAlpha = 1;
        ctx.fillStyle = pal.textDim;
        ctx.font = "12px system-ui, sans-serif";
        ctx.fillText("BEST " + g.best + "    " + g.diff.toUpperCase(), 28, 256);
        ctx.fillText("Not affiliated with Toho.", 28, H - 18);
      } else {
        drawWorld(ctx, pal);
        drawHud(ctx, pal);
        if (g.mode === "announce") {
          const wave = WAVES[g.wave];
          panel(ctx, pal, 230, 180, 500, 120);
          ctx.fillStyle = pal.text;
          ctx.textAlign = "center";
          ctx.font = "12px system-ui, sans-serif";
          ctx.fillText("WAVE " + (g.wave + 1) + " OF " + WAVES.length, W / 2, 214);
          ctx.font = "bold 22px system-ui, sans-serif";
          ctx.fillText(wave.name.toUpperCase(), W / 2, 248);
          ctx.font = "13px system-ui, sans-serif";
          ctx.fillStyle = pal.textDim;
          ctx.fillText(wave.tip, W / 2, 276);
        } else if (g.mode === "waveClear") {
          panel(ctx, pal, 300, 200, 360, 80);
          ctx.fillStyle = pal.text;
          ctx.textAlign = "center";
          ctx.font = "bold 20px system-ui, sans-serif";
          ctx.fillText(g.wave >= WAVES.length - 1 ? "CITY CLEAR" : "WAVE CLEAR", W / 2, 248);
        } else if (g.mode === "pause") {
          panel(ctx, pal, 330, 200, 300, 80);
          ctx.fillStyle = pal.text;
          ctx.textAlign = "center";
          ctx.font = "bold 22px system-ui, sans-serif";
          ctx.fillText("PAUSED", W / 2, 248);
        } else if (g.mode === "gameover" || g.mode === "dying") {
          if (g.mode === "gameover") {
            panel(ctx, pal, 250, 180, 460, 130);
            ctx.fillStyle = pal.text;
            ctx.textAlign = "center";
            ctx.font = "bold 22px system-ui, sans-serif";
            ctx.fillText("GODZILLA DOWN", W / 2, 220);
            ctx.font = "14px system-ui, sans-serif";
            ctx.fillStyle = pal.textDim;
            ctx.fillText("Score " + g.score, W / 2, 248);
            ctx.fillText("Enter retries the wave. Esc returns to the title.", W / 2, 276);
          }
        } else if (g.mode === "victory") {
          panel(ctx, pal, 230, 168, 500, 150);
          ctx.fillStyle = pal.text;
          ctx.textAlign = "center";
          ctx.font = "bold 22px system-ui, sans-serif";
          ctx.fillText("OMNI GODZILLA FALLS", W / 2, 210);
          ctx.font = "14px system-ui, sans-serif";
          ctx.fillStyle = pal.textDim;
          ctx.fillText("The city is yours. Score " + g.score, W / 2, 242);
          ctx.fillText(g.kills + " kaiju down.", W / 2, 264);
          ctx.fillText("Enter fights again.", W / 2, 292);
        }
      }
      ctx.restore();
    }

    g.skyline = makeSkyline();
    g.buildings = makeBuildings();

    return {
      step: step,
      draw: draw,
      newGame: newGame,
      setDiff: function (d) {
        if (!DIFFS[d]) return;
        if (g.mode === "title" || g.mode === "gameover" || g.mode === "victory") g.diff = d;
      },
      setBest: function (n) { g.best = n || 0; },
      setReduce: function (v) { g.reduce = !!v; },
      spawn: function (kind, x) {
        if (!g.player) resetPlayer(100, 100);
        return spawnEnemy(kind, 1, x);
      },
      killAll: function () {
        g.enemies.forEach(function (e) { damageEnemy(e, 99999, false, false); });
        g.enemies = g.enemies.filter(function (e) { return e.alive; });
        checkClear();
      },
      hurt: function (n) { hurtPlayer(n, g.player ? g.player.x : 0); },
      go: function (wave) {
        g.score = 0;
        g.kills = 0;
        g.buildings = makeBuildings();
        resetPlayer(100, 100);
        g.player.invuln = 0;
        openWave(wave, false);
        beginFight();
        g.player.invuln = 0;
      },
      W: W,
      H: H,
      GROUND: GROUND,
      g: g,
    };
  }

  return { createGame: createGame, W: W, H: H, GROUND: GROUND, WAVES: WAVES, KINDS: KINDS };
});
