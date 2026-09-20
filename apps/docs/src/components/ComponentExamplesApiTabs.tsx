import React from "react";
import TabItem from "@theme/TabItem";
import Tabs from "@theme/Tabs";

import { ComponentApi } from "./ComponentApi";
import { ComponentPreview } from "./ComponentPreview";
import { LiveExample } from "./LiveExample";

interface ComponentExamplesApiTabsProps {
  component: string;
  /** Inline live preview (renders Looma declarative components) */
  preview?: React.ReactNode;
}

export function ComponentExamplesApiTabs({
  component,
  preview
}: ComponentExamplesApiTabsProps): JSX.Element {
  return (
    <Tabs>
      <TabItem value="examples" label="Examples" default>
        {preview ? <LiveExample>{preview}</LiveExample> : <ComponentPreview component={component} />}
        <p>
          See <a href="#ssr-markup">SSR Markup</a> and{" "}
          <a href="#framework-snippets">Framework Snippets</a> below. Vue and
          direct HTML invocation examples are supported in Release 1; React and
          Svelte snippets are repository previews.
        </p>
      </TabItem>
      <TabItem value="api" label="API">
        <ComponentApi component={component} />
      </TabItem>
    </Tabs>
  );
}
