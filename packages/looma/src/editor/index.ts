/**
 * The Looma editor: the editor components' contracts and the Tiptap extensions and commands
 * (also available alone from `./extensions`).
 */

export * from "./ui";
export * from "./extensions/index";
export { LOOMA_ICONS, loomaIconMarkup, type LoomaIconName, type LoomaIconNode } from "./icons";
export { getVisualViewportRect, type ViewportRect } from "./viewport";

export {
  createDocumentEditorSession,
  type DocumentEditorProps, type DocumentEditorPort,
  type LoomaEditorToolbarMode, type LoomaEditorExtensions, type LoomaEditorSlashCommands,
  type LoomaSlashCommandsDetail, type LoomaLinkSearch, type LoomaLinkSearchDetail,
  type LoomaLinkResolve, type LoomaLinkResolveDetail, type LoomaMentionQuery,
  type LoomaMentionQueryDetail, type LoomaImageUploader, type LoomaFileUploader,
  type LoomaImageUploadDetail, type LoomaRequestInit, type LoomaResponder,
  type LoomaEditorSelectionAction, type LoomaEditorSelectionActionDetail,
  type LoomaEditorRangeAction, type LoomaEditorRangeActionDetail,
} from "./document-session";
export type {
  LoomaImageDescriptor, LoomaImageSourceResolver, LoomaImageAttributeResolver,
  LoomaImageActivationDetail, LoomaImageActivationTrigger, LoomaImageRenditionErrorDetail,
  LoomaImageRenditionAttributes,
} from "./image-delivery";
export type { LoomaFileDescriptor } from "./file-uploads";
export { createToolbarTooltip } from "./toolbar-tooltip";
