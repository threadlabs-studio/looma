import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "@docusaurus/Link";
import useBaseUrl from "@docusaurus/useBaseUrl";

import { useDocsSidebar } from "@docusaurus/plugin-content-docs/client";

import componentApi from "../../../../generated/component-api.json";
import { ComponentPreview } from "./ComponentPreview";

interface ComponentRecord {
  tag: string;
  description: string;
  root: string;
}

interface SidebarItem {
  type: string;
  label: string;
  href?: string;
  items?: SidebarItem[];
}

const recordByTag = new Map((componentApi.components as ComponentRecord[]).map((component) => [component.tag, component]));

/**
 * The catalog lists the component pages in the sidebar it is shown in: each sidebar category (a
 * folder under docs/components/) is a filter, and pages outside a category take the
 * sidebar's first page (its overview) as their group.
 */
function sidebarComponents(items: readonly SidebarItem[], category: string): { tag: string; label: string; category: string }[] {
  return items.flatMap((item) => {
    if (item.type === "category") return sidebarComponents(item.items ?? [], item.label);
    const tag = /\/components\/(ui-[a-z-]+)$/.exec(item.href ?? "")?.[1];
    return tag && recordByTag.has(tag) ? [{ tag, label: item.label, category }] : [];
  });
}

const MemoizedComponentPreview = React.memo(ComponentPreview);

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
  const [activeCategory, setActiveCategory] = useState("All");
  const searchRef = useRef<HTMLInputElement>(null);
  const sidebar = useDocsSidebar();
  const items = (sidebar?.items ?? []) as SidebarItem[];
  const components = useMemo(
    () => sidebarComponents(items, items[0]?.label ?? "")
      .map((entry) => ({ ...entry, ...recordByTag.get(entry.tag)! }))
      .sort((a, b) => a.tag.localeCompare(b.tag)),
    [items],
  );
  // Filters follow the sidebar's group order; cards are alphabetical.
  const categoryOrder = [...new Set(sidebarComponents(items, items[0]?.label ?? "").map(({ category }) => category))];
  const componentCountByCategory = new Map(
    categoryOrder.map((category) => [category, components.filter((component) => component.category === category).length] as const),
  );

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
        component.label.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, components, query]);

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
            placeholder={`Search all ${components.length} components`}
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
            <article
              className={`looma-component-card looma-component-card--${component.category.toLowerCase()}`}
              data-component-card={component.tag}
              key={component.tag}
            >
              <CatalogPreview component={component.tag} />
              <div className="looma-component-card__body">
                <div className="looma-component-card__meta">
                  <span>{component.category}</span>
                  <code>{`<${component.root}>`}</code>
                </div>
                <h2>
                  <Link to={`/components/${component.tag}`}>{component.label}</Link>
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
