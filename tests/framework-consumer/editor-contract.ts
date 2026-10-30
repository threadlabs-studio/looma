import { UiEditor, UiCompactEditor, UiCompactContent } from "@threadlabs/looma";

type DocumentInstance = InstanceType<typeof UiEditor>;
type DocumentProps = DocumentInstance["$props"];
type CompactProps = InstanceType<typeof UiCompactEditor>["$props"];
type ContentProps = InstanceType<typeof UiCompactContent>["$props"];
type LegacyProp = "modelValue" | "references" | "editable" | "contentDensity" | "placeholder" | "label" | "extensions" | "slashCommands" | "codeLanguages" | "mentionItems" | "mentionQuery" | "mentionLimit" | "linkBaseUrl" | "linkSearch" | "linkResolve" | "linkTargetLabel" | "fileUpload" | "imageUpload" | "resolveImageAttributes" | "resolveImageSource" | "toolbarMode" | "compactToolbar" | "selectionActions" | "rangeActions" | "toolbarTriggerId" | "toolbarOpen" | "disableHighlight";

// Each old input has one replacement. Services keep their request responder names; image
// source/rendition functions move into the image-delivery answer instead of data props.
export const propMigration = {
  modelValue: "content", references: "references", editable: "editable", contentDensity: "contentDensity",
  placeholder: "placeholder", label: "label", extensions: "extensions", slashCommands: "slashCommands",
  codeLanguages: "codeLanguages", mentionItems: "mentionItems", mentionQuery: "mentionQuery", mentionLimit: "mentionLimit",
  linkBaseUrl: "linkBaseUrl", linkSearch: "linkSearch", linkResolve: "linkResolve", linkTargetLabel: "linkTargetLabel",
  fileUpload: "fileUpload", imageUpload: "imageUpload", resolveImageAttributes: "imageDelivery", resolveImageSource: "imageDelivery",
  toolbarMode: "toolbarMode", compactToolbar: "compactToolbar", selectionActions: "selectionActions", rangeActions: "rangeActions",
  toolbarTriggerId: "toolbarTriggerId", toolbarOpen: "toolbarOpen", disableHighlight: "disableHighlight",
} as const satisfies Record<LegacyProp, keyof DocumentProps>;

type ListenerEvent<Key> = Key extends `on${infer Name}` ? Uncapitalize<Name> : never;
type CurrentEvent = ListenerEvent<keyof DocumentProps>;
type LegacyEvent = "update:modelValue" | "update" | "ready" | "update:toolbarOpen" | "selectionAction" | "rangeAction" | "uploadError" | "imageActivate" | "imageRenditionError";
export const eventMigration = {
  "update:modelValue": "change", update: "change", ready: "removed",
  "update:toolbarOpen": ["toolbar-open", "toolbar-close"], selectionAction: "selection-action", rangeAction: "range-action",
  uploadError: "upload-error", imageActivate: "image-activate", imageRenditionError: "image-rendition-error",
} as const satisfies Record<LegacyEvent, CurrentEvent | readonly CurrentEvent[] | "removed">;

const content = { type: "doc", content: [{ type: "paragraph" }] };
export const document: DocumentProps = {
  content, codeLanguages: () => ({}), extensions: () => [], imageDelivery: () => ({}),
  onChange: event => { const changed: { readonly type: string } = event.detail.content; void changed; },
};
export const compact: CompactProps = { content, label: "Message", id: "message", editable: true, extensions: () => [] };
export const rendered: ContentProps = { content };

// Removed component APIs must stay absent; these are compile-time assertions, not adapters.
type Removed = Extract<"modelValue" | "onReady" | "editor" | "getEditor" | "focus", keyof DocumentProps | keyof DocumentInstance | keyof CompactProps | keyof InstanceType<typeof UiCompactEditor>>;
export const removed: Record<Removed, never> = {};
