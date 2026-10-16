import type { RequestEvent, Responder, ResponderInit } from "@nextwebwg/html-next/runtime";

/**
 * What a responder function receives besides the detail, as in HTML Next's request contract.
 * @lifecycle `signal` aborts when the asker no longer needs the answer; `progress` reaches the asker
 * only while the request is pending.
 */
export type LoomaRequestInit = ResponderInit;

/**
 * Answers one of the editor's requests: the answer, `null` for none, or a promise of either. It is
 * the converted-framework form of an HTML Next request, so it always answers.
 * @failure A rejection reaches the asker, which reports it as that request documents.
 */
export type LoomaResponder<Detail, Answer> = Responder<Detail, Answer>;

/** Answers a request event with a responder function, as an HTML Next framework function prop does. */
export function respondWithFunction<Detail, Answer>(event: Event, responder: LoomaResponder<Detail, Answer>): void {
  const request = event as RequestEvent<Detail, Answer>;
  request.respondWith(responder(request.detail, { signal: request.signal, progress: (loaded, total) => request.progress(loaded, total) }));
}

/**
 * Calls `callback` with the request name when a responder announces itself, as
 * `RequestEvent.respond()` does, on `root`, one of its ancestors, or the document.
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
