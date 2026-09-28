// Supersample small displays and honor Retina density without unbounded GPU buffers.
export function renderResolution({width,height,dpr=1,compact=false,maxDimension=8192}) {
  width=Math.max(1,Math.floor(width));height=Math.max(1,Math.floor(height));
  const density=Number.isFinite(dpr)&&dpr>0?dpr:1;
  const desired=compact?Math.min(2.5,Math.max(2,density)):Math.min(3,Math.max(2,density*1.25));
  const budget=compact?4_000_000:12_000_000;
  const ratio=Math.min(desired,Math.sqrt(budget/(width*height)),maxDimension/width,maxDimension/height);
  return {width,height,ratio,pixelWidth:Math.max(1,Math.floor(width*ratio)),pixelHeight:Math.max(1,Math.floor(height*ratio))};
}

export function improveTextureFiltering(root,anisotropy) {
  const seen=new Set();
  root.traverse(object=>{
    if(!object.isMesh)return;
    for(const material of Array.isArray(object.material)?object.material:[object.material]){
      for(const value of Object.values(material)){
        if(!value?.isTexture||seen.has(value))continue;
        seen.add(value);value.anisotropy=anisotropy;value.needsUpdate=true;
      }
    }
  });
  return seen.size;
}
