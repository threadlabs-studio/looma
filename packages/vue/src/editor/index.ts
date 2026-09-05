// The Vue editor entry is the complete Looma editor integration: it registers
// editor UI, exports the framework-neutral Tiptap helpers, and adds Vue wrappers.
import "@threadlabs/looma-editor";

export * from "@threadlabs/looma-editor";
export * from "./primitives";
export {
  LoomaEditor,
  type LoomaImageUploader,
  type LoomaImageUploadResult,
} from "./LoomaEditor";
export type {
  LoomaImageActivationDetail,
  LoomaImageActivationTrigger,
  LoomaImageAttributeResolver,
  LoomaImageDescriptor,
  LoomaImageRenditionErrorDetail,
  LoomaImageRenditionAttributes,
} from "./image-delivery";
