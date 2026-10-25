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
