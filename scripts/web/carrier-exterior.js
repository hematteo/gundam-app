import * as THREE from 'three';

// An original carrier built around the existing launch bay. All dimensions are
// scene metres; +Z is the open bow. Armor stays outside the flight corridor.
export function createCarrierExterior() {
  const carrier = new THREE.Group();
  carrier.name = 'Original orbital carrier / tapered armor';
  const palettes = {
    hull: new THREE.MeshStandardMaterial({ color: '#526178', roughness: .64, metalness: .42, fog: false }),
    armor: new THREE.MeshStandardMaterial({ color: '#acb8c7', roughness: .49, metalness: .46, fog: false }),
    slate: new THREE.MeshStandardMaterial({ color: '#718199', roughness: .57, metalness: .42, fog: false }),
    dark: new THREE.MeshStandardMaterial({ color: '#151f31', roughness: .76, metalness: .34, fog: false }),
    trim: new THREE.MeshStandardMaterial({ color: '#35465d', roughness: .43, metalness: .62, fog: false }),
    cyan: new THREE.MeshBasicMaterial({ color: '#b2e4ff', toneMapped: false, fog: false }),
    amber: new THREE.MeshBasicMaterial({ color: '#d9ad67', toneMapped: false, fog: false }),
    glass: new THREE.MeshStandardMaterial({ color: '#162e45', emissive: '#406c8c', emissiveIntensity: .3, roughness: .22, metalness: .67, fog: false }),
  };
  const batches = new Map(Object.keys(palettes).map(key => [key, []]));
  for (const material of Object.values(palettes)) material.userData.outlineParameters = { visible: false };

  // The carrier uses flat, faceted faces rather than smoothed cube silhouettes.
  // Small static parts are packed into one buffer per finish, avoiding hundreds
  // of draw calls while retaining bevel highlights, seams and panel depth.
  const add = (geometry, material = 'hull', matrix) => {
    const geometryFlat = geometry.index ? geometry.toNonIndexed() : geometry;
    if (geometryFlat !== geometry) geometry.dispose();
    if (matrix) geometryFlat.applyMatrix4(matrix);
    batches.get(material).push(geometryFlat);
  };
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  function box(x, y, z, width, height, depth, material = 'hull', roll = 0) {
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll);
    matrix.compose(position.set(x, y, z), quaternion, scale);
    add(new THREE.BoxGeometry(width, height, depth), material, matrix);
  }
  function polygonGeometry(faces) {
    const vertices = [];
    for (const face of faces) {
      for (let i = 1; i < face.length - 1; i++) vertices.push(...face[0], ...face[i], ...face[i + 1]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }
  function outline(x, bottom, top, width, chamfer, z) {
    const half = width / 2;
    return [
      [x - half + chamfer, bottom, z], [x + half - chamfer, bottom, z],
      [x + half, bottom + chamfer, z], [x + half, top - chamfer, z],
      [x + half - chamfer, top, z], [x - half + chamfer, top, z],
      [x - half, top - chamfer, z], [x - half, bottom + chamfer, z],
    ];
  }
  function loft(sections, material = 'hull', openBack = false) {
    const loops = sections.map(({ z, x = 0, bottom, top, width, bevel = .18 }) =>
      outline(x, bottom, top, width, Math.min(bevel, (top - bottom) * .45, width * .2), z));
    const faces = openBack ? [loops.at(-1)] : [loops[0].slice().reverse(), loops.at(-1)];
    for (let j = 1; j < loops.length; j++) {
      for (let i = 0; i < 8; i++) faces.push([loops[j - 1][i], loops[j - 1][(i + 1) % 8], loops[j][(i + 1) % 8], loops[j][i]]);
    }
    add(polygonGeometry(faces), material);
  }
  function rim(outer, inner, material) {
    const faces = [];
    for (let i = 0; i < 8; i++) faces.push([outer[i], outer[(i + 1) % 8], inner[(i + 1) % 8], inner[i]]);
    add(polygonGeometry(faces), material);
  }
  function beam(from, to, width, depth, material) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    matrix.compose(a.clone().add(b).multiplyScalar(.5), quaternion, scale);
    add(new THREE.BoxGeometry(width, a.distanceTo(b), depth), material, matrix);
  }

  // Low swept keel and a shallow armored roof: broad at the shoulders, tapered
  // aft and at the bow. The original bay floor and ceiling remain unobstructed.
  loft([
    { z: -26, bottom: -1.75, top: -.45, width: 9.2, bevel: .46 },
    { z: -18, bottom: -2.25, top: -.29, width: 17.8, bevel: .65 },
    { z: -5, bottom: -2.2, top: -.29, width: 19.4, bevel: .72 },
    { z: 6.5, bottom: -1.55, top: -.29, width: 14.1, bevel: .48 },
    { z: 10.1, bottom: -.87, top: -.29, width: 11.9, bevel: .22 },
  ], 'dark');
  loft([
    { z: -25.1, bottom: 4.65, top: 5.7, width: 9.2, bevel: .3 },
    { z: -15, bottom: 5.57, top: 6.7, width: 17.6, bevel: .32 },
    { z: -4.2, bottom: 5.57, top: 6.6, width: 18.1, bevel: .34 },
    { z: 5.2, bottom: 5.57, top: 6.19, width: 14.3, bevel: .2 },
    { z: 9.45, bottom: 5.57, top: 6.06, width: 11.4, bevel: .15 },
  ]);
  // Aft closure is deliberately behind the existing room, not across the bow.
  loft([
    { z: -24.8, bottom: -.5, top: 4.95, width: 8.7, bevel: .75 },
    { z: -16.5, bottom: -.5, top: 5.59, width: 15.8, bevel: .8 },
    { z: -8.9, bottom: -.5, top: 5.59, width: 16.8, bevel: .75 },
  ], 'trim');

  for (const side of [-1, 1]) {
    // Swept flank armor is split into three scales of plates over a dark recess.
    const flank = [
      { z: -23.8, x: side * 5.35, width: 2.2, bottom: -.95, top: 4.7, bevel: .58 },
      { z: -14.5, x: side * 7.2, width: 4.5, bottom: -1.4, top: 5.93, bevel: .77 },
      { z: -4.8, x: side * 7.5, width: 5.05, bottom: -1.2, top: 5.85, bevel: .8 },
      { z: 3.7, x: side * 6.7, width: 3.45, bottom: -.98, top: 5.76, bevel: .64 },
      { z: 9.35, x: side * 5.82, width: 1.8, bottom: -.66, top: 5.64, bevel: .36 },
    ];
    if (side < 0) {
      // The neighboring bay extends to x=-8.58. Preserve that interior room:
      // its armor is a thin outer wall and overhead plate, not a solid pod.
      loft(flank.slice(0, 3), 'dark');
      loft(flank.slice(2, 4).map(section => ({ ...section, bottom: 4.82, bevel: .25 })), 'dark');
      loft(flank.slice(3), 'dark');
      loft([
        { z: -4.85, x: -9.4, bottom: -.82, top: 5.55, width: 1.45, bevel: .28 },
        { z: 2.7, x: -9.0, bottom: -.74, top: 5.55, width: .75, bevel: .18 },
        { z: 3.64, x: -8.6, bottom: -.74, top: 5.55, width: .7, bevel: .18 },
      ], 'slate');
    } else loft(flank, 'dark');
    loft([
      { z: -22.7, x: side * 5.48, width: 2.28, bottom: -.6, top: 4.66, bevel: .56 },
      { z: -14.55, x: side * 7.23, width: 4.6, bottom: -.93, top: 5.87, bevel: .66 },
      { z: -5.15, x: side * 7.53, width: 5.12, bottom: -.82, top: 5.83, bevel: .77 },
    ]);
    loft([
      { z: -4.94, x: side * 7.52, width: 5.1, bottom: side < 0 ? 4.84 : -.78, top: 5.81, bevel: .28 },
      { z: 3.65, x: side * 6.73, width: 3.54, bottom: side < 0 ? 4.84 : -.74, top: 5.72, bevel: .28 },
    ], 'slate');
    loft([
      { z: 3.87, x: side * 6.73, width: 3.46, bottom: -.59, top: 5.68, bevel: .6 },
      { z: 9.3, x: side * 5.83, width: 1.78, bottom: -.46, top: 5.6, bevel: .34 },
    ]);

    // Light upper armor gives the carrier a readable anime silhouette, with a
    // narrower central command spine and visible dark seams between plates.
    for (const [start, end, frontX, rearX, frontW, rearW, roofY] of [
      [-14.2, -5.0, 5.42, 5.62, 5.05, 5.45, 6.69],
      [-4.75, 3.5, 5.24, 4.52, 5.45, 4.1, 6.53],
      [3.72, 8.65, 4.18, 3.52, 3.2, 2.5, 6.19],
    ]) {
      loft([
        { z: start, x: side * frontX, bottom: roofY - .21, top: roofY + .14, width: frontW, bevel: .12 },
        { z: end, x: side * rearX, bottom: roofY - .42, top: roofY - .08, width: rearW, bevel: .12 },
      ], 'armor');
    }
    // Low side service nacelles hang clear of the central launch throat.
    loft([
      { z: -21.4, x: side * 10, bottom: -.66, top: 2.33, width: 1.45, bevel: .42 },
      { z: -13.5, x: side * 10.66, bottom: -1.0, top: 2.5, width: 2.9, bevel: .7 },
      { z: -3.1, x: side * 10.5, bottom: -.8, top: 2.04, width: 2.62, bevel: .61 },
      { z: 1.7, x: side * 8.72, bottom: -.34, top: 1.14, width: 1.2, bevel: .31 },
    ], 'slate');
    loft([
      { z: -20.1, x: side * 10.0, bottom: 2.24, top: 2.51, width: 1.47, bevel: .1 },
      { z: -13.3, x: side * 10.61, bottom: 2.37, top: 2.7, width: 2.22, bevel: .12 },
      { z: -3.6, x: side * 10.48, bottom: 1.94, top: 2.25, width: 1.82, bevel: .12 },
    ], 'armor');
    for (let z = -17; z < -3; z += 1.25) {
      box(side * 12.09, .64, z, .035, .86, .67, 'dark');
      box(side * 12.11, .67, z, .045, .57, .075, 'trim');
    }
    // Shoulder inset and a tiny navigation strip, instead of broad glow panels.
    loft([
      { z: -13.8, x: side * 8.56, bottom: 4.75, top: 5.12, width: .52, bevel: .12 },
      { z: -5.4, x: side * 9.45, bottom: 4.77, top: 5.14, width: .52, bevel: .12 },
    ], 'dark');
    beam([side * 9.38, 5.18, -7.2], [side * 9.2, 5.18, -9.0], .055, .065, 'cyan');

    // The split launch deck extends ahead of the bay, leaving a clear center.
    loft([
      { z: 8.6, x: side * 5.92, bottom: -.72, top: -.02, width: 2.08, bevel: .24 },
      { z: 13.5, x: side * 6.16, bottom: -.49, top: -.02, width: 1.77, bevel: .18 },
      { z: 17.1, x: side * 6.57, bottom: -.23, top: -.02, width: .45, bevel: .09 },
    ], 'slate');
    loft([
      { z: 9.1, x: side * 5.93, bottom: -.02, top: .075, width: 1.76, bevel: .025 },
      { z: 13.45, x: side * 6.16, bottom: -.02, top: .075, width: 1.48, bevel: .025 },
      { z: 16.7, x: side * 6.54, bottom: -.02, top: .075, width: .26, bevel: .025 },
    ], 'armor');
    beam([side * 5.17, .087, 10.35], [side * 5.57, .087, 14.0], .07, .027, 'dark');
    for (let z = 10.6; z <= 14.2; z += .9) {
      const x = side * (5.14 + (z - 10.35) * .11);
      box(x, .11, z, .055, .027, .3, 'cyan');
    }
    box(side * 6.45, .13, 15.2, .12, .035, .3, 'amber');

    // Aft engines are layered octagonal nozzles, recessed into the ship. Their
    // luminous cores are small enough to read as machinery, not light boxes.
    for (const [x, y, radius] of [[side * 4.7, 1.74, 1.08], [side * 8.4, .88, .68]]) {
      const back = x === side * 4.7 ? -25.6 : -22.2;
      loft([
        { z: back - .75, x, bottom: y - radius, top: y + radius, width: radius * 2, bevel: radius * .58 },
        { z: back + 1.75, x, bottom: y - radius * 1.08, top: y + radius * 1.08, width: radius * 2.16, bevel: radius * .65 },
      ], 'trim', true);
      const outer = outline(x, y - radius, y + radius, radius * 2, radius * .58, back - .77);
      const inner = outline(x, y - radius * .77, y + radius * .77, radius * 1.54, radius * .44, back - .79);
      // Rear-facing geometry has the opposite winding to the forward portal.
      rim(outer.slice().reverse(), inner.slice().reverse(), 'armor');
      const core = outline(x, y - radius * .56, y + radius * .56, radius * 1.12, radius * .32, back - .5);
      add(polygonGeometry([core.slice().reverse()]), 'cyan');
      for (let i = -1; i <= 1; i++) box(x + i * radius * .36, y, back - .83, .04, radius * 1.24, .055, 'dark');
    }
  }

  // Recessed launch portal: three armor steps and an inner dark throat. The
  // octagonal corners never enter x ±4.5 / y 0…5, including during docking.
  const outerBack = outline(0, -1.02, 6.45, 12.6, .93, 8.94);
  const outerFront = outline(0, -.8, 6.16, 12.25, .85, 10.1);
  const throat = outline(0, -.16, 5.59, 9.86, .42, 9.15);
  const innerFront = outline(0, -.16, 5.59, 9.86, .42, 10.11);
  rim(outerFront, innerFront, 'armor');
  rim(outerBack, outerFront, 'slate');
  rim(innerFront, throat, 'dark');
  const narrowOuter = outline(0, -.095, 5.51, 9.68, .4, 9.5);
  rim(throat, narrowOuter, 'trim');
  for (const side of [-1, 1]) {
    box(side * 4.941, 2.58, 10.128, .055, 3.97, .045, 'cyan');
    box(side * 5.88, 2.55, 10.119, .16, 1.73, .055, 'dark');
    for (let y = .87; y <= 4.4; y += 1.15) {
      box(side * 5.73, y, 10.14, .43, .065, .035, 'trim');
      box(side * 5.73, y + .135, 10.141, .43, .025, .036, 'slate');
    }
    for (let i = 0; i < 3; i++) box(side * (5.09 + i * .17), 5.65, 10.13, .08, .17, .025, 'amber', side * -.32);
    box(side * 2.45, 5.624, 10.14, 1.25, .045, .04, 'cyan');
  }
  // Unobtrusive identifier: two dark vertical marks on the launch collar.
  box(-.14, 5.866, 10.14, .055, .24, .02, 'trim');
  box(.02, 5.866, 10.14, .055, .24, .02, 'trim');

  // Command island with a wraparound visor and a fin/spine rather than a box
  // stacked on a box. It steps down toward the launch portal.
  loft([
    { z: -20.8, bottom: 5.41, top: 6.18, width: 2.2, bevel: .26 },
    { z: -13.4, bottom: 6.32, top: 7.36, width: 4.75, bevel: .4 },
    { z: -6.2, bottom: 6.36, top: 7.1, width: 3.6, bevel: .27 },
    { z: -.5, bottom: 6.19, top: 6.51, width: 1.4, bevel: .11 },
  ], 'trim');
  loft([
    { z: -16.5, bottom: 6.5, top: 8.46, width: 2.9, bevel: .32 },
    { z: -12.8, bottom: 6.65, top: 8.58, width: 4.75, bevel: .48 },
    { z: -9.4, bottom: 6.85, top: 8.18, width: 3.8, bevel: .32 },
  ]);
  loft([
    { z: -13.85, bottom: 7.68, top: 8.06, width: 5.0, bevel: .13 },
    { z: -9.13, bottom: 7.61, top: 7.99, width: 3.94, bevel: .13 },
  ], 'glass');
  loft([
    { z: -14.05, bottom: 8.11, top: 8.42, width: 5.1, bevel: .11 },
    { z: -9.0, bottom: 8.04, top: 8.31, width: 4.2, bevel: .11 },
  ], 'armor');
  for (const x of [-1.35, -.45, .45, 1.35]) box(x, 7.77, -9.114, .045, .34, .06, 'trim');
  loft([
    { z: -18.6, bottom: 5.85, top: 6.7, width: .45, bevel: .1 },
    { z: -16.3, bottom: 6.04, top: 9.55, width: .35, bevel: .09 },
    { z: -14.8, bottom: 6.57, top: 9.31, width: .28, bevel: .07 },
  ], 'slate');
  box(0, 9.6, -16.3, .085, .12, .17, 'cyan');
  // Small service hatches and grouped radiator ribs make roof scale legible.
  for (const side of [-1, 1]) {
    for (let z = -12.8; z < -5.4; z += .55) box(side * 5.1, 6.94 - (z + 14.2) * .024, z, 2.26, .025, .18, 'trim');
    for (let z = -2.8; z <= 1; z += 1.9) {
      box(side * 4.15, 6.6 - (z + 4.75) * .026, z, 1.04, .055, 1.0, 'trim');
      box(side * 4.15, 6.63 - (z + 4.75) * .026, z, .82, .04, .8, 'slate');
    }
    for (let z = 4.4; z <= 7.6; z += 1.6) box(side * 3.8, 6.31 - (z - 3.72) * .044, z, 1.6, .024, .035, 'trim');
  }

  let triangles = 0;
  for (const [key, pieces] of batches) {
    if (!pieces.length) continue;
    const vertices = new Float32Array(pieces.reduce((sum, geometry) => sum + geometry.getAttribute('position').array.length, 0));
    const normals = new Float32Array(vertices.length);
    let offset = 0;
    for (const geometry of pieces) {
      const source = geometry.getAttribute('position').array;
      vertices.set(source, offset);
      normals.set(geometry.getAttribute('normal').array, offset);
      offset += source.length;
      geometry.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, palettes[key]);
    mesh.name = `Carrier / ${key}`;
    // Exterior lights are unshadowed; avoid introducing sun shadows into the bay.
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    carrier.add(mesh);
    triangles += vertices.length / 9;
  }
  carrier.userData.geometryStats = { triangles, drawCalls: carrier.children.length };
  carrier.userData.clearCorridor = { min: [-4.5, 0, 9.2], max: [4.5, 5, 18] };
  return carrier;
}
