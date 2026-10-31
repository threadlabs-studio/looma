import React, { useMemo } from "react";

import { frameworkExamples } from "../../../../packages/looma/tooling/docs/framework-examples.mjs";
import componentApi from "../../../../generated/component-api.json";
import {
  FrameworkModeCode,
  FrameworkModeSelector,
  type FrameworkExamples
} from "./FrameworkMode";


export interface ScenarioPropertyAssignment {
  elementId: string;
  property: string;
  variable: string;
  value: unknown;
}

/**
 * Props are HTML attributes: writes each assigned value onto its element in the markup, using the
 * attribute's kebab-case name and JSON text for lists and records. Used for the HTML example and the
 * live preview; framework examples bind the same values as ordinary component props instead.
 */
export function withPropertyAttributes(
  markup: string,
  assignments: readonly ScenarioPropertyAssignment[]
): string {
  const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("'", "&#39;");
  return assignments.reduce((source, assignment) => {
    const name = assignment.property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    const text = typeof assignment.value === "string" ? assignment.value : JSON.stringify(assignment.value);
    return source.replace(
      `id="${assignment.elementId}"`,
      `id="${assignment.elementId}" ${name}='${escape(text)}'`
    );
  }, markup);
}

function buildExamples(markup: string, assignments: readonly ScenarioPropertyAssignment[]): FrameworkExamples {
  return frameworkExamples({ markup: withPropertyAttributes(markup, assignments) }, componentApi.components);
}

/**
 * Keeps implementation code beside the live result it creates. Both
 * snippets derive from the scenario markup, so editing an example cannot leave
 * behind a detached, generic framework sample that demonstrates something else.
 */
export function ScenarioModeExample({
  markup,
  propertyAssignments = [],
  examples
}: {
  markup: string;
  propertyAssignments?: readonly ScenarioPropertyAssignment[];
  /** Hand-written code for some modes; the rest are derived from the markup. */
  examples?: Partial<FrameworkExamples>;
}): JSX.Element {
  const resolvedExamples = useMemo(
    () => ({ ...buildExamples(markup, propertyAssignments), ...examples }),
    [examples, markup, propertyAssignments]
  );

  return (
    <div className="looma-component-mode-example">
      <div className="looma-component-mode-example__header">
        <strong>Code</strong>
        <FrameworkModeSelector />
      </div>
      <FrameworkModeCode examples={resolvedExamples} />
    </div>
  );
}
