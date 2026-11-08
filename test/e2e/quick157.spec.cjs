const {test,expect}=require('playwright/test');
const path=require('node:path'),{pathToFileURL}=require('node:url');

for(const [width,height,file] of [[2559,1262,'index.html'],[1440,900,'index.html'],[1024,600,'index.html'],[390,844,'releases/Stock-Car-Empire.html'],[844,390,'index.html']]){
 test(`Quick points use each race series and each player's participation ${width}`,async({page})=>{
  await page.setViewportSize({width,height});
  await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js')}));
  await page.goto(pathToFileURL(path.resolve(file)).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{
   quickRacePlayers=2;
   window.finishQuick157=(field,positions)=>{
    launch3DRace=(config,done)=>done(positions[0],positions.map((position,i)=>({isPlayer:true,entrantId:i?'player2':'player',number:i+1,teamColor:i?'#58a6ff':'#e8001d',position})),null,false,{startingPositions:{player:2,player2:3}});
    handleStartQuickRace(field);
   };
   window.finishQuick157(20,[1,20]);
  });
  expect(await page.evaluate(()=>quickRaceLastResult.players.map(p=>[p.totalPoints,p.races]))).toEqual([[37,1],[1,1]]);
  await expect(page.locator('.quick-result-points small').first()).toHaveText('Across 1 race');
  await page.getByRole('button',{name:'Change Settings',exact:true}).click();
  await page.getByRole('button',{name:'Close',exact:true}).click();
  expect(await page.evaluate(()=>quickRaceLastResult.players.map(p=>p.totalPoints))).toEqual([37,1]);
  await page.evaluate(()=>window.finishQuick157(26,[2,26]));
  expect(await page.evaluate(()=>quickRaceLastResult.players.map(p=>[p.totalPoints,p.races]))).toEqual([[70,2],[2,2]]);
  await page.evaluate(()=>{quickRacePlayers=1;window.finishQuick157(40,[40]);});
  expect(await page.evaluate(()=>quickRaceLastResult.players.map(p=>[p.totalPoints,p.races]))).toEqual([[74,3]]);
  await expect(page.locator('.quick-result-points small')).toHaveText('Across 3 races');
  await page.evaluate(()=>{quickRacePlayers=2;window.finishQuick157(40,[3,1]);});
  expect(await page.evaluate(()=>quickRaceLastResult.players.map(p=>[p.totalPoints,p.races]))).toEqual([[119,4],[62,3]]);
  await expect(page.locator('.quick-result-points').first()).toHaveText('Total points earnedAcross 4 races119');
  await expect(page.locator('.quick-result-points').last()).toHaveText('Total points earnedAcross 3 races62');
  await page.locator('.quick-result-player').last().scrollIntoViewIfNeeded();
  expect(await page.locator('.quick-result-points').evaluateAll(rows=>rows.every(row=>row.querySelector('dt').getBoundingClientRect().right<=row.querySelector('dd').getBoundingClientRect().left))).toBe(true);
  await page.screenshot({path:`.impeccable/review/quick157-results-${width}.png`});
  await page.getByRole('button',{name:'Main Menu',exact:true}).click();
  expect(await page.evaluate(()=>[...quickRacePoints,...quickRaceFinishes.map(f=>f.length)])).toEqual([0,0,0,0]);
  await page.evaluate(()=>{quickRacePlayers=1;window.finishQuick157(20,[20]);});
  expect(await page.evaluate(()=>quickRaceLastResult.players.map(p=>[p.totalPoints,p.races]))).toEqual([[1,1]]);
  await page.evaluate(()=>leaveQuickRaceResults());
 });
}
