import { icons } from "../shared/icons.js";

// The icon's shapes, from Looma's icon set, for the template to draw.
export default function controller(host) {
  return host.effect(() => {
    host.state.shapes = (icons[host.state.name] ?? []).map(([tag, attributes]) => ({ tag, ...attributes }));
  });
}
