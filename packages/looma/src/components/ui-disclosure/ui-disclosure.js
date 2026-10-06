import { trackTrigger } from "../shared/trigger.js";

let disclosures = 0;
const groups = new WeakMap();
const pendingGroups = new WeakSet();

function groupFor(document, name) {
  let byName = groups.get(document);
  if (!byName) { byName = new Map(); groups.set(document, byName); }
  let members = byName.get(name);
  if (!members) { members = new Set(); byName.set(name, members); }
  return members;
}

function ensureOpen(members) {
  if (pendingGroups.has(members)) return;
  pendingGroups.add(members);
  queueMicrotask(() => {
    pendingGroups.delete(members);
    const current = [...members];
    if (!current.some(member => member.required()) || current.some(member => member.isOpen())) return;
    const candidate = current.find(member => !member.disabled()) || current[0];
    candidate?.open();
  });
}

function leaveGroup(document, name, member) {
  const byName = groups.get(document);
  const members = byName?.get(name);
  if (!members) return;
  members.delete(member);
  if (!members.size) byName.delete(name);
  else ensureOpen(members);
}

// `open` sets the disclosure initially and whenever it changes; the trigger toggles the state.
function connect(host) {
  const document = host.element.ownerDocument;
  const [trigger, stopTracking] = trackTrigger(host);
  host.state.contentId = `ui-disclosure-${++disclosures}`;
  let external = host.props.open.value;
  host.state.internalOpen = Boolean(external);
  let groupName = "";
  let disposed = false;
  const member = {
    isOpen: () => Boolean(host.state.internalOpen),
    required: () => Boolean(host.props.requiredOpen.value),
    disabled: () => Boolean(host.props.disabled.value),
    open() {
      if (disposed || host.state.internalOpen) return;
      host.state.internalOpen = true;
      syncGroup("programmatic", "programmatic");
      host.dispatch("open", { open: true, reason: "programmatic", trigger: "programmatic" });
    },
    close(reason, how) {
      if (!host.state.internalOpen) return;
      host.state.internalOpen = false;
      host.dispatch("close", { open: false, reason, trigger: how });
    },
  };
  const syncGroup = (reason, how) => {
    const name = String(host.props.name.value || "");
    if (name !== groupName) {
      if (groupName) leaveGroup(document, groupName, member);
      groupName = name;
      if (groupName) groupFor(document, groupName).add(member);
    }
    if (name && host.state.internalOpen) {
      for (const peer of groupFor(document, name)) if (peer !== member) peer.close(reason, how);
    }
    if (name) ensureOpen(groupFor(document, name));
  };
  const mayClose = () => {
    if (!groupName) return true;
    const members = [...groupFor(document, groupName)];
    return !members.some(peer => peer.required()) || members.some(peer => peer !== member && peer.isOpen());
  };
  const stop = host.effect(() => {
    if (host.props.open.value !== external) {
      external = host.props.open.value;
      if (external || mayClose()) host.state.internalOpen = Boolean(external);
    }
    const level = Number(host.props.headingLevel.value);
    host.state.headingRole = Number.isInteger(level) && level >= 2 && level <= 6 ? "heading" : null;
    host.state.headingAriaLevel = host.state.headingRole ? level : null;
    syncGroup("programmatic", "programmatic");
    if (host.state.internalOpen) host.refs.panel.removeAttribute("hidden");
    else host.refs.panel.setAttribute("hidden", "until-found");
  });
  const onClick = () => {
    if (host.props.disabled.value) return;
    const open = !host.state.internalOpen;
    if (!open && !mayClose()) return;
    const how = trigger();
    host.state.internalOpen = open;
    if (open) syncGroup("action", how);
    host.dispatch(open ? "open" : "close", { open, reason: "action", trigger: how });
  };
  const onBeforematch = () => queueMicrotask(() => {
    if (disposed || host.state.internalOpen) return;
    host.state.internalOpen = true;
    syncGroup("programmatic", "programmatic");
    host.dispatch("open", { open: true, reason: "programmatic", trigger: "programmatic" });
  });
  host.refs.trigger.addEventListener("click", onClick);
  host.refs.panel.addEventListener("beforematch", onBeforematch);
  const measureHeading = () => host.element.style.setProperty("--_ui-disclosure-heading-size", `${host.refs.heading.getBoundingClientRect().height}px`);
  const ResizeObserver = document.defaultView?.ResizeObserver;
  const headingObserver = ResizeObserver ? new ResizeObserver(measureHeading) : null;
  headingObserver?.observe(host.refs.heading);
  measureHeading();
  return () => {
    disposed = true;
    headingObserver?.disconnect();
    stop();
    stopTracking();
    if (groupName) leaveGroup(document, groupName, member);
    host.refs.trigger.removeEventListener("click", onClick);
    host.refs.panel.removeEventListener("beforematch", onBeforematch);
  };
}

/** Keep DOM setup and its cleanup tied to each connection, including reconnects. */
export default function controller(host) {
  host.on("connect", () => connect(host));
}
