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
          <span>Pre-1.0 release</span>
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
              <ui-icon-button slot="leading" label="Open navigation" variant="ghost" size="md">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 5h16M4 12h16M4 19h16" />
                </svg>
              </ui-icon-button>
              <strong>Project Atlas</strong>
              <ui-icon-button slot="search" label="Search" variant="ghost" size="md">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </ui-icon-button>
              <ui-avatar slot="actions" name="Maya Chen" fallback="MC"></ui-avatar>
            </ui-top-bar>
            <div className="looma-demo-app__body">
              <ui-stack gap="m">
                <div className="looma-demo-app__header">
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
                </div>
                <ui-callout tone="info">Design review starts tomorrow at 10:00.</ui-callout>
                <label className="looma-demo-task"><input type="checkbox" defaultChecked /><span>Prepare engineering handoff</span></label>
                <label className="looma-demo-task"><input type="checkbox" /><span>Publish release notes</span></label>
                <div className="looma-demo-app__actions">
                  <ui-button variant="ghost" size="sm">Later</ui-button>
                  <ui-button variant="solid" size="sm">Open project</ui-button>
                </div>
              </ui-stack>
            </div>
          </div>
        </LiveExample>
      </div>
    </section>
  );
}
