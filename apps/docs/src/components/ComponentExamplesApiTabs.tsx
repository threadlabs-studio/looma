import React from "react";
import TabItem from "@theme/TabItem";
import Tabs from "@theme/Tabs";

import { ComponentApi } from "./ComponentApi";
import { ComponentPreview } from "./ComponentPreview";

interface ComponentExamplesApiTabsProps {
  component: string;
}

export function ComponentExamplesApiTabs({
  component
}: ComponentExamplesApiTabsProps): JSX.Element {
  return (
    <Tabs lazy>
      <TabItem value="examples" label="Examples" default>
        <ComponentPreview component={component} />
      </TabItem>
      <TabItem value="api" label="API">
        <ComponentApi component={component} />
      </TabItem>
    </Tabs>
  );
}
