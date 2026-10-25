import { componentRegistry } from "@nextwebwg/html-next/runtime";

/** Reflect navigation requests into this example's bounded, consumer-owned page window. */
export default function setup(root) {
  const navigate = (event) => {
    const page = event.detail.page;
    const values = [...new Set([1, page - 1, page, page + 1, 10])].filter(value => value >= 1 && value <= 10).sort((a, b) => a - b);
    componentRegistry.update(event.target, { page, pages: values.map(value => ({ value })), hasPrevious: page > 1, hasNext: page < 10 });
  };
  root.addEventListener("navigate", navigate);
  return () => root.removeEventListener("navigate", navigate);
}
