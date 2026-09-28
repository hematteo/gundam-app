# Strike Freedom — Blender refinement

The supplied GLB has been refined in Blender against the friend's MGEX Strike Freedom photographs (`2942.JPG` and `2973.JPG`). This is a photo-guided derivative of an existing artist's model, not a scan or a verified replica of every MGEX part.

## Deliverables

The current hangar uses the `articulated/` derivative:

- `articulated/strike-freedom-articulated.blend` — editable Blender master with 20 rigid pivots for chest, neck, shoulders, elbows, wrists, hips, knees, ankles and six skirt panels. The existing two-stage wing controls remain editable.
- `articulated/strike-freedom-articulated-hq.glb` — current hangar asset, 20,373,984 bytes. Preserves all 380,172 triangles and all eleven original 2048×2048 PNG textures; approximately 106 KB larger than the preceding HQ export. Identity-rest pivots preserve the original standing pose. Rifles follow wrists, shields follow elbows, and backpack/wings follow the chest.
- `articulated/articulation-report.json`, `export-validation.json` and `runtime-pose-validation.json` — rest-pose, hierarchy, texture and sampled flight-pose checks. Front/side renders cover hover, boosted turn, braking turn and ascent.

The browser uses damped joint motion for flight and restores the exact rest pose on docking. The pivots are authored presentation joints with conservative limits, not a physical joint or collision simulation. See `articulated/README.md` for the schema and reproduction commands.

The preceding `cinematic/` derivative is retained:

- `cinematic/strike-freedom-cinematic.blend` — preserved full-resolution materials and photo references; eight primary hinges plus eight independently editable secondary pod linkages. Frame 1 folds both stages; frame 90 retains the deployed silhouette.
- `cinematic/strike-freedom-cinematic.glb` and `cinematic/strike-freedom-cinematic-web.glb` — full-resolution and compressed exports. The web file is 9,873,940 bytes, with 57 mesh objects and joint-role metadata used by the browser animation.
- `cinematic/strike-freedom-cinematic-hq.glb` — preceding HQ asset, 20,268,160 bytes. Restores the original eleven 2048×2048 PNG maps while retaining the compact export's Draco geometry and full joint hierarchy. Nine surface maps regain their source resolution; the face and cockpit maps were already 2K. No texture is upscaled or generated. `hq-validation.json` records exact source texture hashes and proves that all 143 non-image buffer views remain byte-identical.
- `cinematic/front-check.png`, `refinement-report.json`, `export-validation.json` — inspection render and checks for the new derivative.

The cinematic pass refines the red cockpit bezel, adds eight small gold collar-vent inserts and a forehead lens, shortens the gold aerials slightly, and darkens the lower rifle muzzle surfaces based on `2942.JPG`. It reverses the old baked secondary wing offsets and replaces them with real joints. All 28 deployed wing mesh bounds remain within 0.000000157 scene units of the preceding export. These are targeted improvements, not a newly scanned or fully rebuilt kit.

The prior deliverables below are retained:

- `refined/strike-freedom-refined.blend` — editable master, packed textures and private photo references, studio lighting and cameras. Frame 90 is the deployed pose; frame 1 has the main wing hinges folded. Eight named hinge controls are editable in the Outliner. Secondary pod supports remain partly opened at frame 1.
- `refined/strike-freedom-refined.glb` — standard GLB, full-resolution maps, static deployed pose, about 34.3 MiB.
- `refined/strike-freedom-web.glb` — compact web GLB, Draco mesh compression and 1K normal maps, about 9.4 MiB. Face/cockpit color details retained. Requires a Draco-capable viewer, such as model-viewer or Three.js with DRACOLoader.
- `../../strike-freedom-studio.html` — local interactive studio preview with front, rear, three-quarter and rotation controls. Loads the pinned model-viewer 4.3.1 library and Draco decoder from their CDNs; the model is served locally.
- `renders/refined-front.png`, `refined-hero.png`, `refined-rear.png` — Blender inspection renders.
- `renders/web-roundtrip.png` — render of the compact GLB re-imported into Blender.
- `refined/export-validation.json` — validation results for both exports.

