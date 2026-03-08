import React from "react";
import TabItem from "@theme/TabItem";
import Tabs from "@theme/Tabs";

import { ComponentApi } from "./ComponentApi";
import { LiveExample } from "./LiveExample";

interface ComponentExamplesApiTabsProps {
  component: string;
  /** Inline live preview (renders Looma web components) */
  preview?: React.ReactNode;
}

export function ComponentExamplesApiTabs({
  component,
  preview
}: ComponentExamplesApiTabsProps): JSX.Element {
  return (
    <Tabs>
      <TabItem value="examples" label="Examples" default>
        {preview ? <LiveExample>{preview}</LiveExample> : null}
        <p>
          See <a href="#ssr-markup">SSR Markup</a> and{" "}
          <a href="#framework-snippets">Framework Snippets</a> below. Run{" "}
          <code>pnpm dev:storybook</code> for interactive examples.
        </p>
      </TabItem>
      <TabItem value="api" label="API">
        <ComponentApi component={component} />
      </TabItem>
    </Tabs>
  );
}
