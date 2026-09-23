import React from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";

import { DocsLandingHero } from "./DocsLandingHero";

const htmlSource = `<ui-button variant="solid">Save</ui-button>`;
const loweredSource = `<button data-component="ui-button" data-ui-button-state="variant variant=solid">
  Save
</button>`;
const vueSource = `<script setup lang="ts">
import { Button } from "@threadlabs/looma/vue";
<\/script>

<template>
  <Button variant="solid">Save</Button>
</template>`;

export function HomePage(): JSX.Element {
  const markUrl = useBaseUrl("img/looma-mark.svg");

  return (
    <div className="looma-home">
        <DocsLandingHero />

        <section className="looma-home-section">
          <h2>One source, written as markup</h2>
          <p className="looma-home-section__lede">
            Looma is the first UI library built on{" "}
            <a href="https://nextwebwg.org/html-next/">Declarative HTML Components</a>, a proposal to
            give HTML its own component model. Every Looma component is written once as that markup,
            and the same definition ships two ways.
          </p>
          <div className="looma-home-grid">
            <article>
              <h3>You write</h3>
              <pre>
                <code>{htmlSource}</code>
              </pre>
            </article>
            <article>
              <h3>A page gets</h3>
              <pre>
                <code>{loweredSource}</code>
              </pre>
              <p>
                A real native button. No custom element, no shadow root, no wrapper: the element the
                browser already knows, with its focus, forms and accessibility intact.
              </p>
            </article>
            <article>
              <h3>A Vue app gets</h3>
              <pre>
                <code>{vueSource}</code>
              </pre>
              <p>
                An ordinary Vue 3.5 component, compiled from the same definition, with no Looma
                runtime inside it.
              </p>
            </article>
          </div>
        </section>

        <section className="looma-home-section">
          <h2>Why it is built this way</h2>
          <div className="looma-home-grid">
            <article>
              <h3>The platform does the work</h3>
              <p>
                Components lower to native elements, styles scope with CSS <code>@scope</code>, and
                validity uses the browser's own constraint validation. Less of Looma runs in your
                app because more of it is already in the browser.
              </p>
            </article>
            <article>
              <h3>Themed by about 40 values</h3>
              <p>
                One contract of design tokens; everything else derives from it. A real product theme
                is around 35 declarations, and no component needs its own.
              </p>
              <Link to="/tokens">Read the token contract<span aria-hidden="true"> →</span></Link>
            </article>
            <article>
              <h3>Proven against a real product</h3>
              <p>
                Every release is verified by converting a shipping application and comparing its
                screens. Support and limits are written down, not implied.
              </p>
              <Link to="/release-1-support">Release 1 support and limitations<span aria-hidden="true"> →</span></Link>
            </article>
          </div>
        </section>

        <section className="looma-home-section looma-home-section--cta">
          <img src={markUrl} alt="" width={48} height={48} />
          <h2>Start with one component</h2>
          <p>
            Add the package, import the styles, and put a <code>&lt;ui-button&gt;</code> on a page.
            Nothing else changes.
          </p>
          <div className="looma-home-hero__actions">
            <Link className="looma-button looma-button--primary" to="/getting-started">
              Get started <span aria-hidden="true">→</span>
            </Link>
            <Link className="looma-button looma-button--secondary" to="/components">
              Browse components
            </Link>
          </div>
        </section>
    </div>
  );
}
