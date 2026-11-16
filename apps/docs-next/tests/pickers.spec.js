import { expect, test } from '@playwright/test';

test('Listbox wraps and commits keyboard navigation in the rendered reference', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/ui-listbox/');
  const choices = page.locator('[data-preview="@threadlabs/looma/ui-listbox/01-single"]').getByRole('listbox');
  await choices.press('End');
  await expect(choices.getByRole('option', { name: 'Enterprise' })).toHaveAttribute('aria-selected', 'true');
  await choices.press('ArrowDown');
  await expect(choices.getByRole('option', { name: 'Basic' })).toHaveAttribute('aria-selected', 'true');
  await choices.locator('select option[value="team"]').evaluate(option => { option.disabled = true; });
  await expect(choices.getByRole('option', { name: 'Team' })).toHaveAttribute('aria-disabled', 'true');
  await choices.press('ArrowDown');
  await expect(choices.getByRole('option', { name: 'Enterprise' })).toHaveAttribute('aria-selected', 'true');
});

test('Combobox clamps and commits only when the writer confirms the active option', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/ui-combobox/');
  const preview = page.locator('[data-preview="@threadlabs/looma/ui-combobox/01-label-and-options"]');
  const input = preview.getByRole('combobox', { name: 'Destination' });
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-expanded', 'true');
  await input.press('ArrowDown');
  await input.press('End');
  const last = preview.getByRole('option', { name: /West terminal/ });
  const lastId = await last.getAttribute('id');
  expect(lastId).toBeTruthy();
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', lastId);
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await input.press('Enter');
  await expect(input).toHaveValue('West terminal');
});

test('Menu wraps keyboard focus and returns focus to its trigger on Escape', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/ui-menu/');
  const preview = page.locator('[data-preview="@threadlabs/looma/ui-menu/02-for"]');
  const trigger = preview.getByRole('button', { name: 'Open menu' });
  await trigger.press('Enter');
  const rename = preview.getByRole('menuitem', { name: 'Rename' });
  const share = preview.getByRole('menuitem', { name: 'Share' });
  await expect(rename).toBeFocused();
  await rename.press('ArrowUp');
  await expect(share).toBeFocused();
  await share.press('Escape');
  await expect(trigger).toBeFocused();
});

test('Manual Tabs move focus independently of the selected panel', async ({ page }, info) => {
  await page.goto(info.config.metadata.markupress + 'components/ui-tabs/');
  const preview = page.locator('[data-preview="@threadlabs/looma/ui-tabs/05-manual-activation"]');
  const summary = preview.getByRole('tab', { name: 'Summary' });
  const history = preview.getByRole('tab', { name: 'History' });
  await summary.press('ArrowLeft');
  await expect(history).toBeFocused();
  await expect(summary).toHaveAttribute('aria-selected', 'true');
  await history.press('Enter');
  await expect(history).toHaveAttribute('aria-selected', 'true');
});

for (const picker of [
  { page: 'ui-date-picker', example: '01-date', trigger: 'Choose date', date: '2026-10-30' },
  { page: 'ui-date-range-picker', example: '01-range', trigger: 'Choose date range: Start date', date: '2026-10-10' },
]) {
  test(`${picker.page} focuses the current day and restores its trigger on Escape`, async ({ page }, info) => {
    await page.goto(info.config.metadata.markupress + `components/${picker.page}/`);
    const preview = page.locator(`[data-preview="@threadlabs/looma/${picker.page}/${picker.example}"]`);
    const trigger = preview.getByRole('button', { name: picker.trigger, exact: true });
    await trigger.press('Enter');
    const date = preview.locator(`[data-calendar-day="${picker.date}"]`);
    await expect(date).toBeFocused();
    await date.press('Escape');
    await expect(trigger).toBeFocused();
  });
}
