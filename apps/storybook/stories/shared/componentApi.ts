import componentApi from "../../../../generated/component-api.json";

type ControlType = "text" | "boolean";

interface ApiAttribute {
  name: string;
  property: string;
  type: string;
  default?: string | boolean;
  options?: string[];
}

interface ApiComponent {
  tag: string;
  description: string;
  attributes: ApiAttribute[];
}

interface ApiMetadata {
  components: ApiComponent[];
}

type ArgTypeEntry = {
  control: ControlType;
  description: string;
  table: {
    category: "attributes";
    type: { summary: string };
  };
};

const metadata = componentApi as ApiMetadata;

function isBooleanType(type: string): boolean {
  return type === "boolean";
}

export function createComponentArgTypes(componentTag: string): Record<string, ArgTypeEntry> {
  const component = metadata.components.find((entry) => entry.tag === componentTag);
  if (!component) {
    return {};
  }

  const argTypes: Record<string, ArgTypeEntry> = {};

  for (const attribute of component.attributes) {
    argTypes[attribute.name] = {
      control: isBooleanType(attribute.type) ? "boolean" : "text",
      description: createAttributeDescription(attribute),
      table: {
        category: "attributes",
        type: {
          summary: attribute.type
        }
      }
    };
  }

  return argTypes;
}

function createAttributeDescription(attribute: ApiAttribute): string {
  const details = [`Maps to \`${attribute.property}\` property.`];
  if (typeof attribute.default !== "undefined") {
    details.push(`Default: \`${String(attribute.default)}\`.`);
  }
  if (attribute.options && attribute.options.length > 0) {
    details.push(`Options: \`${attribute.options.join(" | ")}\`.`);
  }
  return details.join(" ");
}

export function createComponentDocsParameters(componentTag: string): Record<string, unknown> {
  const component = metadata.components.find((entry) => entry.tag === componentTag);
  if (!component || !component.description) {
    return {};
  }

  return {
    docs: {
      description: {
        component: component.description
      }
    }
  };
}
