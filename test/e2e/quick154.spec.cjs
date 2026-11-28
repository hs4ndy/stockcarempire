const {chooseHomeAction}=require('../helpers/home-menu.cjs');
const {test,expect}=require('playwright/test');
const path=require('path'),{pathToFileURL}=require('url');
for(const [width,height,file] of [[1440,900,'index.html'],[390,844,'releases/Stock-Car-Empire.html'],[844,390,'index.html']]){
test(`session averages and distance choices ${width}`,async({page})=>{
 await page.setViewportSize({width,height});await page.goto(pathToFileURL(path.resolve(file)).href);
 await page.evaluate(()=>document.fonts.ready);await chooseHomeAction(page,'#btn-quick-race');
 await expect(page.locator('#quick-race-length option')).toHaveText(['Short','Normal','Long']);
 await page.locator('#quick-race-length').selectOption('long');
 await page.evaluate(()=>{
   document.getElementById('quick-race-modal').remove();quickRacePlayers=2;
   launch3DRace=(config,done)=>done(4,[{isPlayer:true,entrantId:'player',number:1,teamColor:'#e8001d',position:4},{isPlayer:true,entrantId:'player2',number:2,teamColor:'#58a6ff',position:1}],null,false,{startingPositions:{player:2,player2:3}});
   handleStartQuickRace(20);
 });
 expect(await page.evaluate(()=>quickRaceLastResult.players.map(p=>p.averageFinish))).toEqual([4,1]);
 await page.evaluate(()=>{launch3DRace=(config,done)=>done(8,[{isPlayer:true,entrantId:'player',number:1,teamColor:'#e8001d',position:8},{isPlayer:true,entrantId:'player2',number:2,teamColor:'#58a6ff',position:4}],null,false,{startingPositions:{player:2,player2:3}});handleStartQuickRace(20);});
 expect(await page.evaluate(()=>quickRaceLastResult.players.map(p=>p.averageFinish))).toEqual([6,2.5]);
 await expect(page.locator('.quick-result-player').first()).toContainText('Average finish6.0');
 await page.locator('.quick-result-player').last().scrollIntoViewIfNeeded();await page.screenshot({path:`.impeccable/review/quick154-results-${width}.png`});
 await page.evaluate(()=>{quickRacePlayers=1;launch3DRace=(config,done)=>done(3,[{isPlayer:true,entrantId:'player',number:1,teamColor:'#e8001d',position:3}],null,false,{startingPositions:{player:2}});handleStartQuickRace(20);});
 expect(await page.evaluate(()=>quickRaceLastResult.players.map(p=>p.averageFinish))).toEqual([5]);
 expect(await page.evaluate(()=>quickRaceFinishes[1])).toEqual([1,4]);
 await page.evaluate(()=>leaveQuickRaceResults());
 expect(await page.evaluate(()=>quickRaceFinishes.map(f=>f.length))).toEqual([0,0]);
});}
