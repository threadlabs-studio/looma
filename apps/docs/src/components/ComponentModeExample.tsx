import React from "react";
import {
  FrameworkModeCode,
  FrameworkModeSelector,
  type FrameworkExamples
} from "./FrameworkMode";

/**
 * Keeps implementation code beside the live result it creates. Both
 * snippets derive from the scenario markup, so editing an example cannot leave
 * behind a detached, generic framework sample that demonstrates something else.
 */
export function ScenarioModeExample({
  examples
}: {
  examples: FrameworkExamples;
}): JSX.Element {
  return (
    <div className="looma-component-mode-example">
      <div className="looma-component-mode-example__header">
        <strong>Code</strong>
        <FrameworkModeSelector />
      </div>
      <FrameworkModeCode examples={examples} />
    </div>
  );
}
