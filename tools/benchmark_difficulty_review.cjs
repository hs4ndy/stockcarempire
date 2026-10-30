const fs=require('fs');const {runRearStart}=require('../test/race-dynamics.test.js');const rows=[];
function run(label,seed,size,diff,strategy,options){const r=runRearStart(seed,size,diff,strategy,null,options);rows.push({label,seed,size,diff,strategy,...r});fs.writeFileSync('.impeccable/review/v93-comparisons.json',JSON.stringify(rows,null,2));}
for(const diff of ['beginner','amateur','semipro','pro','allout'])for(const seed of [3,17])run('quick',seed,26,diff,'managed',{quickRace:true,openingPace:true,playerPower:.75,seriesId:'challenger'});
for(const [seriesId,size]of [['grassroots',20],['premier',40]])run('quick',17,size,'allout','managed',{quickRace:true,openingPace:true,playerPower:.75,seriesId});
for(const seed of [3,17])for(const strategy of ['ride','managed'])run('front-teammates',seed,40,'pro',strategy,{frontTrain:true,teammates:3,playerPower:.99});
for(const [label,power]of [['career-stock',.5771527778],['career-upgraded',.99]])run(label,17,20,'pro','managed',{openingPace:true,playerPower:power,seriesId:'grassroots'});
console.log(JSON.stringify(rows));
