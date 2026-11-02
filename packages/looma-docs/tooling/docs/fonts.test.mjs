import test from 'node:test';
import assert from 'node:assert/strict';
import { loadGoogleFonts } from './fonts.mjs';

test('replacing a pending shared font stylesheet settles its previous wait', async () => {
  let current;
  const document = {
    head: { querySelector: () => current, append: link => { current = link; } },
    createElement: () => ({ dataset: {}, remove() { if (current === this) current = undefined; } }),
    fonts: { load: async () => [{}] },
  };
  const previous = loadGoogleFonts(document, { 'body-font': 'Inter' });
  const latest = loadGoogleFonts(document, { 'body-font': 'Inter', 'display-font': 'Lora' });
  await previous;
  current.onload();
  await latest;
  const pending = loadGoogleFonts(document, { 'body-font': 'Roboto' });
  await loadGoogleFonts(document, {});
  await pending;
  assert.equal(current, undefined);
});


test('font-name previews request exact glyphs and do not limit selected font downloads', async () => {
  const {googleFontPreviewURL,googleFontURL}=await import('./fonts.mjs');
  const preview=new URL(googleFontPreviewURL('IBM Plex Sans'));
  assert.equal(preview.searchParams.get('text'),'IBM Plex Sans');
  assert.equal(preview.searchParams.get('family'),'IBM Plex Sans:wght@400');
  assert.equal(preview.searchParams.get('display'),'swap');
  const selected=new URL(googleFontURL({'body-font':'IBM Plex Sans'}));
  assert.equal(selected.searchParams.has('text'),false);
  assert.equal(selected.searchParams.get('family'),'IBM Plex Sans:wght@400;500;600;700');
  assert.throws(()=>googleFontPreviewURL('Not a catalog family'));
});

test('preview faces are cached separately from the family used for selected text', async () => {
  const {loadGoogleFontPreview}=await import('./fonts.mjs');
  const requests=[],faces=[];
  const document={defaultView:{
    fetch:async url=>{requests.push(url);return{ok:true,text:async()=>`@font-face {font-family: 'Inter';src:url(https://fonts.gstatic.com/inter-name.woff2) format('woff2');}`};},
    FontFace:class {constructor(family,source,options){this.family=family;this.source=source;this.options=options;}async load(){return this;}},
  },fonts:{add:face=>faces.push(face)}};
  const [first,second]=await Promise.all([loadGoogleFontPreview(document,'Inter'),loadGoogleFontPreview(document,'Inter')]);
  assert.equal(first,second);
  assert.equal(requests.length,1);
  assert.equal(faces.length,1);
  assert.notEqual(faces[0].family,'Inter');
  assert.equal(faces[0].family,first);
  assert.match(faces[0].source,/inter-name.woff2/);
});
