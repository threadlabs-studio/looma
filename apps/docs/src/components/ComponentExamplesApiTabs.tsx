import React from "react";
import TabItem from "@theme/TabItem";
import Tabs from "@theme/Tabs";

import { ComponentApi } from "./ComponentApi";
import { ComponentModeExample } from "./ComponentModeExample";
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
        <ComponentModeExample component={component} />
      </TabItem>
      <TabItem value="api" label="API">
        <ComponentApi component={component} />
      </TabItem>
    </Tabs>
  );
}
