import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { selectVisualComponents, renderInputKey, compareCaptures, validCapture, sealCapture, assertNoTrackedBaselines } from './visual-review.mjs';
const require = createRequire(new URL('../../apps/storybook/package.json', import.meta.url));
const playwright = createRequire(createRequire(require.resolve('@playwright/test')).resolve('playwright'));
const { PNG } = playwright('playwright-core/lib/utilsBundle');
const image = (value = 255) => { const p = new PNG({width:32,height:32}); p.data.fill(value); for(let i=3;i<p.data.length;i+=4)p.data[i]=255; return PNG.sync.write(p); };
const files = {
  'packages/looma/src/components/ui-disclosure/ui-disclosure.html': '<template component="ui-disclosure"></template>',
  'packages/looma/src/components/ui-light-editor/ui-light-editor.html': '<ui-disclosure>Position</ui-disclosure>',
  'packages/looma/src/components/ui-button/ui-button.html': '<template component="ui-button"></template>',
};
const fixture = t => {const root=mkdtempSync(path.join(tmpdir(),'looma-visual-review-')); t.after(()=>rmSync(root,{recursive:true,force:true})); return root;};

test('component changes include composed consumers without selecting unrelated controls',()=>{
  assert.deepEqual(selectVisualComponents(files,['packages/looma/src/components/ui-disclosure/ui-disclosure.html']),['ui-disclosure','ui-light-editor']);
  assert.deepEqual(selectVisualComponents(files,['packages/looma/src/components/ui-disclosure/examples/01.html']),['ui-disclosure','ui-light-editor']);
});
test('shared rendering inputs select every component, while prose does not',()=>{
  for(const input of ['packages/looma/src/tokens/theme-system.css','pnpm-lock.yaml','apps/storybook/tests/state-sheets.spec.ts','packages/looma/tooling/docs/theme.mjs','packages/looma/tooling/docs/fonts.mjs','packages/looma/tooling/docs/portrait.svg'])
    assert.deepEqual(selectVisualComponents(files,[input]),['ui-button','ui-disclosure','ui-light-editor']);
  assert.deepEqual(selectVisualComponents(files,['docs/getting-started.md']),[]);
});
test('a prebuilt bundle cannot be represented as a fresh source render',()=>{
  assert.throws(()=>execFileSync(process.execPath,['tools/scripts/visual-review.mjs','plan','--reuse-build'],{stdio:'pipe'}),/Unknown visual-review option/);
});
test('direct canonical docs capture installs the detached checkout dependencies first',t=>{
  const directory=fixture(t), script=path.join(directory,'apps/docs/scripts/browser.mjs'), driver=path.join(directory,'tools/scripts/visual-review.mjs'), bin=path.join(directory,'bin');
  mkdirSync(path.dirname(script),{recursive:true});mkdirSync(path.dirname(driver),{recursive:true});mkdirSync(bin);
  writeFileSync(script,readFileSync('apps/docs/scripts/browser.mjs'));
  writeFileSync(driver,'import {existsSync} from "node:fs"; if(!existsSync("node_modules/.installed"))throw new Error("Base dependencies are missing"); console.log("captured");');
  writeFileSync(path.join(bin,'corepack'),'#!/bin/sh\nmkdir -p node_modules\ntouch node_modules/.installed\n');chmodSync(path.join(bin,'corepack'),0o755);
  const result=execFileSync(process.execPath,[script,'capture','--suite=docs'],{encoding:'utf8',env:{...process.env,LOOMA_DOCS_CANONICAL:'1',PATH:`${bin}${path.delimiter}${process.env.PATH}`}});
  assert.match(result,/captured/);
});
test('render cache identity follows source and environment rather than commit names or prose',()=>{
  const source={'packages/looma/src/tokens/tokens.css':'blob-a','pnpm-lock.yaml':'lock','docs/guide.md':'prose-a'};
  const key=renderInputKey(source,'renderer-a');
  assert.equal(key,renderInputKey({...source,'docs/guide.md':'prose-b'},'renderer-a'));
  assert.notEqual(key,renderInputKey({...source,'packages/looma/src/tokens/tokens.css':'blob-b'},'renderer-a'));
  assert.notEqual(key,renderInputKey(source,'renderer-b'));
});
test('an authorized history cutover resolves a missing old push base without hiding ordinary bad refs',t=>{
  const directory=fixture(t), event=path.join(directory,'event.json'), output=path.join(directory,'plan.json'), missing='f'.repeat(40);
  writeFileSync(event,JSON.stringify({forced:true,ref:'refs/heads/main',before:missing}));
  const run=()=>execFileSync(process.execPath,['tools/scripts/visual-review.mjs','plan',`--output=${output}`],{
    stdio:'pipe',env:{...process.env,GITHUB_BASE_SHA:missing,GITHUB_EVENT_NAME:'push',GITHUB_EVENT_PATH:event},
  });
  run();assert.equal(JSON.parse(readFileSync(output,'utf8')).base,execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim());
  writeFileSync(event,JSON.stringify({forced:false,ref:'refs/heads/main',before:missing}));
  assert.throws(run);
});
test('a render cache cannot be reused after a partial render or altered image',t=>{
  const root=fixture(t); writeFileSync(path.join(root,'control.png'),image());
  assert.equal(validCapture(root,'key'),false);
  sealCapture(root,'key'); assert.equal(validCapture(root,'key'),true);
  assert.equal(validCapture(root,'another-key'),false);
  writeFileSync(path.join(root,'control.png'),image(0)); assert.equal(validCapture(root,'key'),false);
});
test('a reused source cache is attributed to the current checkout pair',t=>{
  const context=path.resolve('.context');mkdirSync(context,{recursive:true});
  const cache=mkdtempSync(path.join(context,'visual-cache-test-'));t.after(()=>rmSync(cache,{recursive:true,force:true}));
  const plan={base:'base-now',head:'head-now',suite:'storybook',shard:'1/1',components:['ui-disclosure'],keys:{base:'before',head:'after'}};
  writeFileSync(path.join(cache,'control.png'),image());sealCapture(cache,'after',{plan:{...plan,head:'earlier-checkout'},side:'head'});
  const file=path.join(cache,'plan.json');writeFileSync(file,JSON.stringify(plan));
  execFileSync(process.execPath,['tools/scripts/visual-review.mjs','render-side',`--plan=${file}`,'--side=head',`--output=${cache}`]);
  assert.equal(JSON.parse(readFileSync(path.join(cache,'capture.json'),'utf8')).plan.head,'head-now');
});
test('a failed worktree creation leaves an existing checkout and its diagnostic work intact',t=>{
  const context=path.resolve('.context');mkdirSync(context,{recursive:true});
  const directory=mkdtempSync(path.join(context,'visual-collision-test-'));
  const id=Date.now()+Math.floor(Math.random()*1000000), shard=`${id}/${id}`, checkout=path.join(context,`visual-base-${id}-${id}`);
  assert.equal(existsSync(checkout),false);
  const ref=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  execFileSync('git',['worktree','add','--detach',checkout,ref],{stdio:'pipe'});
  t.after(()=>{if(existsSync(checkout))execFileSync('git',['worktree','remove','--force',checkout],{stdio:'pipe'});rmSync(directory,{recursive:true,force:true});});
  writeFileSync(path.join(checkout,'diagnostic.txt'),'preserve this work');
  const plan={base:ref,head:ref,suite:'storybook',shard,components:['ui-disclosure'],keys:{base:'collision',head:'head'}};
  const file=path.join(directory,'plan.json');writeFileSync(file,JSON.stringify(plan));
  assert.throws(()=>execFileSync(process.execPath,['tools/scripts/visual-review.mjs','render-side',`--plan=${file}`,'--side=base',`--output=${directory}/output`],{stdio:'pipe'}));
  assert.equal(readFileSync(path.join(checkout,'diagnostic.txt'),'utf8'),'preserve this work');
});
test('comparison reports real visual changes without updating the trusted reference',t=>{
  const root=fixture(t), before=path.join(root,'before'), after=path.join(root,'after'), report=path.join(root,'report');
  mkdirSync(before);mkdirSync(after);
  writeFileSync(path.join(before,'control.png'),image());writeFileSync(path.join(after,'control.png'),image(0));
  const result=compareCaptures(before,after,report);
  assert.equal(result.changed.length,1);assert.equal(result.unchanged.length,0);
  assert.deepEqual(readFileSync(path.join(before,'control.png')),image());
  assert.ok(readFileSync(path.join(report,'index.html'),'utf8').includes('control.png'));
});
test('added and removed examples stay visible in the review report',t=>{
  const root=fixture(t), before=path.join(root,'before'), after=path.join(root,'after');mkdirSync(before);mkdirSync(after);
  writeFileSync(path.join(before,'removed.png'),image());writeFileSync(path.join(after,'added.png'),image());
  const result=compareCaptures(before,after,path.join(root,'report'));
  assert.deepEqual(result.added,['added.png']);assert.deepEqual(result.removed,['removed.png']);
});
test('renderer diagnostic attachments are excluded from the visual comparison',t=>{
  const root=fixture(t), before=path.join(root,'before'), after=path.join(root,'after');
  mkdirSync(path.join(before,'test-results','case'),{recursive:true});mkdirSync(after);
  writeFileSync(path.join(before,'control.png'),image());writeFileSync(path.join(after,'control.png'),image());
  writeFileSync(path.join(before,'test-results','case','control-actual.png'),image());
  const result=compareCaptures(before,after,path.join(root,'report'));
  assert.deepEqual(result.removed,[]);assert.equal(result.unchanged.length,1);
});
test('the CI report requires a complete matching source pair for every shard',t=>{
  const directory=fixture(t), input=path.join(directory,'artifacts'), output=path.join(directory,'review');
  const plan={base:'base',head:'head',suite:'storybook',shard:'1/1',components:['ui-disclosure'],keys:{base:'before',head:'after'}};
  for(const side of ['base','head']) {
    const target=path.join(input,`visual-capture-${side}-1`);mkdirSync(target,{recursive:true});
    writeFileSync(path.join(target,'control.png'),image());sealCapture(target,plan.keys[side],{plan,side});
  }
  const run=()=>execFileSync(process.execPath,['tools/scripts/visual-review.mjs','report',`--input=${input}`,`--output=${output}`],{stdio:'pipe'});
  run();assert.equal(JSON.parse(readFileSync(path.join(output,'report/comparison.json'),'utf8')).unchanged.length,1);
  rmSync(path.join(input,'visual-capture-head-1'),{recursive:true});
  assert.throws(run,/Visual source pair is incomplete/);
});
test('CI rejects baseline binaries in Git, while disposable untracked renders are allowed',t=>{
  const root=fixture(t), directory=path.join(root,'apps/docs/tests/baselines/visual');mkdirSync(directory,{recursive:true});
  execFileSync('git',['init','--quiet'],{cwd:root});
  writeFileSync(path.join(directory,'page.png'),image());assert.doesNotThrow(()=>assertNoTrackedBaselines(root));
  execFileSync('git',['add','apps/docs/tests/baselines/visual/page.png'],{cwd:root});
  assert.throws(()=>assertNoTrackedBaselines(root),/PNG.*Git|Git.*PNG/);
});
test('merging stale history cannot reintroduce PNG versions hidden behind a clean tip',t=>{
  const root=fixture(t), relative='apps/storybook/tests/baselines/state-sheets/control.png';
  execFileSync('git',['init','--quiet'],{cwd:root});
  const commit=message=>execFileSync('git',['-c','user.name=Test Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','--allow-empty','-m',message],{cwd:root});
  commit('clean anchor');const anchor=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  mkdirSync(path.dirname(path.join(root,relative)),{recursive:true});writeFileSync(path.join(root,relative),image());
  execFileSync('git',['add',relative],{cwd:root});commit('old screenshot version');
  execFileSync('git',['rm','--quiet',relative],{cwd:root});commit('clean tip');
  assert.throws(()=>assertNoTrackedBaselines(root,anchor),/PNG.*history|history.*PNG/);
});
test('PNG versions introduced only by a merge cannot hide behind a later deletion',t=>{
  const directory=fixture(t), relative='apps/docs/tests/baselines/visual/page.png';
  const git=(args,input)=>execFileSync('git',['-c','user.name=Test Fixture','-c','user.email=fixture@example.invalid',...args],{cwd:directory,encoding:'utf8',input}).trim();
  git(['init','--quiet']);git(['commit','--quiet','--allow-empty','-m','clean anchor']);const anchor=git(['rev-parse','HEAD']);
  const empty=git(['rev-parse','HEAD^{tree}']);writeFileSync(path.join(directory,'left.txt'),'left');git(['add','left.txt']);git(['commit','--quiet','-m','left']);const left=git(['rev-parse','HEAD']);
  const right=git(['commit-tree',empty,'-p',anchor],'right\n');
  mkdirSync(path.dirname(path.join(directory,relative)),{recursive:true});writeFileSync(path.join(directory,relative),image());git(['add',relative]);
  const merge=git(['commit-tree',git(['write-tree']),'-p',left,'-p',right],'merge-only PNG\n');git(['update-ref','HEAD',merge]);
  git(['rm','--quiet',relative]);git(['commit','--quiet','-m','clean tip']);
  assert.throws(()=>assertNoTrackedBaselines(directory,anchor),/PNG.*history|history.*PNG/);
});
