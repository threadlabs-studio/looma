import React from "react";

import componentApi from "../../../../generated/component-api.json";

interface ComponentApiProps {
  component: string;
}

interface ComponentApiAttribute {
  name: string;
  property: string;
  type: string;
  default?: unknown;
  options?: string[];
}

interface ComponentApiProperty {
  name: string;
  type: string;
  default?: unknown;
  options?: string[];
  channel: "attribute | property" | "property";
}

interface ComponentApiMethod {
  name: string;
  returns: string;
}

interface ComponentApiSlot {
  name: string;
  description: string;
}

interface ComponentApiEvent {
  name: string;
  detailType: string;
  detailSchema?: string;
  detailDocs?: string;
}

interface ComponentDesignToken {
  name: string;
  declarations?: string[];
  fallbacks?: string[];
}

interface ComponentDesignTokens {
  sources: string[];
  component: ComponentDesignToken[];
  shared: ComponentDesignToken[];
}

interface ComponentApiRecord {
  tag: string;
  navigationParent?: string;
  description: string;
  package: string;
  root: string;
  designTokens: ComponentDesignTokens;
  attributes: ComponentApiAttribute[];
  properties: ComponentApiProperty[];
  methods: ComponentApiMethod[];
  events: ComponentApiEvent[];
  slots: ComponentApiSlot[];
}

interface ComponentApiMetadata {
  components: ComponentApiRecord[];
}

const metadata = componentApi as ComponentApiMetadata;

function SectionHeader({ title }: { title: string }): JSX.Element {
  return (
    <h2 style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>{title}</h2>
  );
}

function TokenValues({ values }: { values?: string[] }): JSX.Element {
  return <code>{values?.length ? values.join(" | ") : "-"}</code>;
}

function DesignTokenTable({
  tokens,
  firstColumn,
  showDeclarations,
}: {
  tokens: ComponentDesignToken[];
  firstColumn: string;
  showDeclarations: boolean;
}): JSX.Element {
  return (
    <table className="looma-api-table">
      <thead>
        <tr>
          <th>{firstColumn}</th>
          {showDeclarations ? <th>Declared values in component CSS</th> : null}
          <th>{showDeclarations ? "Fallback when unset" : "Fallback in component CSS"}</th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((token) => (
          <tr key={token.name}>
            <td><code>{token.name}</code></td>
            {showDeclarations ? <td><TokenValues values={token.declarations} /></td> : null}
            <td><TokenValues values={token.fallbacks} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ComponentApi({ component }: ComponentApiProps): JSX.Element {
  const api = metadata.components.find((entry) => entry.tag === component);

  if (!api) {
    return <p>No generated API metadata found for `{component}`.</p>;
  }

  return (
    <div className="looma-api">
      {api.description ? <p>{api.description}</p> : null}
      <p style={{ fontSize: "0.875rem", color: "var(--ifm-font-color-secondary)" }}>
        <strong>Package:</strong> <code>{api.package}</code>
        {" · "}
        <strong>Native root:</strong> <code>{`<${api.root}>`}</code>
      </p>

      <SectionHeader title="Design tokens" />
      <p>
        Extracted from <code>{api.designTokens.sources.join(", ")}</code>. Component tokens are
        scoped customization points or variables declared by this component; shared tokens come
        from Looma&apos;s token and theme layers.
      </p>
      <h3>Component tokens</h3>
      {api.designTokens.component.length === 0 ? (
        <p>No component-scoped custom properties.</p>
      ) : (
        <DesignTokenTable
          tokens={api.designTokens.component}
          firstColumn="Component token"
          showDeclarations
        />
      )}
      <h3>Shared tokens consumed</h3>
      {api.designTokens.shared.length === 0 ? (
        <p>No shared tokens consumed.</p>
      ) : (
        <DesignTokenTable
          tokens={api.designTokens.shared}
          firstColumn="Shared token"
          showDeclarations={false}
        />
      )}

      <SectionHeader title="Attributes" />
      {api.attributes.length === 0 ? (
        <p>No observed attributes.</p>
      ) : (
        <table className="looma-api-table">
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
        <table className="looma-api-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Options</th>
              <th>Input channel</th>
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
                <td><code>{property.channel}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SectionHeader title="Methods" />
      {api.methods.length === 0 ? (
        <p>No public methods.</p>
      ) : (
        <table className="looma-api-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Returns</th>
            </tr>
          </thead>
          <tbody>
            {api.methods.map((method) => (
              <tr key={method.name}>
                <td><code>{method.name}</code></td>
                <td><code>{method.returns}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <SectionHeader title="Events" />
      {api.events.length === 0 ? (
        <p>No custom events.</p>
      ) : (
        <table className="looma-api-table">
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

      <SectionHeader title="Slots" />
      {api.slots.length === 0 ? (
        <p>No content slots.</p>
      ) : (
        <table className="looma-api-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            {api.slots.map((slot) => (
              <tr key={slot.name}>
                <td><code>{slot.name}</code></td>
                <td>{slot.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {metadata.components
        .filter((entry) => entry.navigationParent === component)
        .map((part) => (
          <section className="looma-compound-api" key={part.tag}>
            <SectionHeader title={`${part.tag.replace(/^ui-/, "")} API`} />
            <p>
              <code>{`<${part.tag}>`}</code> is a compound part of <code>{`<${component}>`}</code>.
              Its complete contract follows here so it does not need a misleading standalone page.
            </p>
            <ComponentApi component={part.tag} />
          </section>
        ))}
    </div>
  );
}
