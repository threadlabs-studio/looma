import React from "react";
import TabItem from "@theme/TabItem";
import Tabs from "@theme/Tabs";

import { ComponentApi } from "./ComponentApi";

interface ComponentExamplesApiTabsProps {
  component: string;
}

export function ComponentExamplesApiTabs({
  component
}: ComponentExamplesApiTabsProps): JSX.Element {
  return (
    <Tabs>
      <TabItem value="examples" label="Examples" default>
        <p>
          Continue with the authored examples in this page:
          {" "}
          <a href="#ssr-markup">SSR Markup</a> and
          {" "}
          <a href="#framework-snippets">Framework Snippets</a>.
        </p>
      </TabItem>
      <TabItem value="api" label="API">
        <ComponentApi component={component} />
      </TabItem>
    </Tabs>
  );
}
