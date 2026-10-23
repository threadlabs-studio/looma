// The Vue editor: LoomaEditor, the editor components, and the framework-neutral editor contracts
// and Tiptap helpers.
export * from "@threadlabs/looma/editor";
export * from "./primitives";
export {
  LoomaEditor,
  type LoomaEditorToolbarMode,
  type LoomaEditorSelectionAction,
  type LoomaEditorSelectionActionDetail,
  type LoomaEditorRangeAction,
  type LoomaEditorRangeActionDetail,
  type LoomaEditorExtensions,
  type LoomaEditorSlashCommands,
  type LoomaSlashCommandsDetail,
  type LoomaLinkTarget,
  type LoomaLinkSearch,
  type LoomaLinkSearchDetail,
  type LoomaLinkResolve,
  type LoomaLinkResolveDetail,
  type LoomaMentionQuery,
  type LoomaMentionQueryDetail,
  type LoomaFileUploader,
  type LoomaImageUploader,
  type LoomaImageUploadDetail,
  type LoomaRequestInit,
  type LoomaResponder,
} from "./LoomaEditor";
export type {
  LoomaImageActivationDetail,
  LoomaImageActivationTrigger,
  LoomaImageAttributeResolver,
  LoomaImageSourceResolver,
  LoomaImageDescriptor,
  LoomaImageRenditionErrorDetail,
  LoomaImageRenditionAttributes,
} from "../../editor/image-delivery";

export type { LoomaFileDescriptor } from "../../editor/file-uploads";
