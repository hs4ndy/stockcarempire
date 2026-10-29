const {test,expect}=require('playwright/test');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
for(const [name,file,width] of [['source','index.html',1440],['offline','releases/Stock-Car-Empire.html',375]]){
  test(`All-Out creates, persists and launches through shared difficulty controls (${name})`,async({page})=>{
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width,height:850});
    await page.route('**/three.min.js',r=>r.fulfill({path:path.resolve(__dirname,'../../node_modules/three/build/three.min.js')}));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../..',file)).href);
    await page.locator('#btn-start-new').click();
    await page.locator('#inp-team-name').fill('All Out Racing');await page.locator('#inp-driver-name').fill('Challenger');await page.locator('#inp-car-name').fill('Car');await page.locator('#btn-create-team').click();
    await expect(page.locator('#setup-difficulty-grid .difficulty-card')).toHaveCount(4);
    await expect(page.locator('#setup-difficulty-grid [data-diff="allout"]')).toHaveCount(0);
    const fillsRow=selector=>page.locator(selector).evaluate(el=>{
      const grid=el.parentElement.getBoundingClientRect(),box=el.getBoundingClientRect();return Math.abs(grid.width-box.width)<2;
    });
    await page.locator('#setup-difficulty-grid [data-diff="pro"]').click();
    await page.locator('#btn-begin-career').click();await page.locator('[data-tutorial-action="skip"]').click();
    expect(await page.evaluate(()=>game.difficulty)).toBe('pro');
    await page.evaluate(()=>showTab('settings'));
    await page.locator('#main-content [data-diff="allout"]').click();
    await page.evaluate(()=>saveToSlot(4));
    await expect(page.locator('#main-content [data-diff="allout"]')).toHaveAttribute('aria-pressed','true');
    expect(await fillsRow('#main-content [data-diff="allout"]')).toBe(true);
    await page.locator('#main-content [data-diff="beginner"]').click();
    // Restore a saved All-Out choice after an in-memory change, without auto-saving over it.
    await page.evaluate(()=>{game.difficulty='allout';saveToSlot(4);game.difficulty='beginner';loadFromSlot(4);showTab('settings');});
    await expect(page.locator('#main-content [data-diff="allout"]')).toHaveAttribute('aria-pressed','true');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(()=>document.getElementById('toast-container').replaceChildren());await page.waitForTimeout(240);
    await page.screenshot({path:`.impeccable/review/all-out-settings-${name}.png`,animations:'disabled'});
    await page.evaluate(()=>showScreen('intro'));await page.locator('#btn-quick-race').click();
    await page.locator('#quick-race-modal [data-diff="allout"]').click();await page.locator('.quick-series-btn').last().click();
    await expect(page.locator('#btn-quick-race-confirm')).toBeVisible();
    await page.mouse.move(0,0);await page.waitForTimeout(240);
    await expect(page.locator('#quick-race-modal [data-diff="allout"]')).toHaveAttribute('aria-pressed','true');
    expect(await fillsRow('#quick-race-modal [data-diff="allout"]')).toBe(true);
    await page.screenshot({path:`.impeccable/review/all-out-quick-${name}.png`,animations:'disabled'});
    await page.locator('#btn-quick-race-confirm').click();await page.waitForFunction(()=>window._r3d?.mirrorRT);
    expect(await page.evaluate(()=>window._r3d.diff.id)).toBe('allout');
    expect(await page.evaluate(()=>window._r3d.cars.length)).toBe(36);
    await page.evaluate(()=>window._r3d.destroy());expect(errors).toEqual([]);
  });
}
