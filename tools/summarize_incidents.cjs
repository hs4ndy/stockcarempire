const fs=require('node:fs');
const final=JSON.parse(fs.readFileSync('.impeccable/review/incidents102.json'));
if(final.completed!==45 || final.total!==45) throw new Error('Run node tools/measure_incidents.cjs to completion first.');
const rows=final.rows;
const cols=['series','diff','seed','done','aiCrashes','playerCrashes','playerHealth','finish'];
fs.mkdirSync('docs',{recursive:true});fs.writeFileSync('docs/incidents-v102.csv',cols.join(',')+'\n'+rows.map(r=>cols.map(c=>r[c]).join(',')).join('\n')+'\n');
console.log(JSON.stringify({races:rows.length,aiWreckRaces:rows.filter(r=>r.aiCrashes>0).length,playerWreckRaces:rows.filter(r=>r.playerCrashes>0).length,unfinished:rows.filter(r=>!r.done).length,errors:rows.filter(r=>r.error).length}));
for(const s of ['grassroots','challenger','premier']){const a=rows.filter(r=>r.series===s);console.log(s,a.filter(r=>r.aiCrashes>0).length+'/'+a.length);}
