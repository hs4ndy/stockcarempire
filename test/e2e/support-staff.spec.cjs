const {test,expect}=require('playwright/test'),path=require('path'),{pathToFileURL}=require('url');
for(const [width,file]of [[1440,'index.html'],[390,'releases/Stock-Car-Empire.html']])test(`named staffing hiring and benefits ${width}`,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width,height:950});
 await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve('node_modules/three/build/three.min.js'),contentType:'application/javascript'}));
 await page.goto(pathToFileURL(path.resolve(file)).href);
 await page.evaluate(()=>{newGame('Staff Racing','Driver','Car');game.tutorial.status='skipped';game.money=1000000;enterGame();showTab('team');showTeamView('staff');});
 await expect(page.locator('[data-staff-candidate]')).toHaveCount(25);
 await page.locator('#staff-role-filter').selectOption('mechanic');await expect(page.locator('[data-staff-candidate]')).toHaveCount(5);
 const byron=page.locator('[data-staff-candidate="mechanic03"]');await expect(byron).toContainText('Byron Hill');await expect(byron).toContainText('79 OVR');await expect(byron).toContainText('25% repair discount');
 await byron.getByRole('button',{name:'Hire Byron Hill',exact:true}).click();await expect(page.locator('.team-roster')).toContainText('Byron Hill');await expect(page.locator('[data-staff-candidate="mechanic03"]')).toHaveCount(0);
 await page.locator('#staff-role-filter').selectOption('data_analyst');await page.getByRole('button',{name:'Hire Avery Chen',exact:true}).click();
 expect(await page.evaluate(()=>tierCapacity()-MAX_PER_TIER)).toBe(2);await expect(page.locator('.team-roster')).toContainText('95 OVR');
 await page.locator('#staff-role-filter').selectOption('all');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo(0,0);});await page.waitForTimeout(4200);
 await page.screenshot({path:`.impeccable/review/support-staff-114-${width}.png`,fullPage:true});
 await page.evaluate(()=>{saveToSlot(0);game=null;loadFromSlot(0);enterGame();showTab('team');showTeamView('staff');});
 await expect(page.locator('.team-roster')).toContainText('Avery Chen');expect(await page.evaluate(()=>tierCapacity()-MAX_PER_TIER)).toBe(2);
 page.once('dialog',d=>d.accept());await page.locator('.team-roster .staff-row').filter({hasText:'Avery Chen'}).getByRole('button',{name:'Release Staff'}).click();expect(await page.evaluate(()=>tierCapacity()-MAX_PER_TIER)).toBe(0);
 await page.locator('#staff-role-filter').selectOption('crew_chief');await page.getByRole('button',{name:'Hire Marcus Reed',exact:true}).click();await expect(page.locator('[data-staff-candidate="chief05"] button')).toBeDisabled();
 await page.evaluate(()=>{game.money=0;renderTab('team');});await page.locator('#staff-role-filter').selectOption('engineer');await expect(page.locator('[data-staff-candidate="engineer05"] button')).toHaveText('Not Enough Cash');
 expect(errors).toEqual([]);
});
test('legacy staff contract remains unchanged after named migration',async({page})=>{
 await page.goto('/');await page.evaluate(()=>{newGame('Legacy Team','Driver','Car');game.tutorial.status='skipped';game.staff=[{id:'old-hire',typeId:'mechanic',name:'Senior Mechanic',weeklyCost:777}];saveToSlot(0);game=null;loadFromSlot(0);enterGame();showTab('team');showTeamView('staff');});
 await expect(page.locator('.team-roster')).toContainText('Byron Hill');await expect(page.locator('.team-roster')).toContainText('$777 per race');await expect(page.locator('.team-roster')).toContainText('25% repair discount');
});
