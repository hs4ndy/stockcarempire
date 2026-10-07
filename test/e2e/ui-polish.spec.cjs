const path = require('node:path');
const { test, expect } = require('playwright/test');

for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['mobile', { width: 375, height: 812 }],
]) {
  test(`menu choices work by keyboard and long career names fit (${name})`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.route('**/three.min.js', route => route.fulfill({
      path: path.resolve(__dirname, '../../node_modules/three/build/three.min.js'),
      contentType: 'application/javascript',
    }));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await page.locator('#btn-quick-race').click();
    const quick = page.locator('#quick-race-modal .difficulty-card').nth(1);
    await quick.focus();
    await page.keyboard.press('Space');
    await expect(quick).toHaveAttribute('aria-pressed', 'true');
    await expect(quick).toBeFocused();
    await page.locator('#quick-race-modal .modal-close').click();

    await page.locator('#btn-start-new').click();
    await page.locator('#inp-team-name').fill('W'.repeat(40));
    await page.locator('#inp-driver-name').fill('W'.repeat(30));
    await page.locator('#inp-car-name').fill('W'.repeat(30));
    await page.locator('#btn-create-team').click();
    const setupChoice = page.locator('#setup-difficulty-grid .difficulty-card').nth(1);
    await setupChoice.focus();
    await page.keyboard.press('Enter');
    await expect(setupChoice).toHaveAttribute('aria-pressed', 'true');
    await expect(setupChoice).toBeFocused();
    await page.locator('#btn-begin-career').click();
    await page.locator('[data-tutorial-action="skip"]').click();
    await page.evaluate(() => document.getElementById('toast-container').replaceChildren());

    for (const tab of ['dashboard', 'garage', 'team', 'market', 'settings']) {
      await page.locator(`.nav-btn[data-tab="${tab}"]`).click();
      if (tab === 'garage') await page.getByText('Customize and manage car', { exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      if (tab === 'dashboard') {
        expect(await page.locator('.car-mini-row').first().evaluate(el => {
          const row = el.getBoundingClientRect();
          return [...el.children].every(child => child.getBoundingClientRect().right <= row.right);
        })).toBe(true);
      }
      if (tab === 'dashboard' || tab === 'garage' || tab === 'settings') {
        await page.screenshot({ path: testInfo.outputPath(`${tab}-${name}.png`), fullPage: true, animations: 'disabled' });
      }
    }
    const settingsChoice = page.locator('#main-content .difficulty-card').nth(2);
    await settingsChoice.focus();
    await page.keyboard.press('Space');
    await expect(settingsChoice).toHaveAttribute('aria-pressed', 'true');
    await expect(settingsChoice).toBeFocused();

    await page.locator('#btn-hdr-save').click();
    const failedSave = await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'QuotaExceededError'); };
      try {
        handleSaveToSlot(0);
        return { slot: currentSlot, dialogOpen: !!document.getElementById('save-slot-modal') };
      } finally {
        Storage.prototype.setItem = original;
      }
    });
    expect(failedSave).toEqual({ slot: null, dialogOpen: true });
    await expect(page.getByRole('alert')).toContainText('Saving could not be completed.');
    await expect(page.getByRole('status').filter({ hasText: 'Career saved to Slot' })).toHaveCount(0);
    await page.locator('[onclick="handleSaveToSlot(0)"]').click();
    await expect(page.locator('#main-content')).toContainText('Slot 1');
    await expect(page.locator('#main-content')).not.toContainText('Not saved yet');
    await page.locator('#btn-hdr-save').click();
    const slot = page.locator('.save-slot').first();
    await expect(slot.locator('.save-slot-info')).toContainText('W'.repeat(40));
    const slotFits = await slot.evaluate(el => {
      const row = el.getBoundingClientRect();
      return [...el.children].every(child => {
        const r = child.getBoundingClientRect();
        return r.left >= row.left && r.right <= row.right;
      });
    });
    expect(slotFits).toBe(true);
    await page.evaluate(() => document.getElementById('toast-container').replaceChildren());
    await page.screenshot({ path: testInfo.outputPath(`save-${name}.png`), fullPage: true, animations: 'disabled' });
    await page.locator('#save-slot-modal .modal-close').click();
    let newCareerWarning;
    page.once('dialog', async dialog => {
      newCareerWarning = dialog.message();
      await dialog.dismiss();
    });
    await page.locator('[onclick="handleNewGamePrompt()"]').click();
    expect(newCareerWarning).toContain('deletes your current career from Slot 1');
    expect(await page.evaluate(() => localStorage.getItem('sce_slot_0'))).not.toBeNull();
    await page.evaluate(() => document.body.insertAdjacentHTML('beforeend', renderPremierChoiceModal()));
    const careerChoice = page.getByRole('button', { name: /Become a Manager/ });
    await careerChoice.focus();
    await page.keyboard.press('Enter');
    await expect(careerChoice).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#btn-confirm-career')).toBeEnabled();
    expect(errors).toEqual([]);
  });
}