## Changes

- Recolored white armor, blue pods and feet, red accents, dark wing blades and joints, and several gold finishes to better match the photographs.
- Removed oversized source-only decals from the large armor panels, retaining imported UVs and normal-map detail. Small face/cockpit details were preserved with Blender shader baking.
- Removed an overlapping arm duplicate and mirrored the cleaner opposite arm armor.
- Separated all eight blue DRAGOON pods, their black blades and gold supports. Added eight editable primary hinges and opened secondary pod links for a spread display.
- Named the body, armor, frame, weapon and wing objects for subsequent editing.
- Preserved the original downloaded GLB untouched in `source/`.

The two original refined exports have 48 mesh objects, eight pods and eight hinge controls, totaling 379,200 triangles. Draco reduces download size, not GPU triangle count. Further LOD work may be useful for low-end phones.

## Accuracy limits

The source provides the overall Strike Freedom form. Materials and wing deployment are guided by two perspective photographs. Body proportions, hidden/rear surfaces, fine MGEX panel geometry, decals, and the exact photographed rifle/body pose remain approximate. This iteration uses a standing display pose with separate rifles. It does not recreate the joined rifle pose from the shelf photo. The wing hinges and newer rigid body pivots are presentation controls, not verified engineering joints or a skin-deforming character rig.

## Verification

Both GLBs were re-imported in Blender. Triangle counts, eight pods, eight hinge controls, deployed bounds and absence of cameras/lights were checked. The full export's maximum bounds deviation was 0.00000012 scene units; the web export's was 0.0000043. Front, rear and three-quarter renders were visually inspected. No private reference images, studio meshes, lights or cameras are exported in either GLB.

## Attribution

Original: **Strike Freedom Gundam**, by **K0077**.

- Source: https://sketchfab.com/3d-models/strike-freedom-gundam-0d5a236cdb164c5094a8d296d9352943
- License: Creative Commons Attribution 4.0 — https://creativecommons.org/licenses/by/4.0/
- Changes: photo-guided materials, decal cleanup, duplicated-arm correction, mirrored armor, separated/posed wings, rigid body articulation and web optimization.
- Original GLB SHA-256: `80815c3dc77ab86ac28bde2352e4e73991094c6e6a5628df5cc94e3ed5566b04`.

Keep this attribution with shared model files and in the gift app. Copyright/license metadata is embedded in both GLB exports. The `.blend` includes the friend's private reference photographs; keep that master private unless the photos are removed or sharing is intended.

## Reproduce

Use the installed Blender application, from the repository root, with `--background --factory-startup --disable-autoexec --python` and these scripts in order:

1. `scripts/blender/prepare_strike_freedom.py`
2. `scripts/blender/inspect_strike_freedom.py`
3. `scripts/blender/analyze_parts.py`
4. `scripts/blender/refine_strike_freedom.py`
5. `scripts/blender/export_and_verify_strike_freedom.py`
6. `scripts/blender/refine_cinematic_asset.py` — build the separate cinematic derivative.

Then run `python3 scripts/blender/verify_cinematic_exports.py` to check the new full-resolution GLB hierarchy and deployed wing bounds against the preceding export.

Finally run `python3 scripts/assets/build_hq_gundam.py` to package the high-quality browser derivative from the cinematic full-resolution and compact exports. It validates the result after reopening it and preserves both inputs.

For the current articulated pass, run `scripts/blender/build_articulated_strike_freedom.py` in Blender with the same background options, then `python3 scripts/blender/verify_articulated_export.py`. Existing source and cinematic assets are preserved.

For the new hangar preview visit `/strike-freedom.html`; for the preserved studio preview visit `/strike-freedom-studio.html`. Serve the repository locally:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```
