async function chooseHomeAction(page, selector) {
  const action = page.locator(selector);
  if (!await action.isVisible()) {
    await page.getByRole('button', {name:selector === '#btn-dual-race' ? 'Multiplayer' : 'Single Player', exact:true}).click();
    if (selector === '#btn-start-new' || selector === '#btn-load-game') await page.getByRole('button', {name:'Career Mode', exact:true}).click();
  }
  await action.click();
}
module.exports = {chooseHomeAction};
