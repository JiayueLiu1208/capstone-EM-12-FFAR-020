/*
 * hero-3d.js: the 3D look for the portrait page's hero: pink printed plastic, a silver elbow
 * bearing, gold ink, and one soft light whose shadows land on the white page. The page calls
 * createHero3D(stage, opts) and falls back to the 2D hero when it returns null (no WebGL).
 */
(function (root) {
  'use strict';

  root.createHero3D = function (stage, opts) {
    const T = root.THREE;
    if (!T || !root.Arm3D) return null;
    const col = (hex) => new T.Color(hex).convertSRGBToLinear();
    const GOLD = '#c18e1f';

    return root.Arm3D.create(stage, {
      text: opts.text,
      duration: opts.duration,
      wrapUnits: 150,
      textLayout: { z: 150, maxW: 290, maxCap: 28, maxH: 110 },
      view: {
        height: 1700,
        vAlign: 0.85,
        padPx: 18,
        maxTextPx: 980,
        homeX: (W) => (W < 520 ? 118 : 150)
      },
      materials: () => ({
        pink: new T.MeshStandardMaterial({ color: col('#ef9a89'), roughness: 0.62, metalness: 0 }),
        pinkLight: new T.MeshStandardMaterial({ color: col('#f4ad9e'), roughness: 0.55, metalness: 0 }),
        metal: new T.MeshStandardMaterial({ color: col('#d8d8d8'), roughness: 0.28, metalness: 0.55 }),
        tip: new T.MeshStandardMaterial({ color: col('#c9a04a'), roughness: 0.35, metalness: 0.5 })
      }),
      ink: { color: col(GOLD), width: 1.15 },
      environment(scene) {
        scene.add(new T.HemisphereLight(0xffffff, col('#efd8d2'), 0.48));
        // light from the upper left of the frame, so shadows fall down and to the right
        const key = new T.DirectionalLight(0xffffff, 0.7);
        key.position.set(-260, 900, -160);
        key.target.position.set(0, 0, 120);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.bias = -0.0004;
        key.shadow.radius = 4;
        Object.assign(key.shadow.camera, { left: -460, right: 460, top: 460, bottom: -460, near: 100, far: 2000 });
        scene.add(key, key.target);
        // the page itself is the table: an invisible floor that only shows shadows
        const floor = new T.Mesh(new T.PlaneGeometry(4000, 4000), new T.ShadowMaterial({ opacity: 0.12 }));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
      }
    });
  };
})(window);
