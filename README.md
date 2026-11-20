# Solmar City

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Ann0nn/solmar-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Ann0nn/solmar-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An open-world crime game in the spirit of GTA 6, built with three.js, playable offline in a desktop browser from static files. Milo Reyes is back in Solmar City, a sun-soaked coastal town of downtown towers, Coral Plaza, the Marina, Old Town, Palm Heights, the Harbor and South Beach. Steal cars, outrun the law, run missions for Vera Solano and Tess Marlowe, and build your name from the beach to the hills.

## What is in the game

- A 7x7 road-grid city with buildings, palms, plazas, parks, a beach, a pier and the sea
- On foot (third person, mouse look, sprint, jump) and driving (arcade handling, chase camera, wheel spin and steering)
- Traffic that drives the grid on the right-hand side and brakes for trouble ahead
- Pedestrians who stroll the sidewalks and run when shots ring out
- Cars to steal: parked cars, traffic cars (the driver bails and the law notices), even a police car
- A wanted system, 1 to 5 stars: police cars chase and ram, officers on foot close in to arrest, heat fades when they lose sight of you
- Busted or wasted: Milo wakes up at the station or the hospital, lighter in the pocket
- Two story missions with objectives, dialogue, beacons and cash rewards: Sunset Getaway and the timed Harbor Run
- Combat: fists up close, a pistol with ammo and reload at range, police return fire at two stars and up
- A HUD with health, cash, wanted stars, speed, ammo, mission objective and timer, dialogue, district names and a round live minimap
- A start screen, a pause menu and saving to localStorage (on mission complete, on pause and on exit)
- Synthesized WebAudio sound: engine hum, sirens, gunshots, punches, crashes, pickups and mission jingles, no audio files
- Cash and health pickups scattered around the city that respawn over time

## Controls

| Keys | Action |
| --- | --- |
| WASD / Arrows | Move on foot, drive |
| Mouse | Look around (click to capture the pointer) |
| E | Enter / exit car |
| Q (or 1 / 2) | Pistol / fists |
| Click | Shoot (pistol) or punch (fists) |
| F | Punch |
| R | Reload |
| Shift | Sprint |
| Space | Jump |
| Esc | Pause and save |

## How to play

Serve `game/` with any static server and open `index.html` in desktop Chrome. From this repo: `node serve.ts`, then open http://localhost:8080. The game makes no network requests.

## Layout

- `game/index.html`, `game/style.css`: page and HUD styling
- `game/src/config.js`: city layout, districts, palette, tuning
- `game/src/random.js`: seeded random helpers
- `game/src/state.js`: the shared game object
- `game/src/input.js`: keyboard, mouse and pointer lock
- `game/src/audio.js`: synthesized WebAudio sound
- `game/src/save.js`: localStorage save and load
- `game/src/world.js`: city geometry, pickups, beacons, collision
- `game/src/vehicles.js`: car meshes, driving physics, parked cars
- `game/src/traffic.js`: AI traffic on the road grid
- `game/src/pedestrians.js`: sidewalk walkers who flee trouble
- `game/src/player.js`: Milo, the camera, entering and exiting cars
- `game/src/police.js`: wanted stars, chases, arrests, busted and wasted
- `game/src/combat.js`: fists, pistol, reload, police return fire
- `game/src/missions.js`: Sunset Getaway and Harbor Run
- `game/src/hud.js`: HUD, dialogue, minimap, menus
- `game/src/shots.js`: screenshot staging (`?shot=drive|chase|mission|city`)
- `game/src/main.js`: entry point and game loop
- `game/vendor/three/`: vendored three.js (minified)

<sub>Entered on [make.fun](https://make.fun/?ref=s27wgn68&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
