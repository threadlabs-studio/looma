import BrowserOnly from "@docusaurus/BrowserOnly";
import React, { useEffect, useRef, useState } from "react";

import { examplesFor } from "../examples";
import { ScenarioModeExample } from "./ComponentModeExample";
import { useLoomaRuntime } from "./LiveExample";

interface ComponentPreviewProps {
  component: string;
  compact?: boolean;
}

/**
 * Renders a component's examples from `apps/docs/examples/<tag>/`: each example's live markup, its
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
        <div dangerouslySetInnerHTML={{ __html: examples[0]?.markup ?? "" }} />
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
              <div
                className="looma-preview-scenario__stage"
                data-component-preview={component}
                style={example.resizable ? { "--looma-preview-width": `${previewWidth}px` } as React.CSSProperties : undefined}
                dangerouslySetInnerHTML={{ __html: example.markup }}
              />
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
