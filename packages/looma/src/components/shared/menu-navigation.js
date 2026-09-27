const itemSelector = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
const searches = new WeakMap();

export function menuItemFrom(target) {
  return target?.closest?.(itemSelector) ?? null;
}

export function menuItems(menu) {
  return Array.from(menu.querySelectorAll(itemSelector)).filter((item) =>
    item.getAttribute("aria-disabled") !== "true" && !item.hasAttribute("disabled") && !item.closest("[hidden]"));
}

function label(item) {
  return (item.querySelector(".label")?.textContent ?? item.textContent ?? "").trim().toLocaleLowerCase();
}

/** Move within one open menu, including named groups; only enabled items receive focus. */
export function navigateMenu(event, menu) {
  const items = menuItems(menu);
  if (!items.length) return false;
  const current = menuItemFrom(event.target);
  const index = items.indexOf(current);
  let next = -1;
  switch (event.key) {
    case "ArrowDown": next = index < 0 ? 0 : (index + 1) % items.length; break;
    case "ArrowUp": next = index < 0 ? items.length - 1 : (index - 1 + items.length) % items.length; break;
    case "Home": next = 0; break;
    case "End": next = items.length - 1; break;
    default: {
      if (event.key.length !== 1 || event.key === " " || event.altKey || event.ctrlKey || event.metaKey) return false;
      const now = Date.now();
      const previous = searches.get(menu);
      const query = `${previous && now - previous.time < 700 ? previous.query : ""}${event.key.toLocaleLowerCase()}`;
      searches.set(menu, { query, time: now });
      const find = (prefix) => {
        for (let offset = 1; offset <= items.length; offset += 1) {
          const candidate = (index + offset + items.length) % items.length;
          if (label(items[candidate]).startsWith(prefix)) return candidate;
        }
        return -1;
      };
      next = find(query);
      if (next < 0 && query.length > 1) next = find(event.key.toLocaleLowerCase());
    }
  }
  event.preventDefault();
  if (next >= 0) items[next].focus();
  return true;
}
