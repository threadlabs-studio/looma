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

/** Navigate through the persistent toolbar, including its utility menu. */
export async function openEditor(page, family) {
  const target = page.locator(`[data-refinement-view="${family}"]`);
  if (await target.isVisible()) return target;
  if (['components','export'].includes(family)) await page.getByRole('button', {name:'Theme tools',exact:true}).click();
  await page.locator(`[data-action="refine-${family}"]`).click();
  return target;
}

export async function chooseStartingPoint(page, value) {
  const editor = page.locator('[data-customizer-summary]');
  await chooseOption(editor.getByRole('combobox', { name: 'Starting point', exact: true }), value);
}

/** FontFaceSet.ready can resolve before a theme's imported stylesheet registers its faces. */
export async function waitForThemeFonts(page) {
  await page.waitForFunction(() => {
    const families = Object.values(window[Symbol.for('looma.documentation.theme')].recipe.fonts ?? {});
    return families.every(family => [...document.fonts].some(face => face.family.replace(/^["']|["']$/g, '') === family));
  });
  await page.evaluate(async () => {
    const families = Object.values(window[Symbol.for('looma.documentation.theme')].recipe.fonts ?? {});
    await Promise.all(families.map(family => document.fonts.load(`400 16px ${JSON.stringify(family)}`)));
    await document.fonts.ready;
  });
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

export async function openOverview(page) {
  await page.getByRole('button', {name:'Theme tools',exact:true}).click();
  await page.getByRole('menuitem', {name:'Overview',exact:true}).click();
}
