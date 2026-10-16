import { RequestEvent } from "@nextwebwg/html-next/runtime";

/**
 * What a responder function receives besides the detail, as in HTML Next's request contract.
 * @lifecycle `signal` aborts when the asker no longer needs the answer; `progress` reaches the asker
 * only while the request is pending.
 */
export interface LoomaRequestInit {
  readonly signal: AbortSignal;
  readonly progress: (loaded: number, total: number) => void;
}

/**
 * Answers one of the editor's requests: the answer, `null` for none, or a promise of either. It is
 * the converted-framework form of an HTML Next request, so it always answers.
 * @failure A rejection reaches the asker, which reports it as that request documents.
 */
export type LoomaResponder<Detail, Answer> = (detail: Detail, init: LoomaRequestInit) => Answer | null | PromiseLike<Answer | null>;

export interface LoomaRequestOptions {
  /** Abort to withdraw the request. */
  signal?: AbortSignal;
  /** Receives the responder's progress while the request is pending. */
  progress?: (loaded: number, total: number) => void;
}

// HTML Next exports the event but not its asker, so the asker reads the answer as it is given.
class AskedRequest extends RequestEvent<unknown, unknown> {
  answered = false;
  answer: unknown;
  report: ((loaded: number, total: number) => void) | undefined;

  override respondWith(answer: unknown): void {
    super.respondWith(answer);
    this.answered = true;
    this.answer = answer;
  }

  override progress(loaded: number, total: number): void {
    if (this.signal.aborted) return;
    // The asker's exception is reported as a listener's is, and never reaches the responder.
    try {
      this.report?.(loaded, total);
    } catch (error) {
      reportError(error);
    }
  }
}

/** Settles with `answer`, or rejects with the signal's reason when it aborts first. */
const settle = <Answer>(answer: PromiseLike<Answer>, signal: AbortSignal) => new Promise<Answer>((resolve, reject) => {
  const abort = () => reject(signal.reason);
  if (signal.aborted) abort();
  signal.addEventListener("abort", abort, { once: true });
  Promise.resolve(answer).then(
    (value) => { signal.removeEventListener("abort", abort); resolve(value); },
    (error) => { signal.removeEventListener("abort", abort); reject(error); },
  );
});

/**
 * Asks `name` at `root` as an HTML Next component's `host.request` does: dispatches a bubbling,
 * composed `RequestEvent`, and the nearest responder's answer settles it. A responder that answers
 * with a value, or no responder at all, settles it at once, so the answer is returned as it is; an
 * answer given as a promise is returned as a promise.
 *
 * @contract Settles `null` when no listener answers during the dispatch, or when the answer is `null`.
 * @failure Throws when the signal has already aborted. A promised answer rejects with the signal's
 * reason when it aborts before the answer arrives, and with the answer's own rejection.
 */
export function askRequest<Answer>(root: Element, name: string, detail: unknown, options: LoomaRequestOptions = {}): Answer | null | Promise<Answer | null> {
  const signal = options.signal ?? new AbortController().signal;
  signal.throwIfAborted();
  const event = new AskedRequest(name, { detail: detail ?? null, signal, bubbles: true, composed: true });
  event.report = options.progress;
  root.dispatchEvent(event);
  const answer = event.answered ? event.answer : null;
  if (!isThenable(answer)) {
    event.report = undefined;
    return (answer ?? null) as Answer | null;
  }
  return settle(answer, signal).then((value) => (value ?? null) as Answer | null).finally(() => { event.report = undefined; });
}

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | null)?.then === "function";

/** Calls `apply` with an answer from `askRequest` now, or once its promise fulfills. */
export function whenAnswered<Answer>(answer: Answer | null | Promise<Answer | null>, apply: (answer: Answer | null) => void): void | Promise<void> {
  return answer instanceof Promise ? answer.then(apply) : apply(answer);
}

/** Answers a request event with a responder function, as an HTML Next framework function prop does. */
export function respondWithFunction<Detail, Answer>(event: Event, responder: LoomaResponder<Detail, Answer>): void {
  const request = event as RequestEvent<Detail, Answer>;
  request.respondWith(responder(request.detail, { signal: request.signal, progress: (loaded, total) => request.progress(loaded, total) }));
}

/**
 * Calls `callback` with the request name when a responder announces itself, as HTML Next's
 * `respond()` does, on `root`, one of its ancestors, or the document.
 *
 * @lifecycle Listens on the document until the returned function is called.
 */
export function onResponderAnnounced(root: Element, callback: (name: string) => void): () => void {
  const document = root.ownerDocument;
  const listener = (event: Event) => {
    const name = (event as CustomEvent<{ name?: unknown } | null>).detail?.name;
    const target = event.target;
    if (typeof name === "string" && target instanceof Node && target.contains(root)) callback(name);
  };
  document.addEventListener("responder", listener);
  return () => document.removeEventListener("responder", listener);
}
