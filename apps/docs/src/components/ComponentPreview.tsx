import BrowserOnly from "@docusaurus/BrowserOnly";
import useBaseUrl from "@docusaurus/useBaseUrl";
import React, { useEffect, useRef, useState } from "react";

import { examplesFor } from "../examples";
import { ScenarioModeExample } from "./ComponentModeExample";
import { useLoomaRuntime } from "./LiveExample";

interface ComponentPreviewProps {
  component: string;
  compact?: boolean;
}

// Always-open floating examples are separate viewports, not CSS exceptions that move popups inline.
const isolatedPopups = new Set(["ui-search-shell", "ui-editor-mention-menu", "ui-editor-slash-menu", "ui-editor-table-context-menu"]);

/** Compound-part examples can also author an open popup around the component being documented. */
function needsPopupViewport(component: string, markup: string): boolean {
  if (isolatedPopups.has(component)) return true;
  const example = new DOMParser().parseFromString(markup, "text/html");
  return example.querySelector("ui-menu[open], ui-dialog[open], ui-popover[open], ui-tooltip[open], ui-search-shell[open], ui-editor-mention-menu[open], ui-editor-slash-menu[open], ui-editor-table-context-menu[open]") !== null;
}

function PopupViewport({ component, markup }: { component: string; markup: string }): JSX.Element {
  const runtime = useBaseUrl("/preview-runtime/runtime.js");
  const styles = useBaseUrl("/preview-runtime/runtime.css");
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    const sync = () => setTheme(document.documentElement.dataset.theme ?? "light");
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    sync();
    return () => observer.disconnect();
  }, []);
  // Only repository-authored markup reaches this isolated document.
  const srcDoc = `<!doctype html><html data-theme="${theme}"><head><meta charset="utf-8"><link rel="stylesheet" href="${styles}"><style>
    html, body { margin: 0; min-height: 100%; color: var(--ui-text-primary); background: var(--ui-surface); font-family: var(--ui-font-family-sans); }
    body { padding: 12px; box-sizing: border-box; }
  </style></head><body>${markup}<script src="${runtime}"></script></body></html>`;
  return <iframe className="looma-popup-viewport" title={`${component} preview viewport`} srcDoc={srcDoc} />;
}

/**
 * Renders a component's examples from its `examples/` folder: each example's live markup, its
 * code in every authoring mode, and any demo behaviour it declares.
 */
function ComponentPreviewClient({ component, compact = false }: ComponentPreviewProps): JSX.Element {
  const ready = useLoomaRuntime();
  const rootRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(720);
  const examples = ready ? examplesFor(component) : [];

  // Demo behaviour runs against each example's own rendered stage.
  useEffect(() => {
    const root = rootRef.current;
    if (!ready || !root) return;
    const cleanups = examples.flatMap((example) => {
      const stage = root.querySelector<HTMLElement>(`[data-preview-example="${example.name}"] .looma-preview-scenario__stage`);
      return example.behavior && stage ? [example.behavior(stage)] : [];
    });
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [component, ready]);

  if (!ready) {
    return (
      <div className={`looma-component-preview${compact ? " looma-component-preview--compact" : ""}`}>
        <span className="looma-live-example-loading">Loading live component…</span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={`looma-component-preview${compact ? " looma-component-preview--compact" : ""}`}>
      {compact ? (
        // Only repository-authored example files reach this sink.
        needsPopupViewport(component, examples[0]?.markup ?? "")
          ? <PopupViewport component={component} markup={examples[0]?.markup ?? ""} />
          : <div dangerouslySetInnerHTML={{ __html: examples[0]?.markup ?? "" }} />
      ) : (
        <div className="looma-preview-scenarios">
          {examples.map((example) => (
            <section
              className="looma-preview-scenario"
              data-preview-scenario={example.title}
              data-preview-example={example.name}
              key={example.name}
            >
              <header>
                <h2>{example.title}</h2>
                <p>{example.description}</p>
              </header>
              {example.resizable ? (
                <label className="looma-responsive-preview-control">
                  <span>Preview width</span>
                  <input
                    aria-label="Preview width"
                    max="720"
                    min="280"
                    onChange={(event) => setPreviewWidth(Number(event.currentTarget.value))}
                    type="range"
                    value={previewWidth}
                  />
                  <output>{previewWidth}px</output>
                </label>
              ) : null}
              {needsPopupViewport(component, example.markup) ? (
                <div className="looma-preview-scenario__stage" data-component-preview={component}>
                  <PopupViewport component={component} markup={example.markup} />
                </div>
              ) : (
                <div
                  className="looma-preview-scenario__stage"
                  data-component-preview={component}
                  style={example.resizable ? { "--looma-preview-width": `${previewWidth}px` } as React.CSSProperties : undefined}
                  dangerouslySetInnerHTML={{ __html: example.markup }}
                />
              )}
              <ScenarioModeExample
                examples={example.frameworks}
                markup={example.frameworkMarkup}
                propertyAssignments={example.assignments}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComponentPreview(props: ComponentPreviewProps): JSX.Element {
  const className = `looma-component-preview${props.compact ? " looma-component-preview--compact" : ""}`;

  return (
    <BrowserOnly
      fallback={(
        <div className={className}>
          <span className="looma-live-example-loading">Loading live component…</span>
        </div>
      )}
    >
      {() => <ComponentPreviewClient {...props} />}
    </BrowserOnly>
  );
}
