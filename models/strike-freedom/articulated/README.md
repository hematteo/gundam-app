# Articulated Strike Freedom

The flight derivative separates existing rigid mechanical components at the shoulders, elbows, wrists, hips, knees and ankles. Chest, neck and six skirt pivots provide secondary motion. All 380,172 original triangles remain; the original vertices, UVs, corner normals and materials are retained. No rubber deformation, mesh slicing, decimation or replacement armor is used.

- `strike-freedom-articulated-hq.glb` — runtime asset, Draco geometry, 20,373,984 bytes.
- `strike-freedom-articulated.blend` — editable master with the cinematic rest pose and existing wing animation.
- `articulation-report.json` — exact pivot positions, hierarchy, geometry checks and component assignments.
- `export-validation.json` — independent checks of the delivered GLB.
- `runtime-fluid-poses.json`, `runtime-fluid-validation.json`, `runtime-fluid-*.png` — dynamic peak and reversal checks for the spring-driven flight revision; existing steady-pose evidence remains separate.
- `runtime-poses.json`, `runtime-pose-validation.json`, `runtime-*.png` — sampled browser-controller poses and Blender inspection evidence. These poses are driven procedurally in the browser, not saved over the resting master.
- `articulation-pose-check.png` — inspection render with modest knee, elbow, shoulder and hip flexion. This pose is not baked into the delivered GLB.

All eleven 2048 × 2048 PNG maps are byte-identical to the previous cinematic HQ asset. The rest-pose vertex and bounds checks before compression have zero error. The existing cinematic masters are unchanged.

## Runtime schema

Each new pivot has identity rotation and unit scale in its rest pose. Its local axes align with glTF: X across the suit, Y up, Z forward. Its `extras` contain:

| Key | Values |
| --- | --- |
| `articulationRole` | `chest`, `neck`, `shoulder`, `elbow`, `wrist`, `hip`, `knee`, `ankle`, `skirt` |
| `articulationSide` | `left`, `right`, `center` |
| `articulationSign` | `+1` for the original left limb at world +X; `-1` for the original right limb at world −X; `0` for center |
| `articulationAxes` | `gltf-y-up` |
| `articulationPanel` | Skirts only: `front`, `rear`, `side` |

Positive X rotation bends a hanging leg aft (toward −Z); negative X bends a forearm forward (toward +Z). Positive Z spreads the limb at +X outward, with opposite sign at −X. Apply a bounded rest-relative offset, then restore identity for docking.

The chest carries the shoulders, neck, collar vents, upper waist, backpack and existing wing controls. The head and forehead sensor follow the neck. Rifles follow wrists; shields follow elbows. Each hip is a separate root for its knee and ankle. The side skirt pivot carries that side’s hip railgun. Front and rear skirts are separate rigid panels. The existing `animationRole=primary/secondary` wing metadata and deployed quaternion rotations remain unchanged.

## Scope and limits

Pivots are inferred from visible joints in the source model; this is not manufacturer CAD or a mechanical collision simulation. Existing internal frame sleeves overlap around the knees and elbows. The current runtime uses distinct hover, cruise, boost, braking and climbing poses. The nominal normal-cruise pose bends knees about 34° and elbows 29°; boost reaches about 50° knees and 37° elbows before steering offsets. Front/side inspection renders of the actual controller output include cruise, boosted turn, braking turn, hover and ascent. The fluid revision keeps these limits and adds controlled spring overshoot and small powered balance corrections. Additional renders sample peak motion and abrupt reversals. These sampled poses are not an exhaustive collision check of all input combinations. Hands stay in their existing rifle grip; individual fingers are not animated.

Rebuild from the repository root with the installed Blender:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --disable-autoexec --python scripts/blender/build_articulated_strike_freedom.py
python3 scripts/blender/verify_articulated_export.py
```

Original model: **Strike Freedom Gundam by K0077**, CC BY 4.0. See [the source and attribution record](../README.md). This derivative adds a rigid articulation hierarchy to the existing photo-guided material and wing refinements.
