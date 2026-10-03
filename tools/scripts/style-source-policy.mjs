import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceRoot = path.join(repo, 'packages/looma/src');
const ts = createRequire(path.join(repo, 'packages/looma/package.json'))('typescript');

/** Read leaf CSS rules with their enclosing at-rules; changes cannot hide under a new media query. */
export function cssRules(source) {
  source = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const stack = [];
  const rules = [];
  let start = 0;
  let quote = '';
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quote) { if (char === quote && source[index - 1] !== '\\') quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '{') {
      if (stack.length) stack.at(-1).children = true;
      stack.push({ header: source.slice(start, index).trim().replace(/\s+/g, ' '), body: index + 1, children: false });
      start = index + 1;
    } else if (char === '}') {
      const rule = stack.pop();
      if (!rule) throw new Error('Unbalanced stylesheet');
      if (!rule.children) {
        // Separate selector lists, but retain commas inside :is(), :not(), or attribute values.
        const selectors = [];
        let depth = 0; let from = 0; let quoted = '';
        for (let at = 0; at < rule.header.length; at++) {
          const token = rule.header[at];
          if (quoted) { if (token === quoted && rule.header[at - 1] !== '\\') quoted = ''; continue; }
          if (token === '"' || token === "'") quoted = token;
          else if (token === '(' || token === '[') depth++;
          else if (token === ')' || token === ']') depth--;
          else if (token === ',' && !depth) { selectors.push(rule.header.slice(from, at).trim()); from = at + 1; }
        }
        selectors.push(rule.header.slice(from).trim());
        for (const selector of selectors) rules.push([...stack.map(parent => parent.header), selector, source.slice(rule.body, index).trim().replace(/\s+/g, ' ')].join(' { '));
      }
      start = index + 1;
    }
  }
  if (stack.length || quote) throw new Error('Unbalanced stylesheet');
  return rules.sort();
}

/** Inspect full style expressions, including object literals, assignments, and DOM mutations. */
export function inlineStyles(source) {
  const expressions = [];
  const tree = ts.createSourceFile('composition.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const isStyle = node => (ts.isPropertyAccessExpression(node) && node.name.text === 'style')
    || (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression) && node.argumentExpression.text === 'style');
  const containsStyle = node => isStyle(node) || (node.expression && containsStyle(node.expression));
  const visit = node => {
    const styleAttribute = ts.isJsxAttribute(node) && node.name.getText(tree) === 'style' && node.initializer && ts.isJsxExpression(node.initializer);
    const styleProperty = ts.isPropertyAssignment(node) && (node.name.text === 'style' || node.name.getText(tree) === 'style');
    const styleAssignment = ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && containsStyle(node.left);
    const styleCall = ts.isCallExpression(node) && (containsStyle(node.expression)
      || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'setAttribute' && node.arguments[0]?.text === 'style')
      || (node.expression.getText(tree) === 'Object.assign' && node.arguments.some(containsStyle)));
    if (styleAttribute || styleProperty || styleAssignment || styleCall) {
      expressions.push(node.getText(tree).trim());
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  expressions.push(...[...source.matchAll(/\bstyle\s*=\s*(?:"[^"]*"|'[^']*')/g)].map(match => match[0]));
  return expressions;
}

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(file));
    else result.push(file);
  }
  return result;
}

/** Compare occurrences so copying an allowed legacy expression does not create another exception. */
export function additions(values, allowed = []) {
  const remaining = [...allowed];
  return values.filter(value => {
    const index = remaining.indexOf(value);
    if (index < 0) return true;
    remaining.splice(index, 1);
    return false;
  });
}

/** New styled sources are never auto-approved by their location or name. Existing composition debt is frozen. */
export async function styleSourceProblems() {
  const contract = JSON.parse(await readFile(path.join(repo, 'tools/style-source-allowlist.json'), 'utf8'));
  const approved = new Set(contract.approvedSources);
  const problems = [];
  for (const file of await files(sourceRoot)) {
    const relative = path.relative(repo, file).replaceAll(path.sep, '/');
    const source = await readFile(file, 'utf8');
    if (approved.has(relative)) continue;
    const blocks = file.endsWith('.css') ? [source] : [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]);
    if (blocks.length) {
      const debt = contract.frozenCssDebt[relative];
      if (!debt) problems.push(`${relative}: unapproved stylesheet; compose approved components via props`);
      else for (const rule of additions(blocks.flatMap(cssRules), debt)) problems.push(`${relative}: new or changed composition styling: ${rule.slice(0, 140)}`);
    }
    const inline = inlineStyles(source);
    for (const expression of additions(inline, contract.frozenInlineStyleDebt[relative])) problems.push(`${relative}: unapproved inline styling: ${expression.slice(0, 140)}`);
  }
  return problems;
}

export async function assertStyleSources() {
  const problems = await styleSourceProblems();
  if (problems.length) throw new Error(`Styles belong in approved design-system primitives.\n${problems.join('\n')}`);
}
