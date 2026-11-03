/** Translate canonical recipe values for the reusable value editors; never duplicate design bounds here. */
const lengthUnits = { px: 1, rem: 16, em: 16, cm: 96 / 2.54, mm: 96 / 25.4, Q: 96 / 101.6, in: 96, pt: 96 / 72, pc: 16 };
const timeUnits = { ms: 1, s: 1000 };
const rounded = value => String(Number(Number(value).toFixed(6)));

export function valueEditor(field, value, { remPixels = 16 } = {}) {
  if (field.type === 'inherited-length') return { kind: 'inherited-size', value };
  if (field.id === 'text-size') return { kind: 'number', value, unit: 'px', min: field.min, max: field.max, step: 1 };
  if (field.type === 'choice') return { kind: 'choice', value };
  if (field.type === 'easing') return { kind: /^step-/.test(value) ? 'text' : 'curve', value };
  if (['colour', 'optional-colour', 'font'].includes(field.type)) return { kind: 'text', value };
  if (field.type.includes('length') || field.type === 'time') {
    const unit = value.match(/[a-z]+$/i)?.[0] ?? 'px';
    // Convert authoring limits against the same root as the displayed quantity.
    const units = field.type === 'time' ? timeUnits : { ...lengthUnits, rem: remPixels };
    const factor = units[unit];
    return { kind: 'number', value: value === '0' ? '0px' : value, unit,
      min: factor ? field.min / factor : .001, max: factor ? field.max / factor : 1000000,
      step: (field.type === 'time' ? 10 : field.id === 'line-weight' ? .25 : 1) / (factor ?? 1),
      units: field.type === 'time' ? ['ms', 's'] : ['px', 'rem'], convertible: Boolean(factor) };
  }
  const scale = field.type === 'fraction' || field.id === 'spacing' ? 100 : 1;
  return { kind: field.type === 'weight' ? 'number' : 'slider', value: field.type === 'weight' ? value : Number(value) * scale,
    min: field.min * scale, max: field.max * scale, step: field.type === 'weight' ? 50 : scale === 100 ? 1 : .01,
    unit: scale === 100 ? '%' : '', scale };
}

export function editorValue(field, value) {
  return field.type === 'fraction' || field.id === 'spacing' ? rounded(Number(value) / 100) : String(value);
}

export function convertValueUnit(value, nextUnit, { remPixels = 16 } = {}) {
  const unit = value.match(/[a-z]+$/i)?.[0] ?? 'px';
  const units = Object.hasOwn(timeUnits, unit) ? timeUnits : { ...lengthUnits, rem: remPixels, em: remPixels };
  if (!Object.hasOwn(units, unit) || !Object.hasOwn(units, nextUnit)) throw new Error('Choose compatible units.');
  return rounded(parseFloat(value) * units[unit] / units[nextUnit]) + nextUnit;
}
