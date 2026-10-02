import { trackTrigger } from "../shared/trigger.js";

let disclosures = 0;
const groups = new WeakMap();

function groupFor(document, name) {
  let byName = groups.get(document);
  if (!byName) { byName = new Map(); groups.set(document, byName); }
  let members = byName.get(name);
  if (!members) { members = new Set(); byName.set(name, members); }
  return members;
}

// `open` sets the disclosure initially and whenever it changes; the trigger toggles the state.
export default function controller(host) {
  const document = host.element.ownerDocument;
  const [trigger, stopTracking] = trackTrigger(host);
  host.state.contentId = `ui-disclosure-${++disclosures}`;
  let external = host.props.open.value;
  host.state.internalOpen = Boolean(external);
  let groupName = "";
  const member = {
    close(reason, how) {
      if (!host.state.internalOpen) return;
      host.state.internalOpen = false;
      host.dispatch("close", { open: false, reason, trigger: how });
    },
  };
  const syncGroup = (reason, how) => {
    const name = String(host.props.name.value || "");
    if (name !== groupName) {
      if (groupName) groupFor(document, groupName).delete(member);
      groupName = name;
      if (groupName) groupFor(document, groupName).add(member);
    }
    if (name && host.state.internalOpen) {
      for (const peer of groupFor(document, name)) if (peer !== member) peer.close(reason, how);
    }
  };
  const stop = host.effect(() => {
    if (host.props.open.value !== external) {
      external = host.props.open.value;
      host.state.internalOpen = Boolean(external);
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
    const how = trigger();
    host.state.internalOpen = open;
    if (open) syncGroup("action", how);
    host.dispatch(open ? "open" : "close", { open, reason: "action", trigger: how });
  };
  const onBeforematch = () => queueMicrotask(() => {
    if (host.state.internalOpen) return;
    host.state.internalOpen = true;
    syncGroup("programmatic", "programmatic");
    host.dispatch("open", { open: true, reason: "programmatic", trigger: "programmatic" });
  });
  host.refs.trigger.addEventListener("click", onClick);
  host.refs.panel.addEventListener("beforematch", onBeforematch);
  return () => {
    stop();
    stopTracking();
    if (groupName) groupFor(document, groupName).delete(member);
    host.refs.trigger.removeEventListener("click", onClick);
    host.refs.panel.removeEventListener("beforematch", onBeforematch);
  };
}
