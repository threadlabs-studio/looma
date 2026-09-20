import React from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";

import { LiveExample } from "./LiveExample";

export function DocsLandingHero(): JSX.Element {
  const markUrl = useBaseUrl("img/looma-mark.svg");

  return (
    <section className="looma-home-hero">
      <div className="looma-home-hero__copy">
        <div className="looma-home-hero__eyebrow">
          <img src={markUrl} alt="" />
          <span>Release 1 candidate</span>
        </div>
        <h1>Getting Started</h1>
        <p className="looma-home-hero__lede">
          Declarative components, woven into the web platform. Semantic before JavaScript,
          interactive after it, and inspectable all the way down.
        </p>
        <div className="looma-home-hero__actions">
          <Link className="looma-button looma-button--primary" to="/components">
            Explore components <span aria-hidden="true">→</span>
          </Link>
          <a className="looma-button looma-button--secondary" href="https://github.com/threadlabs-studio/looma">
            View on GitHub
          </a>
        </div>
        <div className="looma-install-command">
          <span aria-hidden="true">$</span>
          <code>pnpm add @threadlabs/looma</code>
        </div>
      </div>

      <div className="looma-home-hero__demo" aria-label="Live Looma component demo">
        <div className="looma-home-hero__demo-bar">
          <span><i></i><i></i><i></i></span>
          <small>Live components</small>
        </div>
        <LiveExample>
          <div className="looma-demo-app">
            <ui-top-bar style={{ "--ui-top-bar-z-index": 1 } as React.CSSProperties}>
              <button slot="leading" type="button" aria-label="Open navigation">☰</button>
              <strong>Project Atlas</strong>
              <button slot="search" type="button" aria-label="Search">⌕</button>
              <ui-avatar slot="actions" name="Maya Chen" fallback="MC"></ui-avatar>
            </ui-top-bar>
            <div className="looma-demo-app__body">
              <ui-stack gap="m">
                <ui-cluster gap="s" align="center" justify="between">
                  <div>
                    <ui-badge tone="success" variant="subtle">On track</ui-badge>
                    <p className="looma-demo-app__title">September launch</p>
                  </div>
                  <ui-avatar-group max="3" label="Project team">
                    <ui-avatar name="Maya Chen" fallback="MC"></ui-avatar>
                    <ui-avatar name="Noah Williams" fallback="NW"></ui-avatar>
                    <ui-avatar name="Ari Kim" fallback="AK"></ui-avatar>
                    <ui-avatar name="Sam Rivera" fallback="SR"></ui-avatar>
                  </ui-avatar-group>
                </ui-cluster>
                <ui-callout tone="info">Design review starts tomorrow at 10:00.</ui-callout>
                <label className="looma-demo-task"><input type="checkbox" defaultChecked /><span>Prepare engineering handoff</span></label>
                <label className="looma-demo-task"><input type="checkbox" /><span>Publish release notes</span></label>
                <ui-cluster gap="s" justify="end">
                  <ui-button variant="ghost" size="sm"><button type="button">Later</button></ui-button>
                  <ui-button variant="solid" size="sm"><button type="button">Open project</button></ui-button>
                </ui-cluster>
              </ui-stack>
            </div>
          </div>
        </LiveExample>
      </div>
    </section>
  );
}
