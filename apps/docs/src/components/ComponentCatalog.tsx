import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";

import componentApi from "../../../../generated/component-api.json";
import { componentGroups, type ComponentCategory } from "../componentNavigation";
import { ComponentPreview } from "./ComponentPreview";

interface ComponentRecord {
  tag: string;
  description: string;
  root: string;
}

const categoryByTag = new Map(
  componentGroups.flatMap(({ label, items }) => items.map(({ tag }) => [tag, label] as const))
);
const categoryOrder = componentGroups.map(({ label }) => label);
const componentCountByCategory = new Map(
  componentGroups.map(({ label, items }) => [label, items.length] as const)
);

function categoryForTag(tag: string): ComponentCategory {
  const category = categoryByTag.get(tag);
  if (!category) {
    throw new Error(`Missing component navigation category for ${tag}.`);
  }
  return category;
}

const components = (componentApi.components as ComponentRecord[]).map((component) => ({
  ...component,
  category: categoryForTag(component.tag)
}));

const MemoizedComponentPreview = React.memo(ComponentPreview);

function titleFromTag(tag: string): string {
  return tag
    .replace(/^ui-/, "")
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function CatalogPreview({ component }: { component: string }): JSX.Element {
  const [visible, setVisible] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = previewRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "320px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={previewRef} className="looma-component-card__preview">
      {visible ? (
        <MemoizedComponentPreview component={component} compact />
      ) : (
        <span className="looma-live-example-loading">Live preview</span>
      )}
    </div>
  );
}

export function ComponentCatalog(): JSX.Element {
  const markUrl = useBaseUrl("img/looma-mark.svg");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"All" | ComponentCategory>("All");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  const filteredComponents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return components.filter((component) => {
      const matchesCategory = activeCategory === "All" || component.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        component.tag.includes(normalizedQuery) ||
        component.description.toLowerCase().includes(normalizedQuery) ||
        titleFromTag(component.tag).toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <div className="looma-catalog">
      <div className="looma-catalog__controls">
        <label className="looma-catalog__search">
          <span className="sr-only">Search components</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search all 49 components"
          />
          <kbd>/</kbd>
        </label>
        <div className="looma-catalog__filters" aria-label="Filter by category">
          {(["All", ...categoryOrder] as const).map((category) => (
            <button
              key={category}
              type="button"
              className={category === activeCategory ? "is-active" : undefined}
              aria-pressed={category === activeCategory}
              onClick={() => setActiveCategory(category)}
            >
              {category}
              <span>{category === "All" ? components.length : componentCountByCategory.get(category)}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="looma-catalog__result-count" aria-live="polite">
        Showing {filteredComponents.length} {filteredComponents.length === 1 ? "component" : "components"}
      </p>

      {filteredComponents.length > 0 ? (
        <div className="looma-catalog__grid">
          {filteredComponents.map((component) => (
            <article className={`looma-component-card looma-component-card--${component.category.toLowerCase()}`} key={component.tag}>
              <CatalogPreview component={component.tag} />
              <div className="looma-component-card__body">
                <div className="looma-component-card__meta">
                  <span>{component.category}</span>
                  <code>{`<${component.root}>`}</code>
                </div>
                <h2>
                  <Link to={`/components/${component.tag}`}>{titleFromTag(component.tag)}</Link>
                </h2>
                <p>{component.description}</p>
                <Link className="looma-component-card__link" to={`/components/${component.tag}`}>
                  View component <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="looma-catalog__empty">
          <img src={markUrl} alt="" />
          <h2>No components found</h2>
          <p>Try another name, capability, or category.</p>
          <button type="button" onClick={() => { setQuery(""); setActiveCategory("All"); }}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
