# SEED-inspired maintenance bay

An original, editable Blender environment for the Strike Freedom gift preview, guided by four actual anime stills from official Gundam episode galleries. The source images and observed features are documented in `../../references/anime-hangar/README.md`.

## Files

- `seed-inspired-hangar.blend`: editable Blender scene.
- `seed-inspired-hangar.glb`: 18 meshes grouped by finish, 39,229 triangles, 2,305,844 bytes. No raster images or anime screenshots are embedded.
- `environment-report.json`: geometry summary.
- `../../scripts/blender/build_anime_hangar.py`: reproducible geometry construction.
- `../../scripts/web/hangar.js`: browser renderer, cameras, lights, animation and optional audio.
- `../../scripts/web/anime-look.js`: cel-style armor shading, selective outlines, paint variation, reflection environment and boot contact accents.
- `../strike-freedom/articulated/strike-freedom-articulated-hq.glb`: current runtime suit, preserving the original geometry and eleven 2K texture maps.
- `../strike-freedom/articulated/strike-freedom-articulated.blend`: editable rigid-joint derivative; see its accompanying README for the pivot schema and attribution.
- `../../scripts/web/articulation-rig.js` and `articulation-motion.js`: runtime joint binding and independently tested motion responses.
- `../../strike-freedom.html`: hangar preview.
- `../../strike-freedom-studio.html`: preserved previous studio preview.

## Art direction

Violet-gray segmented cladding, a curved rear bulkhead, dark catwalks and gantries, human-scale railings, exposed muted red/yellow/dark service cables, cold work lamps and small markers are taken from directly observed anime references. The layout combines those details into an original maintenance bay. It is not a frame-exact reconstruction of the Eternal, Archangel, Minerva, or any other named ship.

The robot uses the articulated derivative of the cinematic model. It starts with both primary hinges and secondary pod supports folded. Deployment first retracts the docking equipment, then opens the primary wings in pairs and finally spreads the gold pod supports. Folding reverses this sequence. Its 20 rigid pivots cover the shoulders, elbows, wrists, hips, knees, ankles, chest, neck and six skirt panels. The pivot positions are inferred from the visible joints; this is a presentation rig without mechanical collision simulation.

## Arrival and depth

An eight-second camera move passes the foreground catwalk, switches on approach, rear and main worklight banks, activates the sensors, and settles into the overview. Skip arrival, Escape, and Replay arrival are supported. Reduced-motion preferences bypass the camera move and joint interpolation. Animation time pauses while the document is hidden.

The neighboring bay and the rear warm passage have actual openings, floors and walls. Foreground catwalk grates and an overhead hoist frame the entrance. Dynamic docking pads, plugs, flexible leads and toe chocks are assembled by `scripts/web/docking.js`; the static Blender master contains their supporting rails. Those animated runtime parts are not baked into the environment GLB.


## Anime lighting and material pass

The browser applies narrow transitions between broad diffuse-light bands to the armor, with cool blue shadow colors. The original normal maps and face/cockpit textures remain intact. Gold and gunmetal retain their metallic reflections, using a small procedural reflection environment whose bright cards match the worklight directions. A thin navy outline pass applies to the Gundam, leaving the hangar unoutlined.

The overhead key is warmer and the fill darker. Hangar geometry now casts real shadows. Shadow maps are cached when the geometry is stationary and refreshed during wing movement. Boots are placed using the leg geometry bounds; two soft contact accents supplement the dynamic shadows. These accents are an artistic approximation, not baked ambient occlusion.

The environment contains grate bars, access ladders, wall fasteners, native Blender text stencils, a wheeled service trolley and two equipment cases. Subtle procedural paint/roughness variation is applied in the browser. The overview camera is lower to emphasize scale. These material effects live in the browser module; the Blender file contains the editable geometry and base materials.

## Controls

- Drag / arrow keys: inspect the scene. Scroll / pinch: approach or pull back.
- Three camera icons: Overview, Cockpit and Walkway, with hover/focus labels.
- Deploy / Fold: animate the primary and secondary wing joints.
- Options → Work lights: change direct, ambient and fixture light levels.
- Speaker icon: opt-in synthesized ventilation ambience. No microphone or audio files are used. Audio fades out when the page is hidden.
- Pilot / P: release the dock, deploy the wings and launch into space above Earth.
- In flight: drag the scene to steer and fly; release to ease into a hover. W/S thrust and brake, A/D turn, Q/E strafe, Space rises, C descends, Shift boosts. The thumbstick turns and controls thrust, with separate altitude/boost buttons. Pointer capture supports continuous drags and simultaneous touches.
- V / Front–Rear: smoothly orbit between front and rear flight views. Controls remain pilot-relative; docking uses the automatic rear camera. The selected view returns on the next launch.
- R: reset the flight position when flying; return to the overview when inspecting.
- Dock / Escape: align, return to the pad, fold the wings and secure the supports.
- H: hide or restore controls. They also fade after inactivity and during dragging/zooming; move the pointer, tap or use the bottom chevron to restore them. Keyboard navigation keeps focused controls available.
- Options → References & credits: view the actual official stills and their source links. Replay, studio and lighting settings share this compact panel.

