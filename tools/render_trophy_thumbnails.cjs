// Six static thumbnails rendered from the exact Blender-exported game meshes.
const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 if(process.argv.includes('--pack-only')){
  const images={};for(const file of fs.readdirSync('assets/trophies').filter(f=>f.endsWith('.png')).sort())images[path.basename(file,'.png')]='data:image/png;base64,'+fs.readFileSync(path.join('assets/trophies',file)).toString('base64');
  fs.writeFileSync('assets/trophies/trophy-thumbnails.js','// Generated from original Blender geometry by tools/render_trophy_thumbnails.cjs.\nconst SC_TROPHY_THUMBNAILS = '+JSON.stringify(images)+';\n');console.log('Packed',Object.keys(images).length,'existing trophy thumbnails.');return;
 }
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:480,height:400},deviceScaleFactor:1});
  await page.setContent('<style>body{margin:0}#stage{width:480px;height:400px}</style><div id="stage"></div>');
  for(const file of ['node_modules/three/build/three.min.js','assets/trophies/trophy-models.js','js/trophy-case.js'])await page.addScriptTag({path:path.resolve(file)});
  const keys=await page.evaluate(()=>Object.keys(SC_TROPHY_MODELS)),images={};
  for(const key of keys){
   const data=await page.evaluate(key=>{const stage=createTrophyStage(document.getElementById('stage'),key);stage.draw();const png=stage.renderer.domElement.toDataURL('image/png');stage.dispose();return png;},key);
   images[key]=data;fs.writeFileSync(`assets/trophies/${key}.png`,Buffer.from(data.split(',')[1],'base64'));
  }
  fs.writeFileSync('assets/trophies/trophy-thumbnails.js','// Generated from original Blender geometry by tools/render_trophy_thumbnails.cjs.\nconst SC_TROPHY_THUMBNAILS = '+JSON.stringify(images)+';\n');
  console.log('Rendered',keys.length,'trophy thumbnails.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
