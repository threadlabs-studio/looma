import { registerLoomaPackage } from "@threadlabs/looma-core/declarative";
import { records, styles } from "./declarative/registry.js";

/**
 * Origin of a sidebar width transition.
 * The trigger is stable across native HTML and framework adapters, allowing an
 * application to persist or announce user changes without treating initial
 * programmatic synchronization as input.
 */
export type SidebarResizeTrigger = "keyboard" | "pointer" | "programmatic";

/**
 * Effective, clamped sidebar width after a transition.
 * Consumers should use this value rather than remeasure during the event; it is
 * already normalized against the component's min/max contract.
 */
export interface SidebarResizeDetail { width: number; trigger: SidebarResizeTrigger }

// Importing the package installs the materialized graph exactly once. The core
// registry owns idempotency so facade and direct imports can safely coexist.
registerLoomaPackage("layout", records, styles);
