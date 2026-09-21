import BrowserOnly from "@docusaurus/BrowserOnly";
import React, { useEffect, useState } from "react";

let loomaRuntimePromise: Promise<unknown> | undefined;

function loadLoomaRuntime(): Promise<unknown> {
  // A page can mount dozens of previews; all of them share one registration transaction.
  loomaRuntimePromise ??= Promise.all([
    import("@threadlabs/looma/tokens.css"),
    import("@threadlabs/looma/theme-light.css"),
    import("@threadlabs/looma/theme-dark.css"),
    import("@threadlabs/looma/layout.css"),
    import("@threadlabs/looma/styles.css"),
    import("@threadlabs/looma/editor.css"),
    import("@threadlabs/looma/layout"),
    // Editor CSS is presentation-only; this entry point registers the editor controllers.
    import("@threadlabs/looma/editor/ui"),
    import("@threadlabs/looma")
  ]);
  return loomaRuntimePromise;
}

export function useLoomaRuntime(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void loadLoomaRuntime().then(() => setReady(true));
  }, []);

  return ready;
}

function LiveExampleClient({ children }: Pick<LiveExampleProps, "children">): JSX.Element {
  const ready = useLoomaRuntime();

  return ready ? (
    <>{children}</>
  ) : (
    <span className="looma-live-example-loading">Loading…</span>
  );
}

interface LiveExampleProps {
  children: React.ReactNode;
  /** Optional label above the example */
  label?: string;
}

/**
 * Loads Looma only in the browser, avoiding custom-element registration during
 * Docusaurus SSR. Children mount after styles, definitions, and controllers are
 * available, so the first visible preview is already eligible for lowering.
 */
export function LiveExample({ children, label }: LiveExampleProps): JSX.Element {
  return (
    <div className="looma-live-example">
      {label ? <span className="looma-live-example-label">{label}</span> : null}
      <div className="looma-live-example-preview">
        <BrowserOnly fallback={<span className="looma-live-example-loading">Loading…</span>}>
          {() => <LiveExampleClient>{children}</LiveExampleClient>}
        </BrowserOnly>
      </div>
    </div>
  );
}
