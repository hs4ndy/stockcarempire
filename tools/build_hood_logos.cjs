const fs = require('node:fs');
function readAsset(name) {
  const source = fs.readFileSync('assets/cars/' + name + '.js', 'utf8');
  return JSON.parse(source.slice(source.indexOf('{'),source.lastIndexOf('}')+1));
}
const out = {};
for (const [key,name] of [['grassroots','legacy-stock-car-model'],['gen7','stock-car-model']]) {
  const p = readAsset(name).parts.paint;
  // Project onto the visible SC-01 clip, including the revised top of the hood.
  if (key === 'grassroots') {
    const detail = readAsset('body-finishes').grassroots.paint;
    const offset = p.position.length / 3;
    p.index = detail.baseIndexRanges.flatMap(([a,b]) => p.index.slice(a,b)).concat(detail.index.map(i => i+offset));
    p.position = p.position.concat(detail.position);
  }
let position=[],uv=[],index=[];function clip(poly,a,t,g){const result=[];for(let i=0;i<poly.length;i++){const x=poly[i],y=poly[(i+1)%poly.length],ix=g?x[a]>=t:x[a]<=t,iy=g?y[a]>=t:y[a]<=t;if(ix)result.push(x);if(ix!==iy){const f=(t-x[a])/(y[a]-x[a]);result.push(x.map((v,j)=>v+(y[j]-v)*f));}}return result;}
for(let i=0;i<p.index.length;i+=3){let poly=p.index.slice(i,i+3).map(n=>p.position.slice(n*3,n*3+3));const [a,b,c]=poly,u=b.map((v,j)=>v-a[j]),v=c.map((q,j)=>q-a[j]),ny=u[2]*v[0]-u[0]*v[2],norm=Math.hypot(u[1]*v[2]-u[2]*v[1],ny,u[0]*v[1]-u[1]*v[0]);if(Math.abs(ny)/norm<.65||Math.min(...poly.map(p=>p[1]))<.5)continue;for(const [a,t,g]of [[0,-.77,true],[0,.77,false],[2,.95,true],[2,1.8,false]])poly=clip(poly,a,t,g);for(let k=1;k<poly.length-1;k++)for(const q of [poly[0],poly[k],poly[k+1]]){index.push(position.length/3);position.push(q[0],q[1]+.012,q[2]);uv.push((q[0]+.77)/1.54,(1.8-q[2])/.85);}}
out[key]={position,uv,index};}fs.writeFileSync('assets/cars/hood-logo-meshes.js','const SC_HOOD_LOGO_MESHES = '+JSON.stringify(out)+';\n');console.log(Object.fromEntries(Object.entries(out).map(([k,v])=>[k,v.index.length/3])));
