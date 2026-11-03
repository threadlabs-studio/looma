import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { parseTemplate } from '@angular/compiler';

/** Check the actual template string after TypeScript has interpreted its quoting. */
export function validateAngularExample(code, name = 'Example.ts') {
  const source = ts.createSourceFile(name, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.deepEqual(source.parseDiagnostics.map(issue => ts.flattenDiagnosticMessageText(issue.messageText, '\n')), [], name);
  let initializer;
  function visit(node) {
    if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'template') initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(initializer && (ts.isNoSubstitutionTemplateLiteral(initializer) || ts.isStringLiteral(initializer)), `${name}: literal Angular template`);
  const template = runInNewContext(initializer.getText(source), {}, { timeout: 1000 });
  const parsed = parseTemplate(template, name);
  assert.deepEqual(parsed.errors?.map(error => error.toString()) ?? [], [], name);
  return template;
}
