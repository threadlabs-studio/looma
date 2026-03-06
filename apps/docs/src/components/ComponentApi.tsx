import React from "react";

import componentApi from "../../../../generated/component-api.json";

interface ComponentApiProps {
  component: string;
}

interface ComponentApiAttribute {
  name: string;
  property: string;
  type: string;
  default?: string | boolean;
  options?: string[];
}

interface ComponentApiProperty {
  name: string;
  type: string;
  default?: string | boolean;
  options?: string[];
}

interface ComponentApiEvent {
  name: string;
  detailType: string;
  detailSchema?: string;
  detailDocs?: string;
}

interface ComponentApiRecord {
  tag: string;
  description: string;
  package: string;
  className: string;
  attributes: ComponentApiAttribute[];
  properties: ComponentApiProperty[];
  events: ComponentApiEvent[];
}

interface ComponentApiMetadata {
  components: ComponentApiRecord[];
}

const metadata = componentApi as ComponentApiMetadata;

function SectionHeader({ title }: { title: string }): JSX.Element {
  return <h3>{title}</h3>;
}

export function ComponentApi({ component }: ComponentApiProps): JSX.Element {
  const api = metadata.components.find((entry) => entry.tag === component);

  if (!api) {
    return <p>No generated API metadata found for `{component}`.</p>;
  }

  return (
    <div>
      {api.description ? <p>{api.description}</p> : null}
      <p>
        <strong>Package:</strong> <code>{api.package}</code> <strong>Class:</strong>{" "}
        <code>{api.className}</code>
      </p>

      <SectionHeader title="Attributes" />
      {api.attributes.length === 0 ? (
        <p>No observed attributes.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Property</th>
              <th>Type</th>
              <th>Default</th>
              <th>Options</th>
            </tr>
          </thead>
          <tbody>
            {api.attributes.map((attribute) => (
              <tr key={attribute.name}>
                <td>
                  <code>{attribute.name}</code>
                </td>
                <td>
                  <code>{attribute.property}</code>
                </td>
                <td>
                  <code>{attribute.type}</code>
                </td>
                <td>
                  <code>{typeof attribute.default === "undefined" ? "-" : String(attribute.default)}</code>
                </td>
                <td>
                  <code>{attribute.options?.length ? attribute.options.join(" | ") : "-"}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SectionHeader title="Properties" />
      {api.properties.length === 0 ? (
        <p>No public properties.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Options</th>
            </tr>
          </thead>
          <tbody>
            {api.properties.map((property) => (
              <tr key={property.name}>
                <td>
                  <code>{property.name}</code>
                </td>
                <td>
                  <code>{property.type}</code>
                </td>
                <td>
                  <code>{typeof property.default === "undefined" ? "-" : String(property.default)}</code>
                </td>
                <td>
                  <code>{property.options?.length ? property.options.join(" | ") : "-"}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SectionHeader title="Events" />
      {api.events.length === 0 ? (
        <p>No custom events.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Detail Type</th>
              <th>Detail Schema</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {api.events.map((event) => (
              <tr key={event.name}>
                <td>
                  <code>{event.name}</code>
                </td>
                <td>
                  <code>{event.detailType}</code>
                </td>
                <td>
                  <code>{event.detailSchema ?? "-"}</code>
                </td>
                <td>{event.detailDocs ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
