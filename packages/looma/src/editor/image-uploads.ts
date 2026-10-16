import type { Editor } from "@tiptap/core";
import { normalizeImageDimension } from "./extensions/image";
import { imageUploadContent, type LoomaImageDescriptor } from "./image-delivery";

/** What an image upload request's detail carries: the file to upload. */
export interface LoomaImageUploadDetail {
  file: File;
}

/**
 * Uploads one image and answers with the image to insert, or `null` to insert nothing. Paste,
 * drop, and file selection all upload through it.
 *
 * @ownership The application owns network requests, persistence, and the returned `src`. Looma
 * owns only inserting the image once the answer arrives.
 * @failure A rejection leaves the document unchanged and is reported through the editor's
 * `uploadError` event, so the host chooses retry and user messaging. An aborted `signal` means the
 * author canceled the upload; its rejection is not reported.
 */
export type LoomaImageUpload = (
  file: File,
  init: { readonly signal: AbortSignal; readonly progress: (loaded: number, total: number) => void },
) => LoomaImageDescriptor | null | PromiseLike<LoomaImageDescriptor | null>;

export interface LoomaImageUploadsState {
  readonly uploading: boolean;
  /** The current upload's progress as its uploader reports it, or null before it reports any. */
  readonly progress: { readonly loaded: number; readonly total: number } | null;
  /** The file whose upload failed last, which `retry()` sends again. */
  readonly failed: File | null;
}

export interface LoomaImageUploadsOptions {
  editor: Editor;
  /** Read on each upload, so a host can change it while the editor runs. */
  upload: () => LoomaImageUpload | null | undefined;
  onError: (error: unknown, file: File) => void;
}

/**
 * The editor's image uploads: each file goes to the host's uploader in turn, and the image it
 * returns is inserted at the selection.
 *
 * @ownership The host owns the upload and its URL; this owns the uploading state, the failed file,
 * and inserting the result.
 * @failure A rejected upload leaves the document unchanged, records the file for `retry()`, and is
 * reported through `onError`. A canceled upload leaves the document unchanged and reports nothing.
 */
export interface LoomaImageUploads {
  readonly state: LoomaImageUploadsState;
  /** Calls `listener` after every state change; returns the unsubscribe function. */
  subscribe(listener: () => void): () => void;
  /** Uploads each file in turn and inserts its image; does nothing without an uploader. */
  insert(files: Iterable<File>): Promise<void>;
  /** Sends the failed file again. */
  retry(): Promise<void>;
  /** Aborts the uploads in progress and the files still waiting their turn. */
  cancel(): void;
}

export function createImageUploads(options: LoomaImageUploadsOptions): LoomaImageUploads {
  const { editor } = options;
  const listeners = new Set<() => void>();
  const batches = new Set<AbortController>();
  let state: LoomaImageUploadsState = { uploading: false, progress: null, failed: null };
  const set = (patch: Partial<LoomaImageUploadsState>) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener());
  };

  const insertOne = async (file: File, signal: AbortSignal) => {
    const upload = options.upload();
    if (!upload || editor.isDestroyed || signal.aborted) return;
    set({ uploading: true, progress: null });
    try {
      const image = await upload(file, {
        signal,
        progress: (loaded, total) => { if (!signal.aborted) set({ progress: { loaded, total } }); },
      });
      if (image && !signal.aborted && !editor.isDestroyed) {
        const width = normalizeImageDimension(image.width);
        const height = normalizeImageDimension(image.height);
        editor.chain().focus().insertContent(imageUploadContent({
          src: image.src,
          alt: image.alt ?? file.name,
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
          ...(image.responsive === true ? { responsive: true } : {}),
        })).run();
      }
      if (!signal.aborted) set({ failed: null });
    } catch (error) {
      if (signal.aborted) return;
      set({ failed: file });
      options.onError(error, file);
    } finally {
      set({ uploading: false, progress: null });
    }
  };

  const run = async (files: Iterable<File>) => {
    const batch = new AbortController();
    batches.add(batch);
    try {
      for (const file of files) await insertOne(file, batch.signal);
    } finally {
      batches.delete(batch);
    }
  };

  return {
    get state() { return state; },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    insert: run,
    async retry() {
      if (state.failed) await run([state.failed]);
    },
    cancel() {
      batches.forEach((batch) => batch.abort(new DOMException("The upload was canceled.", "AbortError")));
    },
  };
}
