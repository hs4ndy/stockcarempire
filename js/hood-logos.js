// Images are preloaded from embedded data; no image-host or PNG URL requests.
const _hoodLogoImages=new Map(),_hoodLogoTextures=new Map();
for(const [id,data]of Object.entries(SC_HOOD_LOGOS)){const image=new Image();image.src=data;_hoodLogoImages.set(id,image);}
function hoodLogoTexture(id,onReady){
 const image=_hoodLogoImages.get(id);if(!image)return null;
 let texture=_hoodLogoTextures.get(id);if(!texture){texture=new THREE.Texture(image);texture.encoding=THREE.sRGBEncoding;texture.anisotropy=1;_hoodLogoTextures.set(id,texture);if(image.complete&&image.naturalWidth)texture.needsUpdate=true;else image.addEventListener('load',()=>{texture.needsUpdate=true;},{once:true});}
 if(!image.complete&&onReady)image.addEventListener('load',onReady,{once:true});return texture;
}
