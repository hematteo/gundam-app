# William’s Hangar

The gift app features **Strike Freedom** in an interactive maintenance hangar, with an orbital flight mode. `index.html` opens Strike Freedom directly.

**Website:** [William’s Hangar](https://hematteo.github.io/gundam-app/)

GitHub Pages serves the static site from the root of `main`. Pushes to `main` update the website automatically. `.nojekyll` keeps the HTML, JavaScript and models as static files without a Jekyll build.

Start a local preview from this folder:

```sh
python3 -m http.server 4189 --bind 127.0.0.1
```

Open `http://127.0.0.1:4189/` for a local preview. Models are served alongside the app. The pinned Three.js library and Draco decoder load from public CDNs, so the 3D page needs an internet connection on its first visit.

## Public repository

The repository includes the complete Strike Freedom web app, motion tests, runtime models, studio poster, Earth texture and credited anime references. No build step or package installation is required. The downloadable GLB files can be opened in Blender with **File → Import → glTF 2.0**.

Personal reference photos, Blender authoring masters containing those photos, intermediate exports, design studies and WHITEOUT are kept only in the original local workspace and excluded by `.gitignore`. Authoring paths and reproduction commands below describe that local workspace; they are not required to run this public app. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for model and image credits.

WHITEOUT is paused and removed from the active app. Its previous URL redirects to Strike Freedom. Its sources and model files remain in the original local workspace for later.

## Earlier design concepts

The original design studies and concept images are preserved locally and are not part of this public repository.

## Refined Strike Freedom model

`strike-freedom.html` places the refined model in an interactive 3D maintenance hangar, guided by actual SEED / SEED DESTINY anime stills. It includes an eight-second skippable arrival, staged lights and sensors, three inspection cameras, dock release and two-stage wing deployment, work/standby lighting, optional ambience and a reference gallery. The previous model-viewer version is preserved as `strike-freedom-studio.html`. Serve the directory locally to use either page; their pinned rendering libraries and Draco decoder require internet access, while models remain local.


The minimal interface leaves the scene unobstructed: camera icons, Deploy, Pilot, ambience and a small options menu. Inspection controls fade after 4.2 seconds of inactivity, or while dragging/zooming; pointer movement, a tap, keyboard input or the small bottom chevron restores them. H toggles inspection controls. Keyboard focus, an open menu or a dialog keeps controls available. Secondary lighting, replay, studio and credit options live in the options menu. The large headline and scene captions have been removed, and the overview now centers the model.

**Pilot** (or P) releases the dock and launches into an orbital setting above Earth. Hold and drag the scene to fly, steer and climb; release to ease back to a hover. W thrusts, S brakes, A/D turn, Q/E strafe, Space rises, C descends and Shift boosts. The thumbstick turns and controls thrust; three separate buttons handle altitude and boost. R resets the flight position; Escape or Dock returns through the bay entrance and secures the suit. V or the compact Front/Rear button smoothly orbits between a rear chase view and a front view of the suit. Flight controls stay relative to the pilot. The camera returns behind the suit for docking and remembers the chosen view for the next launch. Banking follows actual velocity, and the camera looks slightly ahead. Reduced-motion settings suppress banking, camera lag and automatic launch/return travel.

Flight also articulates the suit through 20 rigid pivots: shoulders, elbows, wrists, hips, knees, ankles, chest, neck and six skirt panels. Hover relaxes the arms and bends the knees; ordinary thrust visibly tucks the knees and bends the elbows, boost deepens the tuck, braking brings the legs and forearms forward, and turns lead with the head while the torso and limbs counterbalance. Underdamped springs preserve momentum, with a small overshoot and recovery: shoulders and hips lead, elbows and knees follow, and hands and feet settle last. Small, slow balance corrections keep powered hover and cruise alive without changing the main pose. Body pitch and bank also carry angular momentum through release. Thrust intent starts the pose response before speed builds, and analog braking blends proportionally. Rifles, shields and sensors follow their joints, and sole thrusters follow the ankles. Docking restores the exact authored rest pose; reduced motion uses a modest static airborne pose. The presentation rig uses inferred joint positions and conservative motion limits, without mechanical collision simulation.

The exterior includes a 3D Earth with a local [NASA Blue Marble surface map](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/), procedural clouds and atmosphere, a seeded star field and an original carrier around the existing hangar, with tapered layered armor, a recessed octagonal launch portal, low launch rails, swept service nacelles, a bridge visor and recessed engines. It is an art-directed setting rather than a canon ship or a scale orbital simulation. Flight is bounded to a large area in front of the carrier; auto-docking handles entry into the bay. Source details are in `assets/space/README.md`.

See `models/hangar/README.md` for the environment and controls, and `references/anime-hangar/README.md` for the official reference sources.

The editable Blender masters, standard GLB, high-quality runtime GLB, retained compact 9.4 MiB cinematic GLB, renders, source attribution and verification results are in `models/strike-freedom/`. See that folder's README for the changes and accuracy limitations. This model is a photo-guided approximation of the friend's MGEX Strike Freedom, with refined colors, articulated wings and rigid limb joints. The current editable derivative is `models/strike-freedom/articulated/strike-freedom-articulated.blend`; its pivot hierarchy and asset checks are documented in `models/strike-freedom/articulated/README.md`.

The hangar loads `models/strike-freedom/articulated/strike-freedom-articulated-hq.glb`, preserving all 380,172 original triangles and eleven original 2048×2048 texture maps. Its rigid hierarchy adds about 106 KB to the cinematic HQ GLB; the original texture bytes are unchanged. Prior masters remain intact in `refined/` and `cinematic/`. The renderer supersamples standard displays and tracks Retina/zoom changes, with a 12-megapixel desktop buffer budget and 4-megapixel phone/narrow-view budget. Desktop shadows use 4096×4096 maps; phones use 2048×2048. Texture filtering uses up to 16× anisotropy, limited by GPU support. These settings improve rendering sharpness without adding invented model detail.

Run `node --test scripts/web/flight-motion.test.mjs scripts/web/articulation-motion.test.mjs scripts/web/spring-motion.test.mjs scripts/web/experience-timing.test.mjs scripts/web/render-quality.test.mjs` for 33 checks covering flight, joint responses and limits, exact docking reset, reduced motion, sequencing and pixel budgets. Rebuild the articulated derivative with Blender using `scripts/blender/build_articulated_strike_freedom.py`, then run `python3 scripts/blender/verify_articulated_export.py` to verify geometry, original textures, pivot hierarchy and attachments. The articulated asset README includes the full build command. Earlier source-asset tools remain available: `scripts/blender/verify_cinematic_exports.py` checks deployed wing bounds, and `scripts/assets/build_hq_gundam.py` reproduces the cinematic HQ GLB.