Reduced-motion preferences disable the opening camera move and wing interpolation. The render loop pauses while the page is hidden. Camera bounds keep ordinary orbit inspection inside the modeled room. Mobile overview framing widens during wing deployment.

Flight uses `flight.js`, `flight-input.js` and the independently tested `flight-motion.js`. Controls use analog pointer input, damped thrust, turn-driven banking and a camera with modest look-ahead. The suit releases, passes the bay entrance and enters a large bounded orbital volume in front of the carrier. Docking first aligns with the entrance, then returns to the pad and folds the wings. This is arcade flight without rigid-body physics or full geometry collision. The manual flight envelope keeps the suit outside the carrier; docking follows a controlled approach.

`articulation-rig.js` binds the model's rigid pivots to poses from `articulation-motion.js`. Relaxed arms and bent knees give hover a distinct silhouette. Forward thrust trails the legs, braking brings the limbs forward, and turns lead with the head while the chest and paired limbs respond asymmetrically. Analytic underdamped springs give the wrists, ankles, skirts and wings a slower follow-through than the head and torso, including small controlled overshoot. Acceleration and changes in turn rate briefly load the limbs. Small independent balance corrections vary the knees and arms slowly in powered hover/cruise; every channel stays within the existing angular limits. Docking uses a critically damped response and disables the balance corrections. Body pitch and bank share the spring solver, while translation and steering controls retain their existing response. The sole thrusters inherit ankle articulation with a bounded extra angle based on forward speed. Continuous motion outside the bay does not redraw its spotlight shadow map. Docking and reset restore the exact authored joint rotations and clear accumulated motion. Reduced motion keeps a modest static airborne pose.

`space-environment.js` adds a 3D Earth, procedural clouds and atmosphere, a seeded star field and an original carrier around the existing bay. `carrier-exterior.js` builds tapered layered armor, a recessed octagonal launch portal, low launch rails, swept service nacelles, a bridge visor and hollow aft engines. The static carrier is batched into eight material meshes with 3,528 triangles; its geometry preserves the launch corridor and neighboring room. Earth uses NASA's June 2004 Blue Marble map, retained locally at 5400×2700; source links and credit are in `assets/space/README.md`. The carrier is not a replica of a named anime ship. Positions and sizes are composed for the scene. Fog, sunlight and rear fill transition as the suit leaves the bay. The existing anime materials and HQ Gundam remain in use.

Rifles follow wrists, shields follow elbows, and the head sensor follows the neck. The backpack and wing controls follow the chest; hip railguns follow the side skirts. Sole-mounted thrusters follow the articulated ankles and respond to thrust, dock sockets travel with the suit, and boot contact accents hide in flight. Shadows refresh when geometry moves. Input clears on blur, page hiding and opening a dialog. Reduced motion bypasses automatic launch/return travel and cosmetic banking while preserving manual movement. The phone view fits the deployed wing span, and flight controls remain visible.

## Render resolution

The canvas resizes in real drawing-buffer pixels, including when browser zoom or display density changes. Desktop supersampling uses 2–3 pixels per CSS pixel, bounded by 12 million pixels and the GPU's maximum dimensions. Phones and narrow views use up to 2.5× density within a 4-million-pixel budget. Budgets may reduce those ratios on large displays. The main shadow map is 4096×4096 on desktop and 2048×2048 on phones; resizing disposes and recreates it only when its size changes. All material textures receive up to 16× anisotropic filtering. The runtime articulated HQ asset preserves all 380,172 original triangles and eleven original 2048×2048 PNG maps. Articulation adds about 106 KB to the cinematic HQ GLB, with byte-identical textures and no change to the anime material treatment.

## Running

Serve the repository with `python3 -m http.server 8765 --bind 127.0.0.1`, then open `/strike-freedom.html`. The preview uses Three.js 0.180.0 modules from jsDelivr and the Draco 1.5.7 decoder from Google. Models and reference files are served locally. No backend or build step is required. The public repository includes the runtime GLB assets; Blender authoring files and build scripts mentioned below remain in the original local workspace.

Rebuild the hangar using the installed Blender app:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python scripts/blender/build_anime_hangar.py
```

Rebuild and verify the articulated suit separately:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python scripts/blender/build_articulated_strike_freedom.py
python3 scripts/blender/verify_articulated_export.py
```

The export verifier checks triangle preservation, original texture bytes, all 20 pivot transforms and hierarchies, weapon/shield/sensor attachments, and the existing wing controls. `scripts/blender/inspect_runtime_articulation.py` provides pose inspection renders.

Run the 33 motion, articulation, sequencing and rendering checks:

```sh
node --test scripts/web/flight-motion.test.mjs scripts/web/articulation-motion.test.mjs scripts/web/spring-motion.test.mjs scripts/web/experience-timing.test.mjs scripts/web/render-quality.test.mjs
```
