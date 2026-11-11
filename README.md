# Astra Dash

A responsive low-poly 3D platformer for the browser, built with [Three.js](https://threejs.org/) and [Vite](https://vite.dev/). All graphics are generated in code and all audio is synthesised live with the Web Audio API — there are no asset files.

## Play

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | `W` `A` `S` `D` / arrows | D-pad |
| Jump / double jump (hold for height) | `Space` | JUMP |
| Ground-pound (in mid-air) | `Shift` | SLAM |
| Turn camera | `Q` `E` or drag | drag the view |
| Pause / mute | `P` / `M` | HUD buttons |

Cross three floating-island worlds, hit `?` blocks from below (or pound them from above) for coins and Super Jump / Turbo Dash power-ups, stomp slimes, avoid lava, and reach the flagpole before the timer runs out. 100 coins earn an extra life; the best score is kept in `localStorage`.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Project layout

```
index.html            HUD, menus and touch overlay
src/main.js           UI wiring and bootstrap
src/game.js           game loop, physics, camera, entities
src/levels.js         level and theme definitions
src/models.js         procedural meshes and textures
src/audio.js          Web Audio synthesiser (music + effects)
src/input.js          keyboard and touch input
scripts/prune-deployments.mjs   keeps only the newest Vercel deployment
```

## Deployment

Pushes to `main` run `.github/workflows/deploy.yml`, which builds and publishes a **production** deployment to Vercel and then deletes all older deployments. Vercel's own Git integration is disabled in `vercel.json`, so no preview deployments are created. The workflow needs `VERCEL_TOKEN`, `VERCEL_ORG_ID` (or `VERCEL_TEAM_ID`) and `VERCEL_PROJECT_ID` as repository secrets or variables.
