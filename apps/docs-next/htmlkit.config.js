import { writeComponentReference } from "./scripts/component-reference.mjs";

// The components whose pages place their generated Examples and API.
const documented = ["ui-stack"];

export default {
  plugins: [{
    name: "looma-component-reference",
    buildStart: ({ root, base }) => writeComponentReference({ root, base, tags: documented }),
  }],
};
