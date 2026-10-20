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

The QR image at `src/media/site-qr.png` encodes the live homepage URL above,
including the project path and trailing slash. It is served locally and also
works when previewing the site offline. Replace it if the public URL changes.

The voting link is still pending. Set `VOTE_URL` in `src/apple.html` when the
organisers provide the link and rebuild. The current button is disabled.

The 3D scene uses three.js r128 from cdnjs and falls back to the supplied 2D
animation if WebGL or three.js is unavailable. Fonts fall back to system fonts.
The supplied film, poster and postcards are hosted with the site.

`DESIGN_REFERENCE.md` contains the original design package notes. The original
video files and pipeline image remain in the repository for continuity.
