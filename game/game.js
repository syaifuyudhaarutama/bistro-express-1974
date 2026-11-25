(function () {
  "use strict";

  const SHIFT_DURATION = 150; // 02:30 in seconds
  const CURVE_INTERVAL = 25;  // Curve twist every 25 seconds
  const CURVE_WARN_DUR = 3.8;
  const CURVE_GOLDEN_DUR = 3.2;

  const COLORS = {
    pullman: "#173B2D",
    pullmanDark: "#0E251C",
    mahogany: "#4A281A",
    mahoganyDeep: "#2D170E",
    porcelain: "#F6EFE2",
    porcelainSoft: "#E7DBC6",
    brass: "#D4A039",
    brassBright: "#EBC26B",
    brassDeep: "#8E6319",
    ink: "#1B1A17",
    inkMuted: "#554B3E",
    ok: "#226B46",
    warn: "#C97A16",
    danger: "#9E2A2B"
  };

  const INGREDIENTS = [
    { id: "brioche", key: "1", name: "Brioche", station: "Q / A", cookOn: "skillet", cookedName: "Toasted Brioche", directName: "Brioche Crouton" },
    { id: "ham", key: "2", name: "Ham", station: "Q", cookOn: "skillet", cookedName: "Seared Ham", directName: null },
    { id: "egg", key: "3", name: "Egg", station: "Q", cookOn: "skillet", cookedName: "Beaten Egg", directName: null },
    { id: "mushroom", key: "4", name: "Mushroom", station: "Q", cookOn: "skillet", cookedName: "Sauteed Mushroom", directName: null },
    { id: "tomato", key: "5", name: "Tomato", station: "W", cookOn: "saucepan", cookedName: "Simmered Tomato", directName: null },
    { id: "beef", key: "6", name: "Beef", station: "Q", cookOn: "skillet", cookedName: "Seared Beef", directName: null },
    { id: "cheese", key: "7", name: "Cheese", station: "Q / A", cookOn: "skillet", cookedName: "Melted Cheese", directName: "Melted Cheese" },
    { id: "cream", key: "8", name: "Cream", station: "W / A", cookOn: "saucepan", cookedName: "Cream Swirl", directName: "Cream Swirl" },
    { id: "butter", key: "9", name: "Herb Butter", station: "A", cookOn: null, cookedName: null, directName: "Herb Butter" }
  ];

  const DISHES = [
    {
      id: "croque",
      name: "Continental Croque",
      short: "Croque",
      layers: ["Toasted Brioche", "Melted Cheese", "Seared Ham"],
      tip: 14
    },
    {
      id: "omelette",
      name: "Alpine Mushroom Omelette",
      short: "Omelette",
      layers: ["Beaten Egg", "Sauteed Mushroom", "Herb Butter"],
      tip: 15
    },
    {
      id: "bisque",
      name: "Bistro Tomato Bisque",
      short: "Tomato Bisque",
      layers: ["Simmered Tomato", "Cream Swirl", "Brioche Crouton"],
      tip: 14
    },
    {
      id: "steak",
      name: "Express Steak Plate",
      short: "Steak Plate",
      layers: ["Seared Beef", "Sauteed Mushroom", "Herb Butter"],
      tip: 18
    }
  ];

  // Canvas Hitboxes (1280x720 coordinate space)
  const HITBOXES = {
    ingredients: [],
    skillet: { x: 374, y: 204, w: 248, h: 218 },
    saucepan: { x: 640, y: 204, w: 248, h: 218 },
    board: { x: 374, y: 440, w: 514, h: 254 },
    clearBoard: { x: 742, y: 452, w: 132, h: 32 },
    clearHand: { x: 214, y: 202, w: 112, h: 28 },
    pass: { x: 924, y: 204, w: 332, h: 218 },
    bell: { x: 924, y: 440, w: 160, h: 254 },
    brace: { x: 1096, y: 440, w: 160, h: 254 }
  };

  for (let i = 0; i < INGREDIENTS.length; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    HITBOXES.ingredients.push({
      id: INGREDIENTS[i].id,
      x: 34 + col * 100,
      y: 258 + row * 142,
      w: 92,
      h: 130
    });
  }

  class BistroGame {
    constructor() {
      this.canvas = document.getElementById("galley-canvas");
      this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
      this.audio = new window.BistroAudio();

      this.els = {
        timer: document.getElementById("hud-timer"),
        tips: document.getElementById("hud-tips"),
        served: document.getElementById("hud-served"),
        curve: document.getElementById("hud-curve"),
        curvePill: document.getElementById("hud-curve-pill"),
        btnMute: document.getElementById("btn-mute"),
        btnMotion: document.getElementById("btn-motion"),
        btnPause: document.getElementById("btn-pause"),
        overlayTitle: document.getElementById("overlay-title"),
        overlayPause: document.getElementById("overlay-pause"),
        overlaySummary: document.getElementById("overlay-summary"),
        overlayError: document.getElementById("overlay-error"),
        errorMessage: document.getElementById("error-message"),
        btnStart: document.getElementById("btn-start-shift"),
        btnResume: document.getElementById("btn-resume-shift"),
        btnRestartPause: document.getElementById("btn-restart-from-pause"),
        btnNextShift: document.getElementById("btn-next-shift"),
        sumServed: document.getElementById("sum-served"),
        sumTips: document.getElementById("sum-tips"),
        sumCurves: document.getElementById("sum-curves"),
        sumExpired: document.getElementById("sum-expired"),
        sumBurnt: document.getElementById("sum-burnt"),
        sumStreak: document.getElementById("sum-streak"),
        sumVerdict: document.getElementById("summary-verdict")
      };

      if (!this.canvas || !this.ctx) {
        this._showError("HTML5 2D Canvas could not be initialized in this browser.");
        return;
      }

      const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.reducedMotion = Boolean(prefersReduced);
      this.muted = false;
      this.state = "title"; // title | playing | paused | summary
      this.lastTime = 0;
      this.animFrame = null;
      this.sceneryOffset = 0;
      this.clackTimer = 0;
      this.toast = { text: "", tone: "info", timer: 0 };

      this.resetShiftState();
      this._bindEvents();
      this._syncMotionBtn();
      this._syncMuteBtn();
      this._render(0);
      this._loop = this._loop.bind(this);
      this.animFrame = requestAnimationFrame(this._loop);
    }

    resetShiftState() {
      this.timeLeft = SHIFT_DURATION;
      this.tips = 0;
      this.servedCount = 0;
      this.expiredCount = 0;
      this.burntCount = 0;
      this.curveBonuses = 0;
      this.streak = 0;
      this.bestStreak = 0;
      this.tableCounter = 1;

      this.hand = null; // ingredient object
      this.board = []; // array of layer names
      this.pass = []; // array of dish objects (max 2)

      this.stoves = {
        skillet: { item: null, progress: 0, state: "idle", cookTime: 3.0, burnTime: 7.2 },
        saucepan: { item: null, progress: 0, state: "idle", cookTime: 3.4, burnTime: 7.6 }
      };

      this.orders = [];
      this.orderSpawnTimer = 1.2;
      this.bellBounce = 0;
      this.particles = [];

      this.curve = {
        elapsed: 0,
        phase: "steady", // steady | warning | golden
        bracedThisCurve: false,
        swayAngle: 0
      };

      this._updateHud();
    }

    _showError(msg) {
      if (this.els.errorMessage) this.els.errorMessage.textContent = msg;
      if (this.els.overlayError) this.els.overlayError.hidden = false;
    }

    _bindEvents() {
      this.els.btnStart.addEventListener("click", () => this.startShift());
      this.els.btnResume.addEventListener("click", () => this.togglePause(false));
      this.els.btnRestartPause.addEventListener("click", () => this.startShift());
      this.els.btnNextShift.addEventListener("click", () => this.startShift());

      this.els.btnPause.addEventListener("click", () => {
        if (this.state === "playing") this.togglePause(true);
        else if (this.state === "paused") this.togglePause(false);
      });

      this.els.btnMute.addEventListener("click", () => {
        this.muted = !this.muted;
        this.audio.setMuted(this.muted);
        this._syncMuteBtn();
      });

      this.els.btnMotion.addEventListener("click", () => {
        this.reducedMotion = !this.reducedMotion;
        this._syncMotionBtn();
      });

      document.querySelectorAll(".station-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (this.state !== "playing") return;
          const action = btn.dataset.action;
          if (action === "ingredient") this.pickIngredient(btn.dataset.id);
          else if (action === "skillet") this.interactStove("skillet");
          else if (action === "saucepan") this.interactStove("saucepan");
          else if (action === "board") this.interactBoard();
          else if (action === "plate") this.plateToPass();
          else if (action === "bell") this.ringBellAndServe();
          else if (action === "brace") this.pullBrace();
          else if (action === "clear-board") this.clearBoard();
        });
      });

      this.canvas.addEventListener("click", (e) => {
        if (this.state !== "playing") return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        this._handleCanvasClick(x, y);
      });

      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (this.state === "playing") {
            e.preventDefault();
            this.togglePause(true);
          } else if (this.state === "paused") {
            e.preventDefault();
            this.togglePause(false);
          }
          return;
        }

        if (this.state !== "playing") return;
        const tag = document.activeElement && document.activeElement.tagName;
        if (tag === "BUTTON" && (e.key === "Enter" || e.key === " ")) {
          return; // Let native button handle Enter/Space when focused
        }

        const k = e.key.toLowerCase();
        if (k >= "1" && k <= "9") {
          const idx = Number(k) - 1;
          if (INGREDIENTS[idx]) this.pickIngredient(INGREDIENTS[idx].id);
        } else if (k === "q") {
          this.interactStove("skillet");
        } else if (k === "w") {
          this.interactStove("saucepan");
        } else if (k === "a") {
          this.interactBoard();
        } else if (k === "s") {
          this.plateToPass();
        } else if (k === "b") {
          this.pullBrace();
        } else if (k === "c") {
          this.clearHand();
        } else if (k === "x") {
          this.clearBoard();
        } else if (e.code === "Space") {
          e.preventDefault();
          this.ringBellAndServe();
        }
      });
    }

    _syncMuteBtn() {
      this.els.btnMute.textContent = this.muted ? "Sound: Off" : "Sound: On";
      this.els.btnMute.setAttribute("aria-pressed", String(this.muted));
    }

    _syncMotionBtn() {
      this.els.btnMotion.textContent = this.reducedMotion ? "Motion: Reduced" : "Motion: Full";
      this.els.btnMotion.setAttribute("aria-pressed", String(this.reducedMotion));
    }

    startShift() {
      this.audio.init();
      this.audio.resume();
      this.resetShiftState();
      this.state = "playing";
      this.els.overlayTitle.hidden = true;
      this.els.overlayPause.hidden = true;
      this.els.overlaySummary.hidden = true;
      this.els.btnPause.disabled = false;

      // Spawn two opening tickets so the order rail is immediately alive
      this._spawnOrder();
      this._spawnOrder();
      this._setToast("Dinner shift started. Check the Brass Order Rail.", "info");
      this._updateHud();
    }

    togglePause(pause) {
      if (pause && this.state === "playing") {
        this.state = "paused";
        this.els.overlayPause.hidden = false;
        this.els.btnResume.focus();
      } else if (!pause && this.state === "paused") {
        this.state = "playing";
        this.els.overlayPause.hidden = true;
        this.lastTime = performance.now();
      }
    }

    finishShift() {
      this.state = "summary";
      this.els.btnPause.disabled = true;
      this.els.overlaySummary.hidden = false;
      this.els.sumServed.textContent = String(this.servedCount);
      this.els.sumTips.textContent = "$" + String(this.tips);
      this.els.sumCurves.textContent = String(this.curveBonuses);
      this.els.sumExpired.textContent = String(this.expiredCount);
      this.els.sumBurnt.textContent = String(this.burntCount);
      this.els.sumStreak.textContent = String(this.bestStreak);

      let verdict = "Steady evening service in Car 04.";
      if (this.servedCount >= 8) verdict = "First-class dinner rush! Passengers praised the kitchen.";
      else if (this.servedCount === 0) verdict = "Quiet shift in the dining car. Prep faster next run.";
      this.els.sumVerdict.textContent = verdict;
      this.els.btnNextShift.focus();
    }

    _setToast(text, tone) {
      this.toast.text = text;
      this.toast.tone = tone || "info";
      this.toast.timer = 2.6;
    }

    _hit(box, x, y) {
      return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
    }

    _handleCanvasClick(x, y) {
      for (const box of HITBOXES.ingredients) {
        if (this._hit(box, x, y)) {
          this.pickIngredient(box.id);
          return;
        }
      }
      if (this._hit(HITBOXES.clearHand, x, y)) {
        this.clearHand();
      } else if (this._hit(HITBOXES.clearBoard, x, y)) {
        this.clearBoard();
      } else if (this._hit(HITBOXES.skillet, x, y)) {
        this.interactStove("skillet");
      } else if (this._hit(HITBOXES.saucepan, x, y)) {
        this.interactStove("saucepan");
      } else if (this._hit(HITBOXES.board, x, y)) {
        this.interactBoard();
      } else if (this._hit(HITBOXES.pass, x, y)) {
        this.plateToPass();
      } else if (this._hit(HITBOXES.bell, x, y)) {
        this.ringBellAndServe();
      } else if (this._hit(HITBOXES.brace, x, y)) {
        this.pullBrace();
      }
    }

    pickIngredient(id) {
      const ing = INGREDIENTS.find((item) => item.id === id);
      if (!ing) return;
      this.hand = ing;
      this.audio.playChop();
      this._setToast("Picked up " + ing.name + ". Send to " + ing.station + ".", "info");
    }

    clearHand() {
      this.hand = null;
      this._setToast("Hand cleared.", "info");
    }

    clearBoard() {
      if (this.board.length === 0) return;
      this.board = [];
      this.audio.playChop();
      this._setToast("Porcelain board cleared.", "info");
    }

    interactStove(stoveKey) {
      const stove = this.stoves[stoveKey];
      const label = stoveKey === "skillet" ? "Skillet" : "Saucepan";

      if (stove.state === "burnt") {
        stove.item = null;
        stove.progress = 0;
        stove.state = "idle";
        this.audio.playError();
        this._setToast("Discarded burnt item from " + label + ".", "warn");
        return;
      }

      if (stove.state === "golden") {
        if (this.board.length >= 3) {
          this.audio.playError();
          this._setToast("Board is full (3 layers). Plate to Pass (S) or Clear (X).", "warn");
          return;
        }
        this.board.push(stove.item.cookedName);
        this.audio.playChop();
        this._setToast("Plated " + stove.item.cookedName + " onto Assembly Board.", "ok");
        stove.item = null;
        stove.progress = 0;
        stove.state = "idle";
        return;
      }

      if (stove.state === "cooking") {
        this._setToast(label + " is still cooking (" + stove.item.name + "). Wait for Golden!", "info");
        return;
      }

      // Stove is idle -> place held ingredient
      if (!this.hand) {
        this._setToast("Pick an ingredient (1-9) first to cook on " + label + ".", "info");
        return;
      }

      if (this.hand.cookOn !== stoveKey) {
        this.audio.playError();
        this._setToast(this.hand.name + " uses " + this.hand.station + ", not " + label + ".", "warn");
        return;
      }

      stove.item = this.hand;
      stove.progress = 0;
      stove.state = "cooking";
      this.hand = null;
      if (stoveKey === "skillet") this.audio.playSizzle();
      else this.audio.playBoil();
      this._setToast("Cooking " + stove.item.name + " in " + label + ".", "info");
    }

    interactBoard() {
      if (this.hand && this.hand.directName) {
        if (this.board.length >= 3) {
          this.audio.playError();
          this._setToast("Assembly Board has 3 layers. Press S to move to Pass.", "warn");
          return;
        }
        this.board.push(this.hand.directName);
        this.audio.playChop();
        this._setToast("Added " + this.hand.directName + " to Assembly Board.", "ok");
        this.hand = null;
        return;
      }

      if (this.hand && !this.hand.directName) {
        this.audio.playError();
        this._setToast(this.hand.name + " must be cooked on " + this.hand.station + " first.", "warn");
        return;
      }

      // If hand is empty and board has a completed dish, clicking board can plate it!
      const match = this._findMatchingDish(this.board);
      if (match) {
        this.plateToPass();
      } else {
        this._setToast("Add cooked or fresh layers to build a dish.", "info");
      }
    }

    _findMatchingDish(layers) {
      if (layers.length !== 3) return null;
      const sorted = [...layers].sort().join("|");
      return DISHES.find((d) => [...d.layers].sort().join("|") === sorted) || null;
    }

    plateToPass() {
      if (this.pass.length >= 2) {
        this.audio.playError();
        this._setToast("Brass Service Pass is full. Ring Bell (Space) to serve!", "warn");
        return;
      }
      const dish = this._findMatchingDish(this.board);
      if (!dish) {
        this.audio.playError();
        this._setToast("Board layers do not match a complete 3-layer menu dish yet.", "warn");
        return;
      }
      this.pass.push(dish);
      this.board = [];
      this.audio.playChop();
      this._setToast(dish.name + " plated on Service Pass! Ring Bell (Space) to serve.", "ok");
    }

    ringBellAndServe() {
      this.bellBounce = 1.0;
      this.audio.playBell();

      if (this.pass.length === 0) {
        this._setToast("Service Pass is empty. Plate a finished dish (S) first.", "info");
        return;
      }

      // Find best matching order (lowest patience first)
      let bestOrderIdx = -1;
      let bestPassIdx = -1;
      let lowestPatience = Infinity;

      for (let p = 0; p < this.pass.length; p++) {
        const plated = this.pass[p];
        for (let o = 0; o < this.orders.length; o++) {
          const order = this.orders[o];
          if (order.dish.id === plated.id && order.patience < lowestPatience) {
            lowestPatience = order.patience;
            bestOrderIdx = o;
            bestPassIdx = p;
          }
        }
      }

      if (bestOrderIdx === -1) {
        this._setToast("No active ticket matches the plated dish on the Pass.", "warn");
        return;
      }

      const servedOrder = this.orders.splice(bestOrderIdx, 1)[0];
      this.pass.splice(bestPassIdx, 1);
      this.servedCount += 1;
      this.streak += 1;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;

      let tipEarned = servedOrder.dish.tip;
      if (servedOrder.patience > 0.55) tipEarned += 3;

      let curveMsg = "";
      if (this.curve.phase === "golden" && !this.curve.bracedThisCurve) {
        this.curve.bracedThisCurve = true;
        this.curveBonuses += 1;
        tipEarned += 6;
        this._boostAllPatience(0.15);
        curveMsg = " + $6 Steady Service Curve Bonus!";
      }

      this.tips += tipEarned;
      this._setToast("Served " + servedOrder.dish.name + " to Table " + servedOrder.table + " (+$" + tipEarned + ")" + curveMsg, "ok");
      this._updateHud();
    }

    pullBrace() {
      if (this.curve.phase === "golden") {
        if (this.curve.bracedThisCurve) {
          this._setToast("Already braced for this bend.", "info");
          return;
        }
        this.curve.bracedThisCurve = true;
        this.curveBonuses += 1;
        this.tips += 6;
        this._boostAllPatience(0.15);
        this.audio.playBrace();
        this._setToast("Steady Service! +$6 tip bonus & customer patience boosted.", "ok");
        this._updateHud();
      } else if (this.curve.phase === "warning") {
        this._setToast("Hold! Pull Brace (B) when the Golden Window lights up.", "info");
      } else {
        this.audio.playBrace();
        this._setToast("Track is straight. Watch for the 25s curve warning.", "info");
      }
    }

    _boostAllPatience(amount) {
      for (const order of this.orders) {
        order.patience = Math.min(1, order.patience + amount);
      }
    }

    _spawnOrder() {
      if (this.orders.length >= 4) return;
      const dish = DISHES[Math.floor(Math.random() * DISHES.length)];
      const tableNum = String(((this.tableCounter - 1) % 12) + 1).padStart(2, "0");
      this.tableCounter += 1;
      this.orders.push({
        id: this.tableCounter,
        table: tableNum,
        dish,
        patience: 1.0,
        maxDuration: 46 + Math.random() * 10
      });
      this.audio.playTicketClip();
    }

    _loop(timestamp) {
      if (!this.lastTime) this.lastTime = timestamp;
      const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
      this.lastTime = timestamp;

      if (this.state === "playing") {
        this._update(dt);
      }
      this._render(dt);
      this.animFrame = requestAnimationFrame(this._loop);
    }

    _update(dt) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft <= 0) {
        this._updateHud();
        this.finishShift();
        return;
      }

      if (!this.reducedMotion) {
        this.sceneryOffset = (this.sceneryOffset + dt * 150) % 1280;
      }

      this.clackTimer += dt;
      if (this.clackTimer >= 1.65) {
        this.clackTimer = 0;
        this.audio.playTrainClack();
      }

      if (this.toast.timer > 0) {
        this.toast.timer = Math.max(0, this.toast.timer - dt);
      }

      if (this.bellBounce > 0) {
        this.bellBounce = Math.max(0, this.bellBounce - dt * 3.5);
      }

      // Curve rhythm every 25s
      this.curve.elapsed += dt;
      const cyclePos = this.curve.elapsed % CURVE_INTERVAL;
      const warnStart = CURVE_INTERVAL - (CURVE_WARN_DUR + CURVE_GOLDEN_DUR);
      const goldenStart = CURVE_INTERVAL - CURVE_GOLDEN_DUR;

      const prevPhase = this.curve.phase;
      if (cyclePos >= goldenStart) {
        this.curve.phase = "golden";
        this.curve.swayAngle = this.reducedMotion ? 0 : Math.sin(this.curve.elapsed * 9) * 0.012;
      } else if (cyclePos >= warnStart) {
        this.curve.phase = "warning";
        this.curve.swayAngle = 0;
        if (prevPhase === "steady") {
          this.curve.bracedThisCurve = false;
          this.audio.playWhistle();
        }
      } else {
        this.curve.phase = "steady";
        this.curve.bracedThisCurve = false;
        this.curve.swayAngle = 0;
      }

      // Update stoves
      ["skillet", "saucepan"].forEach((key) => {
        const stove = this.stoves[key];
        if (stove.state === "cooking" || stove.state === "golden") {
          stove.progress += dt;
          if (stove.progress >= stove.burnTime) {
            if (stove.state !== "burnt") {
              stove.state = "burnt";
              this.burntCount += 1;
              this.audio.playError();
              this._setToast((key === "skillet" ? "Skillet" : "Saucepan") + " burnt! Click it to clear.", "warn");
            }
          } else if (stove.progress >= stove.cookTime && stove.state === "cooking") {
            stove.state = "golden";
            this.audio.playChop();
          }

          if (!this.reducedMotion && Math.random() < dt * 8) {
            const box = HITBOXES[key];
            this.particles.push({
              x: box.x + 85 + Math.random() * 80,
              y: box.y + 85,
              vy: -24 - Math.random() * 18,
              life: 0.9,
              maxLife: 0.9
            });
          }
        }
      });

      this.particles = this.particles.filter((p) => {
        p.y += p.vy * dt;
        p.life -= dt;
        return p.life > 0;
      });

      // Orders
      this.orderSpawnTimer -= dt;
      if (this.orderSpawnTimer <= 0) {
        this._spawnOrder();
        this.orderSpawnTimer = 8.5;
      }

      for (let i = this.orders.length - 1; i >= 0; i--) {
        const o = this.orders[i];
        o.patience -= dt / o.maxDuration;
        if (o.patience <= 0) {
          this.orders.splice(i, 1);
          this.expiredCount += 1;
          this.streak = 0;
          this.audio.playError();
          this._setToast("Table " + o.table + " order expired!", "warn");
        }
      }

      this._updateHud();
    }

    _updateHud() {
      const mins = Math.floor(this.timeLeft / 60);
      const secs = Math.floor(this.timeLeft % 60);
      this.els.timer.textContent = String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
      this.els.tips.textContent = "$" + String(this.tips);
      this.els.served.textContent = String(this.servedCount);

      this.els.curvePill.classList.remove("curve-warning", "curve-golden");
      if (this.curve.phase === "golden") {
        this.els.curve.textContent = this.curve.bracedThisCurve ? "Braced!" : "BRACE (B)!";
        this.els.curvePill.classList.add("curve-golden");
      } else if (this.curve.phase === "warning") {
        this.els.curve.textContent = "Curve Ahead";
        this.els.curvePill.classList.add("curve-warning");
      } else {
        this.els.curve.textContent = "Steady";
      }
    }

    _render() {
      const ctx = this.ctx;
      ctx.save();
      if (this.curve.swayAngle !== 0) {
        ctx.translate(640, 360);
        ctx.rotate(this.curve.swayAngle);
        ctx.translate(-640, -360);
      }

      this._drawCarriageBackground(ctx);
      this._drawOrderRail(ctx);
      this._drawPantryCounter(ctx);
      this._drawStoves(ctx);
      this._drawAssemblyBoard(ctx);
      this._drawServicePass(ctx);
      this._drawBellAndBrace(ctx);
      this._drawToast(ctx);

      ctx.restore();
    }

    _drawRoundedRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    _drawCarriageBackground(ctx) {
      // Pullman bottle green carriage wall
      ctx.fillStyle = COLORS.pullman;
      ctx.fillRect(0, 0, 1280, 720);

      // Mahogany wainscot & trim
      ctx.fillStyle = COLORS.mahogany;
      ctx.fillRect(0, 178, 1280, 542);
      ctx.fillStyle = COLORS.pullmanDark;
      ctx.fillRect(16, 186, 1248, 520);

      // Moving train windows across upper carriage wall
      const windows = [
        { x: 360, y: 18, w: 420, h: 146 },
        { x: 820, y: 18, w: 420, h: 146 }
      ];
      windows.forEach((win) => {
        ctx.save();
        this._drawRoundedRect(ctx, win.x, win.y, win.w, win.h, 10);
        ctx.clip();

        // Twilight sky
        const sky = ctx.createLinearGradient(0, win.y, 0, win.y + win.h);
        sky.addColorStop(0, "#102136");
        sky.addColorStop(0.6, "#2A4763");
        sky.addColorStop(1, "#6A564E");
        ctx.fillStyle = sky;
        ctx.fillRect(win.x, win.y, win.w, win.h);

        // Crescent moon
        ctx.fillStyle = "#F7E7B7";
        ctx.beginPath();
        ctx.arc(win.x + 80, win.y + 38, 13, 0, Math.PI * 2);
        ctx.fill();

        // Rolling hills
        ctx.fillStyle = "#1B3328";
        ctx.beginPath();
        ctx.moveTo(win.x, win.y + win.h);
        for (let sx = -40; sx <= win.w + 40; sx += 40) {
          const worldX = sx + this.sceneryOffset * 0.35;
          const hy = win.y + 92 + Math.sin(worldX * 0.012) * 14;
          ctx.lineTo(win.x + sx, hy);
        }
        ctx.lineTo(win.x + win.w, win.y + win.h);
        ctx.closePath();
        ctx.fill();

        // Scrolling cypress trees & telegraph poles
        for (let k = -1; k < 6; k++) {
          const px = win.x + ((k * 110 - (this.sceneryOffset % 110) + 110) % (win.w + 110)) - 20;
          ctx.fillStyle = "#0F1E18";
          ctx.beginPath();
          ctx.moveTo(px, win.y + 82);
          ctx.lineTo(px - 11, win.y + win.h);
          ctx.lineTo(px + 11, win.y + win.h);
          ctx.closePath();
          ctx.fill();

          // Distant warm farmhouse light
          if (k % 2 === 0) {
            ctx.fillStyle = "#F5C463";
            ctx.fillRect(px + 26, win.y + 114, 5, 4);
          }
        }

        ctx.restore();

        // Mahogany window frame & brass clasp
        ctx.strokeStyle = COLORS.mahogany;
        ctx.lineWidth = 7;
        this._drawRoundedRect(ctx, win.x, win.y, win.w, win.h, 10);
        ctx.stroke();

        ctx.strokeStyle = COLORS.brass;
        ctx.lineWidth = 2;
        this._drawRoundedRect(ctx, win.x + 4, win.y + 4, win.w - 8, win.h - 8, 7);
        ctx.stroke();
      });
    }

    _drawOrderRail(ctx) {
      // Brass Order Rail bar
      ctx.fillStyle = COLORS.brass;
      ctx.fillRect(24, 14, 1232, 10);
      ctx.fillStyle = COLORS.brassDeep;
      ctx.fillRect(24, 22, 1232, 3);

      // Left header plate on rail
      this._drawRoundedRect(ctx, 24, 30, 316, 134, 10);
      ctx.fillStyle = COLORS.pullmanDark;
      ctx.fill();
      ctx.strokeStyle = COLORS.brass;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = COLORS.brassBright;
      ctx.font = "700 13px Georgia, serif";
      ctx.fillText("BRASS ORDER RAIL", 40, 56);
      ctx.fillStyle = COLORS.porcelain;
      ctx.font = "600 13px 'Segoe UI', sans-serif";
      ctx.fillText("Up to 4 active table tickets.", 40, 82);
      ctx.fillText("Assemble 3 layers on Board (A),", 40, 104);
      ctx.fillText("plate to Pass (S), ring Bell (Space).", 40, 126);
      ctx.fillStyle = COLORS.brassBright;
      ctx.fillText("Active Tickets: " + this.orders.length + " / 4", 40, 150);

      // Draw up to 4 tickets
      for (let i = 0; i < 4; i++) {
        const tx = 356 + i * 226;
        const ty = 26;
        const tw = 214;
        const th = 144;
        const order = this.orders[i];

        if (!order) {
          ctx.save();
          ctx.setLineDash([6, 5]);
          ctx.strokeStyle = "rgba(212, 160, 57, 0.45)";
          ctx.lineWidth = 2;
          this._drawRoundedRect(ctx, tx, ty, tw, th, 6);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = "rgba(246, 239, 226, 0.55)";
          ctx.font = "600 12px 'Segoe UI', sans-serif";
          ctx.fillText("Open Ticket Clip", tx + 54, ty + 76);
          continue;
        }

        // Perforated paper ticket
        ctx.fillStyle = COLORS.porcelain;
        this._drawRoundedRect(ctx, tx, ty, tw, th, 6);
        ctx.fill();
        ctx.strokeStyle = COLORS.brassDeep;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Brass clip at top
        ctx.fillStyle = COLORS.brass;
        ctx.fillRect(tx + 86, ty - 5, 42, 10);

        // Table + Tip
        ctx.fillStyle = COLORS.mahogany;
        ctx.font = "700 12px 'Segoe UI', sans-serif";
        ctx.fillText("TABLE " + order.table, tx + 12, ty + 22);
        ctx.fillStyle = COLORS.ok;
        ctx.fillText("$" + order.dish.tip, tx + tw - 38, ty + 22);

        // Dish Name
        ctx.fillStyle = COLORS.ink;
        ctx.font = "700 14px Georgia, serif";
        ctx.fillText(order.dish.short, tx + 12, ty + 43);

        // Layers checklist
        ctx.font = "600 12px 'Segoe UI', sans-serif";
        order.dish.layers.forEach((layer, idx) => {
          const has = this.board.includes(layer);
          ctx.fillStyle = has ? COLORS.ok : COLORS.inkMuted;
          ctx.fillText((has ? "[OK] " : "- ") + layer, tx + 12, ty + 66 + idx * 18);
        });

        // Patience bar
        const pct = Math.max(0, Math.min(1, order.patience));
        ctx.fillStyle = "#D7CCB8";
        ctx.fillRect(tx + 12, ty + 124, tw - 24, 10);
        ctx.fillStyle = pct > 0.5 ? COLORS.ok : pct > 0.25 ? COLORS.warn : COLORS.danger;
        ctx.fillRect(tx + 12, ty + 124, (tw - 24) * pct, 10);
      }
    }

    _drawPantryCounter(ctx) {
      // Marble counter panel
      this._drawRoundedRect(ctx, 24, 194, 316, 508, 10);
      ctx.fillStyle = COLORS.porcelain;
      ctx.fill();
      ctx.strokeStyle = COLORS.brass;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Subtle marble veins
      ctx.strokeStyle = "rgba(180, 168, 150, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(40, 238);
      ctx.bezierCurveTo(120, 250, 200, 224, 320, 244);
      ctx.stroke();

      ctx.fillStyle = COLORS.pullman;
      ctx.font = "700 15px Georgia, serif";
      ctx.fillText("MARBLE PANTRY", 36, 220);

      // Held item badge
      ctx.fillStyle = this.hand ? COLORS.ok : COLORS.inkMuted;
      ctx.font = "700 12px 'Segoe UI', sans-serif";
      ctx.fillText("Hand: " + (this.hand ? this.hand.name : "Empty"), 36, 242);

      // Clear Hand button
      const ch = HITBOXES.clearHand;
      this._drawRoundedRect(ctx, ch.x, ch.y, ch.w, ch.h, 5);
      ctx.fillStyle = COLORS.porcelainSoft;
      ctx.fill();
      ctx.strokeStyle = COLORS.mahogany;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = COLORS.ink;
      ctx.font = "700 11px 'Segoe UI', sans-serif";
      ctx.fillText("Clear Hand (C)", ch.x + 12, ch.y + 18);

      // 9 ingredient cards
      HITBOXES.ingredients.forEach((box, idx) => {
        const ing = INGREDIENTS[idx];
        const selected = this.hand && this.hand.id === ing.id;

        this._drawRoundedRect(ctx, box.x, box.y, box.w, box.h, 8);
        ctx.fillStyle = selected ? "#FFF2CC" : "#FFFDF8";
        ctx.fill();
        ctx.strokeStyle = selected ? COLORS.brass : "#B9A88E";
        ctx.lineWidth = selected ? 3 : 1.5;
        ctx.stroke();

        // Key badge
        this._drawRoundedRect(ctx, box.x + 6, box.y + 6, 22, 20, 4);
        ctx.fillStyle = COLORS.pullman;
        ctx.fill();
        ctx.fillStyle = COLORS.porcelain;
        ctx.font = "700 12px 'Segoe UI', sans-serif";
        ctx.fillText(ing.key, box.x + 13, box.y + 20);

        // Station hint
        ctx.fillStyle = COLORS.mahogany;
        ctx.font = "700 11px 'Segoe UI', sans-serif";
        ctx.fillText(ing.station, box.x + 48, box.y + 20);

        // Procedural ingredient illustration
        this._drawIngredientIcon(ctx, ing.id, box.x + box.w / 2, box.y + 66);

        // Ingredient name
        ctx.fillStyle = COLORS.ink;
        ctx.font = "700 12px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(ing.name, box.x + box.w / 2, box.y + 114);
        ctx.textAlign = "left";
      });
    }

    _drawIngredientIcon(ctx, id, cx, cy) {
      ctx.save();
      if (id === "brioche") {
        ctx.fillStyle = "#D89A4B";
        this._drawRoundedRect(ctx, cx - 22, cy - 14, 44, 28, 6);
        ctx.fill();
        ctx.fillStyle = "#F4D19B";
        this._drawRoundedRect(ctx, cx - 17, cy - 9, 34, 18, 4);
        ctx.fill();
      } else if (id === "ham") {
        ctx.fillStyle = "#C96A6D";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 22, 14, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#F3D3CF";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (id === "egg") {
        ctx.fillStyle = "#FFF9EC";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18, 22, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#CBBBA0";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#E59F22";
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (id === "mushroom") {
        ctx.fillStyle = "#8C654B";
        ctx.beginPath();
        ctx.arc(cx, cy - 4, 20, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#DFCBB5";
        ctx.fillRect(cx - 7, cy - 4, 14, 18);
      } else if (id === "tomato") {
        ctx.fillStyle = "#B93228";
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2E6D3B";
        ctx.fillRect(cx - 6, cy - 18, 12, 6);
      } else if (id === "beef") {
        ctx.fillStyle = "#7D2C2B";
        this._drawRoundedRect(ctx, cx - 22, cy - 13, 44, 26, 8);
        ctx.fill();
        ctx.strokeStyle = "#E8C6BE";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 6);
        ctx.lineTo(cx + 12, cy + 6);
        ctx.stroke();
      } else if (id === "cheese") {
        ctx.fillStyle = "#E8B93A";
        ctx.beginPath();
        ctx.moveTo(cx - 22, cy + 12);
        ctx.lineTo(cx + 22, cy + 12);
        ctx.lineTo(cx + 14, cy - 14);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#C9931E";
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 3, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (id === "cream") {
        ctx.fillStyle = "#EFE6D5";
        this._drawRoundedRect(ctx, cx - 14, cy - 16, 28, 32, 6);
        ctx.fill();
        ctx.strokeStyle = "#8F7C64";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#4A281A";
        ctx.fillRect(cx - 14, cy - 4, 28, 6);
      } else if (id === "butter") {
        ctx.fillStyle = "#F0CA5E";
        this._drawRoundedRect(ctx, cx - 20, cy - 10, 40, 20, 4);
        ctx.fill();
        ctx.fillStyle = "#2D6D3E";
        ctx.beginPath();
        ctx.arc(cx - 4, cy, 3, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy - 2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    _drawStoves(ctx) {
      this._drawSingleStove(ctx, "skillet", HITBOXES.skillet, "CAST-IRON SKILLET (Q)");
      this._drawSingleStove(ctx, "saucepan", HITBOXES.saucepan, "BRASS SAUCEPAN (W)");

      // Steam particles
      ctx.save();
      this.particles.forEach((p) => {
        ctx.fillStyle = "rgba(246, 239, 226, " + (p.life / p.maxLife) * 0.55 + ")";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    _drawSingleStove(ctx, key, box, title) {
      const stove = this.stoves[key];
      this._drawRoundedRect(ctx, box.x, box.y, box.w, box.h, 10);
      ctx.fillStyle = "#232524";
      ctx.fill();
      ctx.strokeStyle = stove.state === "golden" ? COLORS.brassBright : COLORS.brassDeep;
      ctx.lineWidth = stove.state === "golden" ? 3 : 2;
      ctx.stroke();

      ctx.fillStyle = COLORS.porcelain;
      ctx.font = "700 13px Georgia, serif";
      ctx.fillText(title, box.x + 14, box.y + 24);

      // Burner ring
      const cx = box.x + box.w / 2;
      const cy = box.y + 108;
      ctx.beginPath();
      ctx.arc(cx, cy, 56, 0, Math.PI * 2);
      ctx.fillStyle = key === "skillet" ? "#151615" : "#443627";
      ctx.fill();
      ctx.strokeStyle = stove.state !== "idle" ? "#E06B2E" : "#555A58";
      ctx.lineWidth = 4;
      ctx.stroke();

      if (stove.item) {
        this._drawIngredientIcon(ctx, stove.item.id, cx, cy);
      } else {
        ctx.fillStyle = "#A8A298";
        ctx.font = "600 12px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Empty Burner", cx, cy + 4);
        ctx.textAlign = "left";
      }

      // Heat Gauge: Raw -> Golden -> Burnt
      const gx = box.x + 18;
      const gy = box.y + 180;
      const gw = box.w - 36;
      ctx.fillStyle = "#3B3D3C";
      ctx.fillRect(gx, gy, gw, 12);

      const goldenRatio = stove.cookTime / stove.burnTime;
      // Golden target zone marker
      ctx.fillStyle = "rgba(212, 160, 57, 0.35)";
      ctx.fillRect(gx + gw * goldenRatio, gy - 2, gw * (1 - goldenRatio), 16);

      if (stove.state !== "idle") {
        const fillRatio = Math.min(1, stove.progress / stove.burnTime);
        ctx.fillStyle =
          stove.state === "burnt"
            ? COLORS.danger
            : stove.state === "golden"
            ? COLORS.ok
            : COLORS.brass;
        ctx.fillRect(gx, gy, gw * fillRatio, 12);
      }

      ctx.font = "700 11px 'Segoe UI', sans-serif";
      ctx.fillStyle =
        stove.state === "burnt"
          ? "#F49A9A"
          : stove.state === "golden"
          ? "#8CE0AE"
          : COLORS.porcelain;
      const statusText =
        stove.state === "idle"
          ? "Ready"
          : stove.state === "cooking"
          ? "Cooking (" + stove.item.name + ")..."
          : stove.state === "golden"
          ? "GOLDEN! Press " + (key === "skillet" ? "Q" : "W") + " to Board"
          : "BURNT! Press " + (key === "skillet" ? "Q" : "W") + " to Clear";
      ctx.fillText(statusText, gx, gy + 28);
    }

    _drawAssemblyBoard(ctx) {
      const b = HITBOXES.board;
      this._drawRoundedRect(ctx, b.x, b.y, b.w, b.h, 10);
      ctx.fillStyle = COLORS.porcelain;
      ctx.fill();
      ctx.strokeStyle = COLORS.brass;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = COLORS.pullman;
      ctx.font = "700 15px Georgia, serif";
      ctx.fillText("PORCELAIN ASSEMBLY BOARD (A)", b.x + 16, b.y + 28);

      // Clear Board button
      const cb = HITBOXES.clearBoard;
      this._drawRoundedRect(ctx, cb.x, cb.y, cb.w, cb.h, 6);
      ctx.fillStyle = COLORS.porcelainSoft;
      ctx.fill();
      ctx.strokeStyle = COLORS.mahogany;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = COLORS.ink;
      ctx.font = "700 12px 'Segoe UI', sans-serif";
      ctx.fillText("Clear Board (X)", cb.x + 14, cb.y + 20);

      // Center porcelain plate showing layered dish mid-assembly
      const px = b.x + 145;
      const py = b.y + 150;
      ctx.fillStyle = "#FFFDF9";
      ctx.beginPath();
      ctx.ellipse(px, py, 96, 62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.brass;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(px, py, 74, 46, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#DDD1BC";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw each assembled layer stacked visually on the plate
      this.board.forEach((layerName, idx) => {
        const ly = py + 12 - idx * 14;
        this._drawLayerVisual(ctx, layerName, px, ly);
      });

      if (this.board.length === 0) {
        ctx.fillStyle = COLORS.inkMuted;
        ctx.font = "600 12px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Board Empty", px, py + 4);
        ctx.textAlign = "left";
      }

      // Layer list on right side of assembly board
      const lx = b.x + 266;
      ctx.fillStyle = COLORS.ink;
      ctx.font = "700 13px 'Segoe UI', sans-serif";
      ctx.fillText("Current Layers (" + this.board.length + "/3):", lx, b.y + 84);

      for (let i = 0; i < 3; i++) {
        const layer = this.board[i];
        this._drawRoundedRect(ctx, lx, b.y + 98 + i * 32, 224, 26, 5);
        ctx.fillStyle = layer ? "#E2F2E8" : COLORS.porcelainSoft;
        ctx.fill();
        ctx.strokeStyle = layer ? COLORS.ok : "#C6B79E";
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = COLORS.ink;
        ctx.font = "600 12px 'Segoe UI', sans-serif";
        ctx.fillText((i + 1) + ". " + (layer || "Waiting..."), lx + 10, b.y + 115 + i * 32);
      }

      const match = this._findMatchingDish(this.board);
      ctx.font = "700 13px 'Segoe UI', sans-serif";
      ctx.fillStyle = match ? COLORS.ok : COLORS.mahogany;
      ctx.fillText(
        match ? "Complete: " + match.short + " -> Press S to Plate!" : "Add layers to match an active order.",
        lx,
        b.y + 218
      );
    }

    _drawLayerVisual(ctx, layerName, cx, cy) {
      ctx.save();
      if (layerName === "Toasted Brioche" || layerName === "Brioche Crouton") {
        ctx.fillStyle = "#C9853B";
        this._drawRoundedRect(ctx, cx - 34, cy - 10, 68, 20, 5);
        ctx.fill();
      } else if (layerName === "Melted Cheese") {
        ctx.fillStyle = "#ECC144";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 36, 12, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layerName === "Seared Ham") {
        ctx.fillStyle = "#C76367";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 30, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layerName === "Beaten Egg") {
        ctx.fillStyle = "#F5CB54";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 38, 15, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layerName === "Sauteed Mushroom") {
        ctx.fillStyle = "#7D563B";
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.arc(cx + k * 16, cy, 8, Math.PI, 0);
          ctx.fill();
        }
      } else if (layerName === "Simmered Tomato") {
        ctx.fillStyle = "#BA3528";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 40, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layerName === "Cream Swirl") {
        ctx.strokeStyle = "#FFF9EF";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 1.7);
        ctx.stroke();
      } else if (layerName === "Seared Beef") {
        ctx.fillStyle = "#6B2523";
        this._drawRoundedRect(ctx, cx - 34, cy - 11, 68, 22, 7);
        ctx.fill();
      } else if (layerName === "Herb Butter") {
        ctx.fillStyle = "#F3CE63";
        this._drawRoundedRect(ctx, cx - 14, cy - 7, 28, 14, 4);
        ctx.fill();
        ctx.fillStyle = "#245C36";
        ctx.fillRect(cx - 4, cy - 2, 4, 4);
      }
      ctx.restore();
    }

    _drawServicePass(ctx) {
      const p = HITBOXES.pass;
      this._drawRoundedRect(ctx, p.x, p.y, p.w, p.h, 10);
      ctx.fillStyle = COLORS.pullman;
      ctx.fill();
      ctx.strokeStyle = COLORS.brass;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = COLORS.brassBright;
      ctx.font = "700 15px Georgia, serif";
      ctx.fillText("BRASS SERVICE PASS (S)", p.x + 16, p.y + 28);

      if (this.pass.length === 0) {
        // Explicit Empty / Idle Pass State
        this._drawRoundedRect(ctx, p.x + 16, p.y + 48, p.w - 32, 150, 8);
        ctx.fillStyle = "rgba(246, 239, 226, 0.08)";
        ctx.fill();
        ctx.strokeStyle = "rgba(212, 160, 57, 0.5)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = COLORS.porcelain;
        ctx.font = "700 14px 'Segoe UI', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Pass Clear", p.x + p.w / 2, p.y + 114);
        ctx.font = "600 12px 'Segoe UI', sans-serif";
        ctx.fillStyle = COLORS.porcelainSoft;
        ctx.fillText("Plate a finished dish (S) to serve.", p.x + p.w / 2, p.y + 138);
        ctx.textAlign = "left";
        return;
      }

      this.pass.forEach((dish, idx) => {
        const sx = p.x + 18 + idx * 154;
        const sy = p.y + 50;
        this._drawRoundedRect(ctx, sx, sy, 142, 148, 8);
        ctx.fillStyle = COLORS.porcelain;
        ctx.fill();
        ctx.strokeStyle = COLORS.brass;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Plated dish illustration
        ctx.fillStyle = "#FFFDF9";
        ctx.beginPath();
        ctx.arc(sx + 71, sy + 64, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.brass;
        ctx.lineWidth = 2;
        ctx.stroke();

        dish.layers.forEach((layer, lIdx) => {
          this._drawLayerVisual(ctx, layer, sx + 71, sy + 72 - lIdx * 10);
        });

        ctx.fillStyle = COLORS.ink;
        ctx.font = "700 13px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText(dish.short, sx + 71, sy + 126);
        ctx.fillStyle = COLORS.ok;
        ctx.font = "700 11px 'Segoe UI', sans-serif";
        ctx.fillText("Ready (Space)", sx + 71, sy + 141);
        ctx.textAlign = "left";
      });
    }

    _drawBellAndBrace(ctx) {
      // Brass Service Bell (Space)
      const bell = HITBOXES.bell;
      this._drawRoundedRect(ctx, bell.x, bell.y, bell.w, bell.h, 10);
      ctx.fillStyle = COLORS.mahogany;
      ctx.fill();
      ctx.strokeStyle = COLORS.brass;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = COLORS.porcelain;
      ctx.font = "700 13px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("SERVICE BELL", bell.x + bell.w / 2, bell.y + 28);

      const bounceY = Math.sin(this.bellBounce * Math.PI) * 5;
      const bx = bell.x + bell.w / 2;
      const by = bell.y + 132 + bounceY;

      // Bell base
      ctx.fillStyle = COLORS.mahoganyDeep;
      this._drawRoundedRect(ctx, bx - 44, by + 18, 88, 16, 4);
      ctx.fill();
      // Bell dome
      ctx.fillStyle = COLORS.brass;
      ctx.beginPath();
      ctx.arc(bx, by + 18, 36, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = COLORS.brassBright;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Bell button
      ctx.fillStyle = COLORS.brassBright;
      ctx.fillRect(bx - 6, by - 24, 12, 8);

      ctx.fillStyle = COLORS.porcelain;
      ctx.font = "700 12px 'Segoe UI', sans-serif";
      ctx.fillText("Serve Match", bx, bell.y + 206);
      ctx.fillStyle = COLORS.brassBright;
      ctx.fillText("[ Space ]", bx, bell.y + 226);

      // Curve Brace Lever (B)
      const br = HITBOXES.brace;
      this._drawRoundedRect(ctx, br.x, br.y, br.w, br.h, 10);
      ctx.fillStyle =
        this.curve.phase === "golden"
          ? "#1E563B"
          : this.curve.phase === "warning"
          ? "#5E3A14"
          : COLORS.pullmanDark;
      ctx.fill();
      ctx.strokeStyle = this.curve.phase === "golden" ? "#8CE0AE" : COLORS.brass;
      ctx.lineWidth = this.curve.phase === "golden" ? 3 : 2;
      ctx.stroke();

      const rx = br.x + br.w / 2;
      ctx.fillStyle = COLORS.porcelain;
      ctx.font = "700 13px Georgia, serif";
      ctx.fillText("CURVE BRACE", rx, br.y + 28);

      // Lever track & handle
      ctx.fillStyle = "#111814";
      this._drawRoundedRect(ctx, rx - 10, br.y + 62, 20, 96, 10);
      ctx.fill();
      const handleY = this.curve.bracedThisCurve ? br.y + 132 : br.y + 78;
      ctx.fillStyle = this.curve.phase === "golden" ? COLORS.brassBright : COLORS.brass;
      ctx.beginPath();
      ctx.arc(rx, handleY, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.porcelain;
      ctx.font = "700 12px 'Segoe UI', sans-serif";
      const curveLabel =
        this.curve.phase === "golden"
          ? this.curve.bracedThisCurve
            ? "Braced (+$6)"
            : "PULL NOW!"
          : this.curve.phase === "warning"
          ? "Bend Ahead!"
          : "Track Steady";
      ctx.fillText(curveLabel, rx, br.y + 206);
      ctx.fillStyle = COLORS.brassBright;
      ctx.fillText("[ B ]", rx, br.y + 226);
      ctx.textAlign = "left";
    }

    _drawToast(ctx) {
      if (this.toast.timer <= 0 || !this.toast.text) return;
      ctx.save();
      ctx.font = "700 13px 'Segoe UI', sans-serif";
      const tw = Math.min(720, ctx.measureText(this.toast.text).width + 36);
      const tx = 640 - tw / 2;
      const ty = 172;
      this._drawRoundedRect(ctx, tx, ty, tw, 28, 6);
      ctx.fillStyle =
        this.toast.tone === "warn"
          ? COLORS.danger
          : this.toast.tone === "ok"
          ? COLORS.ok
          : COLORS.mahoganyDeep;
      ctx.fill();
      ctx.strokeStyle = COLORS.brass;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = COLORS.porcelain;
      ctx.textAlign = "center";
      ctx.fillText(this.toast.text, 640, ty + 19);
      ctx.textAlign = "left";
      ctx.restore();
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    window.bistroGame = new BistroGame();
  });
})();
