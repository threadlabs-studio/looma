import React, { useEffect, useState } from "react";

interface LiveExampleProps {
  children: React.ReactNode;
  /** Optional label above the example */
  label?: string;
}

/**
 * Lazy-loads Looma on mount (client-only) so web components render.
 */
export function LiveExample({ children, label }: LiveExampleProps): JSX.Element {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([
      import("@threadlabs/looma/tokens.css"),
      import("@threadlabs/looma/theme-light.css"),
      import("@threadlabs/looma/layout.css"),
      import("@threadlabs/looma/styles.css"),
      import("@threadlabs/looma/layout"),
      import("@threadlabs/looma")
    ]).then(() => setReady(true));
  }, []);

  return (
    <div className="looma-live-example">
      {label ? <span className="looma-live-example-label">{label}</span> : null}
      <div className="looma-live-example-preview">
        {ready ? children : <span className="looma-live-example-loading">Loading…</span>}
      </div>
    </div>
  );
}
