// Images are preloaded from embedded data; no image-host or PNG URL requests.
const _hoodLogoImages=new Map(),_hoodLogoTextures=new Map();
for(const [id,data]of Object.entries(SC_HOOD_LOGOS)){const image=new Image();image.src=data;_hoodLogoImages.set(id,image);}
const aiSponsorPools = SERIES.map((_, series) => SPONSOR_CATALOG
  .filter(company => company.series === series && company.tier === 'primary' && _hoodLogoImages.has(company.id))
  .map(company => company.id));

function aiHoodSponsorId(seriesId, identity) {
  const pool = aiSponsorPools[SERIES.findIndex(series => series.id === seriesId)];
  if (!pool?.length) return null;
  let hash = 2166136261;
  for (const char of String(identity)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return pool[hash % pool.length];
}

function hoodLogoTexture(id,onReady){
 const image=_hoodLogoImages.get(id);if(!image)return null;
 let texture=_hoodLogoTextures.get(id);if(!texture){texture=new THREE.Texture(image);texture.encoding=THREE.sRGBEncoding;texture.anisotropy=1;_hoodLogoTextures.set(id,texture);if(image.complete&&image.naturalWidth)texture.needsUpdate=true;else image.addEventListener('load',()=>{texture.needsUpdate=true;},{once:true});}
 if(!image.complete&&onReady)image.addEventListener('load',onReady,{once:true});return texture;
}
