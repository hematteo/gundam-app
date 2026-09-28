import * as THREE from 'three';
import { createCarrierExterior } from './carrier-exterior.js?v=carrier-view-6';

const noiseGLSL=`
float hash(vec3 p){p=fract(p*.3183099+vec3(.11,.27,.37));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float clouds(vec3 p){return noise(p)*.5+noise(p*2.1)*.28+noise(p*4.3)*.14+noise(p*8.7)*.08;}
`;
const vertexShader=`varying vec3 vWorld;varying vec3 vNormalWorld;varying vec2 vUv;
void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;vNormalWorld=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*world;}`;

export function createSpaceEnvironment(scene){
  const group=new THREE.Group();group.name='Orbital exterior';scene.add(group);
  const texture=new THREE.TextureLoader().load('assets/space/earth-june-5400.jpg');
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
  const material=new THREE.ShaderMaterial({uniforms:{earthMap:{value:texture}},vertexShader,fragmentShader:`
    uniform sampler2D earthMap;varying vec3 vWorld;varying vec3 vNormalWorld;varying vec2 vUv;
    ${noiseGLSL}
    void main(){
      vec3 n=normalize(vNormalWorld),view=normalize(cameraPosition-vWorld);
      float daylight=smoothstep(-.22,.68,dot(n,normalize(vec3(-.7,.9,-.8))));
      vec3 ground=texture2D(earthMap,vUv).rgb;
      vec3 p=n*24.+vec3(2,8,3);
      vec3 warp=vec3(clouds(p*.4),clouds(p*.4+7.),clouds(p*.4+13.))*2.;
      float cloud=smoothstep(.51,.73,clouds(p+warp));
      vec3 surface=mix(ground*vec3(.7,.91,1.12),vec3(.76,.84,.94),cloud*.76);
      float rim=pow(1.-max(0.,dot(n,view)),3.);
      vec3 color=surface*(.045+daylight*.95)+vec3(.045,.23,.55)*rim*(.25+daylight);
      gl_FragColor=vec4(color,1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  material.userData.outlineParameters={visible:false};
  const earth=new THREE.Mesh(new THREE.SphereGeometry(135,128,64),material);
  earth.name='Earth / NASA Blue Marble';earth.position.set(-32,-133,220);earth.rotation.set(.12,2.4,-.14);group.add(earth);
  const atmosphereMaterial=new THREE.ShaderMaterial({vertexShader,transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,fragmentShader:`
    varying vec3 vWorld;varying vec3 vNormalWorld;varying vec2 vUv;
    void main(){vec3 n=normalize(vNormalWorld),v=normalize(cameraPosition-vWorld);float rim=pow(1.-abs(dot(n,v)),3.5);float sun=.3+.7*max(0.,dot(n,normalize(vec3(-.7,.9,-.8))));gl_FragColor=vec4(.12,.46,1.,rim*sun*.65);}
  `});
  atmosphereMaterial.userData.outlineParameters={visible:false};
  const atmosphere=new THREE.Mesh(new THREE.SphereGeometry(136.8,96,48),atmosphereMaterial);atmosphere.position.copy(earth.position);group.add(atmosphere);
  let seed=1945;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const positions=[],colors=[];
  for(let i=0;i<1700;i++){
    const y=random()*2-1,a=random()*Math.PI*2,r=Math.sqrt(1-y*y),d=700+random()*130;
    positions.push(Math.cos(a)*r*d,y*d,Math.sin(a)*r*d);
    const power=.24+random()*.6;colors.push(power*.8,power*.88,power);
  }
  const starsGeometry=new THREE.BufferGeometry();starsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));starsGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const starMaterial=new THREE.PointsMaterial({vertexColors:true,size:1.12,sizeAttenuation:true,transparent:true,opacity:.88,depthWrite:false,fog:false,toneMapped:false});
  starMaterial.userData.outlineParameters={visible:false};group.add(new THREE.Points(starsGeometry,starMaterial));
  group.add(createCarrierExterior());
  const sun=new THREE.DirectionalLight('#ffedd7',2.1);sun.position.set(-55,95,80);scene.add(sun);
  const bounce=new THREE.HemisphereLight('#9bbcff','#18294c',.75);scene.add(bounce);
  // Sunlight is introduced only outside, leaving the established hangar lighting intact.
  sun.intensity=0;bounce.intensity=0;
  return {update(exposure){sun.intensity=exposure*2.1;bounce.intensity=exposure*.75;}};
}
