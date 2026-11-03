// Keep classic-script ordering identical in browsers, VM fixtures and Git comparisons.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '../..');
const isRaceFile = file => /^js\/race3d(?:\/[^/]+)?\.js$/.test(file);
function read(file, ref) {
  return ref ? execFileSync('git', ['show', `${ref}:${file}`], {cwd:ROOT,encoding:'utf8',maxBuffer:20e6})
    : fs.readFileSync(path.join(ROOT,file),'utf8');
}
function raceFiles(ref) {
  return [...read('index.html',ref).matchAll(/<script src="(js\/race3d(?:\/[^"/]+)?\.js)"><\/script>/g)].map(m=>m[1]);
}
function sponsorFiles(ref) {return [...read('index.html',ref).matchAll(/<script src="(js\/(?:sponsor[^"]+|car-appearance)\.js)"><\/script>/g)].map(m=>m[1]);}
function snapshot(ref) {
  const files = ['js/data.js',...sponsorFiles(ref),'js/game.js','js/race.js',...raceFiles(ref),'js/ui.js'];
  return Object.fromEntries(files.map(file=>[file,read(file,ref)]));
}
function entries(files, baseline = null) {
  const sources = baseline && typeof baseline==='object' ? baseline : null;
  // Old snapshots contain the complete engine in one file. Never fill a
  // missing historical extension with a working-tree script.
  const support=sources?Object.keys(sources).filter(f=>/^js\/(?:sponsor|car-appearance)/.test(f)):sponsorFiles(baseline);
  const bundle = sources ? Object.keys(sources).filter(isRaceFile) : raceFiles(baseline);
  return files.flatMap(file=>file==='js/race3d.js'?bundle:file==='js/game.js'?[...support,file]:[file]).map(file=>{
    if(sources && !Object.hasOwn(sources,file)) throw new Error(`Missing snapshot source: ${file}`);
    return [file,sources ? sources[file] : read(file,baseline)];
  });
}
async function routeRace(page, ref) {
  const sources = Object.fromEntries(raceFiles(ref).map(file=>[file,read(file,ref)]));
  // Current pages may request extensions that do not exist in the old bundle.
  await page.route(/\/js\/race3d(?:\/[^/?]+)?\.js(?:\?.*)?$/, route=>{
    const file = new URL(route.request().url()).pathname.slice(1);
    return route.fulfill({body:sources[file] || '',contentType:'application/javascript'});
  });
}
module.exports = {entries,snapshot,raceFiles,routeRace};
