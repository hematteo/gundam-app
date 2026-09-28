import * as THREE from 'three';

// Keep real light/shadow response and metallic reflections, but group the
// armor's diffuse light into the broad value shapes used in cel animation.
export const illumination = {value: 1};

export function finishArmor(material) {
  const name = material.name.toLowerCase();
  const metal = /gold|gunmetal/.test(name);
  material.envMapIntensity = metal ? 1.05 : .32;
  material.userData.outlineParameters = {
    thickness: .00115, color: [.009, .016, .035], keepAlive: true,
    visible: !name.includes('sensor'),
  };
  if (name.includes('white')) {material.color.set('#e5e9e5'); material.roughness = .48; material.metalness = .02;}
  if (name.includes('cobalt')) {material.color.set('#235dc7'); material.roughness = .36; material.metalness = .07;}
  if (name.includes('red armor')) {material.color.set('#c92842'); material.roughness = .42; material.metalness = .04;}
  if (name.includes('gray armor')) {material.color.set('#8eabba'); material.roughness = .52; material.metalness = .08;}
  if (name.includes('gold')) {material.roughness = .3; material.metalness = .88;}
  if (name.includes('gunmetal')) {material.roughness = .47; material.metalness = .7;}
  if (name.includes('sensor')) {material.emissiveIntensity = 1.6;}
  // Retain the normal maps and painted face/cockpit details from the asset.
  material.normalScale?.setScalar(.72);
  material.onBeforeCompile = shader => {
    shader.uniforms.bayIllumination = illumination;
    shader.fragmentShader = 'uniform float bayIllumination;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
      `
      vec3 celIrradiance = totalDiffuse / max(diffuseColor.rgb, vec3(0.025));
      float value = dot(celIrradiance, vec3(0.2126, 0.7152, 0.0722));
      // A narrow transition between bands keeps moving shadows stable.
      float band = 0.12 + 0.22 * smoothstep(0.16, 0.20, value)
                        + 0.35 * smoothstep(0.38, 0.44, value)
                        + 0.40 * smoothstep(0.80, 0.88, value);
      vec3 tint = mix(vec3(0.53, 0.66, 0.96), vec3(1.04, 1.01, 0.95),
                      smoothstep(0.16, 0.72, value));
      vec3 painted = diffuseColor.rgb * band * tint * (0.30 + 0.70 * bayIllumination);
      float celWeight = (1.0 - metalnessFactor) * 0.86;
      vec3 outgoingLight = mix(totalDiffuse, painted, celWeight)
                         + totalSpecular + totalEmissiveRadiance;
      `,
    );
  };
  material.customProgramCacheKey = () => 'seed-armor-cel-v1';
}

export function finishHangar(material) {
  const name = material.name.toLowerCase();
  material.envMapIntensity = .30;
  material.userData.outlineParameters = {visible: false};
  if (name.includes('lighting')) return;
  // Low-frequency paint variation, not random dirt over every surface.
  // Object-local coordinates keep the finish attached to each mesh.
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vPaintPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvPaintPosition = position;');
    shader.fragmentShader = 'varying vec3 vPaintPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      float paintVariation = sin(vPaintPosition.x * 7.1 + vPaintPosition.z * 3.2)
                           * sin(vPaintPosition.y * 5.3 - vPaintPosition.z * 2.1);
      roughnessFactor = clamp(roughnessFactor + paintVariation * 0.065, 0.25, 0.95);
      diffuseColor.rgb *= 0.96 + paintVariation * 0.04;
    `);
  };
  material.customProgramCacheKey = () => 'seed-hangar-paint-v1';
}

// A compact reflection studio matching the actual lamp directions and room
// palette. Bright cards create readable gold highlights without a new HDR file.
export function createHangarReflections(renderer) {
  const studio = new THREE.Scene();
  const shellMaterial = new THREE.MeshBasicMaterial({color: '#1f2948', side: THREE.BackSide});
  const shell = new THREE.Mesh(new THREE.BoxGeometry(12, 10, 16), shellMaterial);
  studio.add(shell);
  function card(position, size, color, intensity, target) {
    const material = new THREE.MeshBasicMaterial({color, side: THREE.DoubleSide});
    material.color.multiplyScalar(intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(...size), material);
    mesh.position.set(...position); mesh.lookAt(...target); studio.add(mesh);
  }
  card([1.5, 4.6, .3], [1.3, 3.5], '#fff1d7', 6, [0, 0, 0]);
  card([-3.6, 2, 1], [1.1, 4], '#9ebaff', 3, [0, 0, 0]);
  card([0, 3.4, -3], [4, .6], '#a4ddff', 5, [0, 0, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const result = pmrem.fromScene(studio, .025, .1, 30);
  studio.traverse(o => {if(o.isMesh){o.geometry.dispose();o.material.dispose();}});
  pmrem.dispose();
  return result;
}

// Soft contact reinforcement under the two boots, independent of the moving
// directional shadows. This is an artistic grounding aid, not baked AO.
export function addBootContacts(scene, legBounds, padHeight) {
  const group=new THREE.Group();group.name='Docked boot contact shadows';scene.add(group);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(64,64,12,64,64,62);
  gradient.addColorStop(0, 'rgba(4,9,23,0.75)');
  gradient.addColorStop(.50, 'rgba(4,9,23,0.36)');
  gradient.addColorStop(1, 'rgba(4,9,23,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0,0,128,128);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
  material.userData.outlineParameters = {visible:false};
  for (const bound of legBounds) {
    const center = bound.getCenter(new THREE.Vector3());
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(.64,.70),material);
    contact.rotation.x = -Math.PI/2;
    contact.position.set(center.x,padHeight+.001,center.z+.08);
    contact.renderOrder = 1;
    group.add(contact);
  }
  return group;
}
