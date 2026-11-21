async function chooseHomeAction(page, selector) {
  const action = page.locator(selector);
  if (!await action.isVisible()) {
    await page.getByRole('button', {name:'Single Player', exact:true}).click();
    if (selector !== '#btn-quick-race') await page.getByRole('button', {name:'Career Mode', exact:true}).click();
  }
  await action.click();
}
module.exports = {chooseHomeAction};
