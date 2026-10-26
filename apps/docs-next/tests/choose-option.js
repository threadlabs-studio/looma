/** Choose through the actual popup; native selects retain their browser interaction. */
export async function chooseOption(field, value) {
  if (await field.evaluate(element => element.tagName === 'SELECT')) return field.selectOption(value);
  field = await field.evaluate(element => element.matches('input[role=combobox]')) ? field : field.getByRole('combobox');
  const owner = field.locator('xpath=ancestor::*[@data-choice][1]');
  const label = await owner.locator(`option[value=${JSON.stringify(value)}]`).textContent();
  await field.click();
  await field.fill('');
  await owner.getByRole('option', { name: label, exact: true }).click();
}

/** Navigate as a reader does: leave the current editor before opening another. */
export async function openEditor(page, family) {
  const target = page.locator(`[data-refinement-view="${family}"]`);
  if (await target.isVisible()) return target;
  const current = page.locator('[data-refinement-view]:visible');
  if (await current.count()) await current.locator('[data-action="back"]').click();
  await page.locator(`[data-action="refine-${family}"]`).click();
  return target;
}

export async function chooseStartingPoint(page, value) {
  const editor = await openEditor(page, 'themes');
  await chooseOption(editor.getByRole('combobox', { name: 'Starting point', exact: true }), value);
  await editor.locator('[data-action="back"]').click();
}

export async function setBaseColor(page, label, value) {
  const editor = await openEditor(page, 'palette');
  await editor.getByRole('button', { name: `${label} colour picker`, exact: true }).click();
  const hex = editor.getByRole('textbox', { name: 'Hex colour', exact: true });
  await hex.fill(value);
  await hex.press('Enter');
  await hex.press('Escape');
}

export async function chooseRefinement(page, family, value) {
  const editor = await openEditor(page, family);
  await chooseOption(editor.getByRole('combobox', { name: `${family === 'palette' ? 'Palette' : 'Material'} preset`, exact: true }), value);
}

/** WebKit's driver misses intercepted Navigation API commits even when the document updates. */
export async function followDocumentationLink(page, link, heading) {
  const destination = await link.evaluate(element => element.href);
  await link.click({noWaitAfter:true});
  await page.waitForFunction(({destination,heading}) => location.href === destination && document.querySelector('h1')?.textContent.trim() === heading, {destination,heading});
  if (page.context().browser().browserType().name() === 'webkit') await page.goto(destination);
}
