// Following an outline link should land in the document, including when the outline is a drawer.
export default function setup(root) {
  const navigation = root.querySelector("[data-outline]");
  const follow = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const drawer = navigation.closest('aside:popover-open');
    drawer?.hidePopover();
    const target = root.ownerDocument.getElementById(link.hash.slice(1));
    target?.focus({ preventScroll: true });
  };
  navigation.addEventListener("click", follow);
  return () => navigation.removeEventListener("click", follow);
}
