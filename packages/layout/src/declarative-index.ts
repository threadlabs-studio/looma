import { registerLoomaPackage } from "@threadlabs/looma-core/declarative";
import { records, styles } from "../../../tools/migrate-html-next/generated/adoption/layout/registry.js";

export type SidebarResizeTrigger = "keyboard" | "pointer" | "programmatic";
export interface SidebarResizeDetail { width: number; trigger: SidebarResizeTrigger }

registerLoomaPackage("layout", records, styles);
