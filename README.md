# Real-Time Robotic Portrait Drawing System

Capstone project by Jacqueline Mei, Luna Liu and Yi Ji, supervised by Farhad Farokhi.

Live website: https://jiayueliu1208.github.io/capstone-EM-12-FFAR-020/

## Update the site

The homepage uses the supplied `apple.html` design. Edit `src/apple.html`,
`src/plotter.js`, `src/arm3d.js` or the assets in `src/media/`, then run:

```sh
node build.mjs
```

Commit the source changes plus the generated root `index.html` and `media/`.
GitHub Pages publishes from the `main` branch, repository root. `.nojekyll`
allows the static files to be served directly. Other design variants remain
in `src/` and can be previewed from `dist/site/` after a build.

The voting image at `src/media/voting-qr.jpg` is the supplied `Downloads/qr_code.jpg`.
It opens the Google voting form prefilled with **B99: Real-Time Robotic Portrait
Drawing System**. The Vote for us button opens the same form. The image is hosted
locally and displayed in the voting section as Scan to vote for us.

The 3D scene uses three.js r128 from cdnjs and falls back to the supplied 2D
animation if WebGL or three.js is unavailable. Fonts fall back to system fonts.
The supplied film, poster and postcards are hosted with the site.

`DESIGN_REFERENCE.md` contains the original design package notes. The original
video files and pipeline image remain in the repository for continuity.
