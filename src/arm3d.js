/*
 * arm3d.js: the 3D hero. Same arm, same motion and same view as the 2D version, rendered with
 * three.js (global THREE) so the printed parts have real light, shading and shadows.
 *
 * The camera sits straight above the arm's base and looks down. Its frustum is shifted so the base
 * appears near the top of the frame and the title in the middle. Because the camera is directly over
 * the base, the vertical plane holding both links always passes through the camera, so the two links
 * stay in one line on screen; perspective still shows height (the raised elbow looks closer).
 *
 * World frame, millimetres: x to the viewer's right, y up, z forward from the base toward the viewer.
 */
(function (root) {
  'use strict';

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const ease = (u) => 0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1));
  const deg = (r) => (r * 180) / Math.PI;

  // Equal links, pen hanging Lt = h0 below the wrist: with the pen on the paper the wrist is level
  // with the shoulder (the same model as the 2D engine).
  const DIM = { h0: 96, L1: 150, L2: 150, Lt: 96, lift: 8, home: { x: 150, y: 8, z: 20 } };

  function solve(x, y, z) {
    const yaw = Math.atan2(-z, x);
    const r = Math.hypot(x, z);
    const dy = y + DIM.Lt - DIM.h0;
    const c = clamp((r * r + dy * dy - DIM.L1 * DIM.L1 - DIM.L2 * DIM.L2) / (2 * DIM.L1 * DIM.L2), -1, 1);
    const q3 = -Math.acos(c);
    const q2 = Math.atan2(dy, r) - Math.atan2(DIM.L2 * Math.sin(q3), DIM.L1 + DIM.L2 * Math.cos(q3));
    return { yaw, q2, q3, q4: -Math.PI / 2 - q2 - q3 };
  }

  /* ── The printed arm ──────────────────────────────────────────────────────────────
   * Base drum, turret, shoulder tower, two chunky links with rounded ends, an elbow bearing and a
   * vertical pen holder. Motors and screws are left out. */
  function buildArm(THREE, M) {
    const meshes = [];
    const mk = (parent, geo, mat, x = 0, y = 0, z = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      parent.add(m);
      meshes.push(m);
      return m;
    };
    const cylZ = (r, len, seg = 48) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateX(Math.PI / 2); return g; };
    const cylX = (r1, r2, len, seg = 40) => { const g = new THREE.CylinderGeometry(r1, r2, len, seg); g.rotateZ(-Math.PI / 2); return g; };
    const bevel = { bevelEnabled: true, bevelThickness: 2.5, bevelSize: 2.5, bevelSegments: 4, curveSegments: 36 };
    const link = (L, R, T) => {
      const s = new THREE.Shape();
      s.moveTo(0, -R);
      s.lineTo(L, -R);
      s.absarc(L, 0, R, -Math.PI / 2, Math.PI / 2, false);
      s.lineTo(0, R);
      s.absarc(0, 0, R, Math.PI / 2, Math.PI * 1.5, false);
      const g = new THREE.ExtrudeGeometry(s, { depth: T - 5, ...bevel });
      g.translate(0, 0, -(T - 5) / 2);
      return g;
    };

    const rootG = new THREE.Group();
    const baseH = 44;
    mk(rootG, new THREE.CylinderGeometry(60, 62, baseH, 96), M.pink, 0, baseH / 2, 0);
    mk(rootG, new THREE.TorusGeometry(60, 1.6, 12, 96).rotateX(Math.PI / 2), M.pinkLight, 0, baseH, 0);

    const yaw = new THREE.Group();
    yaw.position.y = baseH;
    rootG.add(yaw);
    mk(yaw, new THREE.CylinderGeometry(47, 47, 10, 96), M.pinkLight, 0, 5, 0);
    const ax = DIM.h0 - baseH;
    const tower = new THREE.Shape();
    tower.moveTo(-25, 8);
    tower.lineTo(25, 8);
    tower.lineTo(25, ax);
    tower.absarc(0, ax, 25, 0, Math.PI, false);
    tower.lineTo(-25, 8);
    const tg = new THREE.ExtrudeGeometry(tower, { depth: 40, ...bevel });
    tg.translate(0, 0, -20);
    mk(yaw, tg, M.pink);

    const sh = new THREE.Group();
    sh.position.y = ax;
    yaw.add(sh);
    mk(sh, cylZ(19, 50), M.pinkLight);
    mk(sh, link(DIM.L1, 16, 36), M.pink);

    const el = new THREE.Group();
    el.position.x = DIM.L1;
    sh.add(el);
    mk(el, cylZ(15, 42), M.pinkLight);
    mk(el, cylZ(7.5, 46), M.metal);
    mk(el, link(DIM.L2, 13, 30), M.pink);

    const wr = new THREE.Group();
    wr.position.x = DIM.L2;
    el.add(wr);
    mk(wr, cylZ(13, 32), M.pinkLight);
    mk(wr, cylX(11, 11, 70), M.pink, 39, 0, 0);
    mk(wr, cylX(4.5, 1, 22), M.tip, 85, 0, 0);
    const tip = new THREE.Object3D();
    tip.position.x = DIM.Lt;
    wr.add(tip);

    return {
      root: rootG,
      meshes,
      pose(j) { yaw.rotation.y = j.yaw; sh.rotation.z = j.q2; el.rotation.z = j.q3; wr.rotation.z = j.q4; }
    };
  }

  /* Ink: one ribbon mesh for the whole plan, revealed segment by segment (every 0.6 mm). */
  function buildInk(THREE, strokes, style) {
    const segs = strokes.map((s) => s.length - 1);
    const total = segs.reduce((a, b) => a + b, 0);
    const offsets = [0];
    for (const n of segs) offsets.push(offsets[offsets.length - 1] + n);
    const pos = new Float32Array(total * 18);
    let v = 0;
    const put = (x, z) => { pos[v++] = x; pos[v++] = style.y ?? 0.25; pos[v++] = z; };
    const h = style.width / 2;
    for (const s of strokes) {
      let dx = 1, dz = 0;
      for (let i = 1; i < s.length; i++) {
        const a = s[i - 1], b = s[i];
        const L = Math.hypot(b.x - a.x, b.z - a.z);
        if (L > 1e-6) { dx = (b.x - a.x) / L; dz = (b.z - a.z) / L; }
        const px = -dz * h, pz = dx * h, ex = dx * h, ez = dz * h;
        const a1 = [a.x - ex + px, a.z - ez + pz], a2 = [a.x - ex - px, a.z - ez - pz];
        const b1 = [b.x + ex + px, b.z + ez + pz], b2 = [b.x + ex - px, b.z + ez - pz];
        put(...a1); put(...a2); put(...b1);
        put(...b1); put(...a2); put(...b2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    // unlit, so the gold matches the 2D version exactly
    const mat = new THREE.MeshBasicMaterial({
      color: style.color, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    });
    const mesh = new THREE.Mesh(geo, mat);
    return {
      mesh, segs, offsets, total,
      reveal(n) { geo.setDrawRange(0, n * 6); },
      dispose() { geo.dispose(); mat.dispose(); }
    };
  }

  function webgl() {
    try {
      const c = document.createElement('canvas');
      return !!(root.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  /* ── Controller ────────────────────────────────────────────────────────────────────
   * cfg: text, duration(chars), wrapUnits, textLayout { z, maxW, maxCap, maxH }, view { height,
   * vAlign, padPx, maxTextPx, homeX(W) }, materials(THREE), ink { color, emissive, width },
   * environment(scene, THREE). Returns null when WebGL is unavailable, so the page can fall back. */
  function create(stage, cfg) {
    const THREE = root.THREE;
    if (!THREE || !root.Plotter || !webgl()) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return null;
    }
    const reduce = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    stage.appendChild(canvas);

    const scene = new THREE.Scene();
    const view = cfg.view || {};
    const camH = view.height ?? 1100;
    const camera = new THREE.PerspectiveCamera(30, 1, 10, camH + 400);
    // base at the top: screen up is -z and the drawing faces the viewer across the table.
    // base at the bottom: screen up is +z, the viewer stands behind the arm, and screen right is -x.
    const atBottom = view.baseAt === 'bottom', f = atBottom ? -1 : 1;
    camera.position.set(0, camH, 0);
    camera.up.set(0, 0, -f);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    cfg.environment(scene, THREE);
    const arm = buildArm(THREE, cfg.materials(THREE));
    scene.add(arm.root);
    for (const m of arm.meshes) { m.castShadow = true; m.receiveShadow = true; }

    const TL = cfg.textLayout || {};
    let layout, plan, mapPt, ink = null, textBox = { hw: 100, z0: 100, z1: 200 };
    let t = 0, segIdx = 0, running = false, visible = true, last = 0, speed = 1, W = 1, H = 1;
    const st = { t: 0, k: 'wait', done: false, progress: 0, si: -1, drawing: false, z: 1, joints: {} };
    const home = { ...DIM.home };

    function setText(text) {
      layout = cfg.layout || Plotter.layoutText(text, { maxWidth: cfg.wrapUnits ?? 150, tracking: 2.4 });
      plan = Plotter.buildPlan(layout, cfg);
      const zc = TL.z ?? 150;
      const s = Math.min((TL.maxW ?? 290) / layout.width, (TL.maxCap ?? 28) / 10, (TL.maxH ?? 110) / layout.height);
      const w = layout.width, h = layout.height;
      mapPt = (p) => ({ x: f * (p.x - w / 2) * s, z: zc + f * (p.y - h / 2) * s });
      textBox = { hw: (w * s) / 2, z0: zc - (h * s) / 2, z1: zc + (h * s) / 2 };
      cfg.onLayout && cfg.onLayout(textBox, scene, THREE);
      let done = 0;
      for (const g of plan.segs) { g.doneBefore = done; if (g.k === 'draw') done++; }
      const strokes = plan.strokes.map((k) => {
        const n = Math.max(1, Math.ceil((k.len * s) / 0.6));
        const out = [];
        for (let i = 0; i <= n; i++) out.push(mapPt(Plotter.pointAt(k, (k.len * i) / n)));
        return out;
      });
      if (ink) { scene.remove(ink.mesh); ink.dispose(); }
      ink = buildInk(THREE, strokes, { ...cfg.ink, width: cfg.ink.width });
      scene.add(ink.mesh);
      Object.assign(api, { plan, layout });
      frame();
      restart();
    }

    /* Shifted overhead frustum: frame the floor region from just behind the base to just past the
       text, matched to the stage's aspect, with spare height mostly above the arm. */
    function frame() {
      const pad = view.padPx ?? 18, padT = view.padTopPx ?? pad, padB = view.padBottomPx ?? pad;
      if (view.homeX) home.x = f * view.homeX(W);
      const side = Math.max(textBox.hw + 16, Math.abs(home.x) + 30, 72);
      let x0 = -side, x1 = side, z0 = -70, z1 = textBox.z1 + (view.farMarginMM ?? 14);
      const A = Math.max(0.2, (W - 2 * pad) / Math.max(1, H - padT - padB));
      const w = x1 - x0, h = z1 - z0;
      // vAlign: share of any spare height that goes to the top of the screen
      const va = view.vAlign ?? 0.85, topIsFar = atBottom;
      if (w / h > A) {
        const extra = w / A - h;
        if (topIsFar) { z1 += extra * va; z0 -= extra * (1 - va); } else { z0 -= extra * va; z1 += extra * (1 - va); }
      } else {
        const extra = h * A - w;
        x0 -= extra / 2;
        x1 += extra / 2;
      }
      // keep the title from getting huge on very wide screens
      const pxPerMM = (W - 2 * pad) / (x1 - x0);
      const maxText = view.maxTextPx ?? 980;
      if (textBox.hw * 2 * pxPerMM > maxText) {
        const k = (textBox.hw * 2 * pxPerMM) / maxText, grow = (z1 - z0) * (k - 1);
        x0 *= k;
        x1 *= k;
        if (topIsFar) { z1 += grow * va; z0 -= grow * (1 - va); } else { z0 -= grow * va; z1 += grow * (1 - va); }
      }
      // pixel padding, expressed on the floor plane
      const mmPerPx = (x1 - x0) / (W - 2 * pad);
      x0 -= pad * mmPerPx; x1 += pad * mmPerPx;
      if (topIsFar) { z1 += padT * mmPerPx; z0 -= padB * mmPerPx; } else { z0 -= padT * mmPerPx; z1 += padB * mmPerPx; }
      const n = camera.near, k = n / camH;
      if (atBottom) camera.projectionMatrix.makePerspective(-x1 * k, -x0 * k, z1 * k, z0 * k, n, camera.far);
      else camera.projectionMatrix.makePerspective(x0 * k, x1 * k, -z0 * k, -z1 * k, n, camera.far);
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    }

    function locate() {
      const segs = plan.segs;
      if (segIdx >= segs.length) segIdx = segs.length - 1;
      while (segIdx > 0 && t < segs[segIdx].t0) segIdx--;
      while (segIdx < segs.length - 1 && t >= segs[segIdx].t0 + segs[segIdx].dur) segIdx++;
      return segs[segIdx];
    }

    const at = (where, y) => (where.home ? { ...home } : { ...mapPt(where), y });

    function evaluate() {
      const seg = locate();
      const u = seg.dur ? clamp((t - seg.t0) / seg.dur, 0, 1) : 1;
      let tip, shown = ink.offsets[seg.doneBefore];
      st.drawing = false;
      if (seg.k === 'wait') tip = at(seg.at);
      else if (seg.k === 'move') {
        const a = at(seg.from, DIM.lift), b = at(seg.to, DIM.lift), e = ease(u);
        const hop = Math.sin(Math.PI * u) * Math.min(5, Math.hypot(b.x - a.x, b.z - a.z) * 0.05);
        tip = { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e + hop, z: a.z + (b.z - a.z) * e };
      } else if (seg.k === 'down') tip = at(seg.at, DIM.lift * (1 - ease(u)));
      else if (seg.k === 'up') tip = at(seg.at, DIM.lift * ease(u));
      else {
        tip = { ...mapPt(Plotter.pointAt(seg.stroke, u * seg.stroke.len)), y: 0 };
        shown += Math.floor(u * ink.segs[seg.si]);
        st.drawing = true;
      }
      st.done = t >= plan.total;
      if (st.done) shown = ink.total;
      ink.reveal(shown);
      const j = solve(tip.x, tip.y, tip.z);
      arm.pose(j);
      st.t = t;
      st.k = seg.k;
      st.si = seg.si ?? -1;
      st.z = clamp(tip.y / DIM.lift, 0, 1);
      st.progress = ink.total ? shown / ink.total : 1;
      st.joints = { j1: deg(Math.atan2(tip.x, tip.z)), j2: deg(j.q2), j3: deg(j.q3), j4: deg(j.q4) };
    }

    function render() {
      renderer.render(scene, camera);
      cfg.frame && cfg.frame(st, api);
    }

    function resize() {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      W = w; H = h;
      renderer.setSize(w, h, false);
      if (plan) { frame(); render(); }
    }

    function restart() {
      t = reduce ? plan.total + 1 : 0;
      segIdx = 0;
      evaluate();
      render();
      if (cfg.autoplay !== false) kick();
    }

    function loop(now) {
      if (!running) return;
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 0;
      last = now;
      t += dt * speed;
      evaluate();
      render();
      if (t > plan.total + 0.2) { running = false; return; }
      requestAnimationFrame(loop);
    }
    function kick() {
      if (running || !visible || t > plan.total + 0.2) return;
      running = true;
      last = 0;
      requestAnimationFrame(loop);
    }

    const api = {
      three: true,
      setText, restart,
      seek(T) { t = T; segIdx = 0; evaluate(); render(); },
      scrub(fr) { t = clamp(fr, 0, 1) * plan.total; evaluate(); render(); },
      play() { cfg.autoplay = true; restart(); },
      refresh() { resize(); },
      get speed() { return speed; },
      set speed(v) { speed = v; },
      state: st,
      reducedMotion: reduce
    };

    new ResizeObserver(resize).observe(stage);
    if ('IntersectionObserver' in root) {
      new IntersectionObserver((es) => {
        visible = es[es.length - 1].isIntersecting;
        if (visible && cfg.autoplay !== false) kick(); else running = false;
      }).observe(stage);
    }
    W = stage.clientWidth || 1;
    H = stage.clientHeight || 1;
    renderer.setSize(W, H, false);
    setText(cfg.text);
    return api;
  }

  root.Arm3D = { create, solve, DIM };
})(window);
