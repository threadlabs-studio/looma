import type { Editor } from "@tiptap/core";
import { normalizeImageDimension } from "./extensions/image";
import { imageUploadContent, type LoomaImageDescriptor } from "./image-delivery";

/**
 * Host upload result normalized into the editor's durable image descriptor.
 * `url` becomes the stored `src`; optional dimensions preserve layout before
 * the image loads and `responsive` opts into host-provided rendition policy.
 */
export interface LoomaImageUploadResult extends Omit<LoomaImageDescriptor, "src"> {
  url: string;
}

/**
 * Application-owned upload boundary used by paste, drop, and file selection.
 *
 * @ownership The application owns network requests, persistence, and returned
 * URLs. Looma owns only editor insertion after the promise fulfills.
 * @failure Rejection leaves the document unchanged and is surfaced through the
 * editor's `uploadError` event so the host chooses retry and user messaging.
 */
export type LoomaImageUploader = (
  file: File,
) => Promise<string | LoomaImageUploadResult>;

export interface LoomaImageUploadsState {
  readonly uploading: boolean;
  /** The file whose upload failed last, which `retry()` sends again. */
  readonly failed: File | null;
}

export interface LoomaImageUploadsOptions {
  editor: Editor;
  /** Read on each upload, so a host can change it while the editor runs. */
  upload: () => LoomaImageUploader | null | undefined;
  onError: (error: unknown, file: File) => void;
}

/**
 * The editor's image uploads: each file goes to the host's uploader in turn, and the image it
 * returns is inserted at the selection.
 *
 * @ownership The host owns the upload and its URL; this owns the uploading state, the failed file,
 * and inserting the result.
 * @failure A rejected upload leaves the document unchanged, records the file for `retry()`, and is
 * reported through `onError`.
 */
export interface LoomaImageUploads {
  readonly state: LoomaImageUploadsState;
  /** Calls `listener` after every state change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Uploads each file in turn and inserts its image; does nothing without an uploader. */
  insert(files: Iterable<File>): Promise<void>;
  /** Sends the failed file again. */
  retry(): Promise<void>;
}

export function createImageUploads(options: LoomaImageUploadsOptions): LoomaImageUploads {
  const { editor } = options;
  const listeners = new Set<() => void>();
  let state: LoomaImageUploadsState = { uploading: false, failed: null };
  const set = (patch: Partial<LoomaImageUploadsState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  const insertOne = async (file: File) => {
    const upload = options.upload();
    if (!upload || editor.isDestroyed) return;
    set({ uploading: true });
    try {
      const result = await upload(file);
      const image = typeof result === "string" ? { url: result } : result;
      const width = normalizeImageDimension(image.width);
      const height = normalizeImageDimension(image.height);
      if (!editor.isDestroyed) {
        editor.chain().focus().insertContent(imageUploadContent({
          src: image.url,
          alt: image.alt ?? file.name,
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
          ...(image.responsive === true ? { responsive: true } : {}),
        })).run();
      }
      set({ failed: null });
    } catch (error) {
      set({ failed: file });
      options.onError(error, file);
    } finally {
      set({ uploading: false });
    }
  };

  return {
    get state() { return state; },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    async insert(files) {
      for (const file of files) await insertOne(file);
    },
    async retry() {
      if (state.failed) await insertOne(state.failed);
    },
  };
}
