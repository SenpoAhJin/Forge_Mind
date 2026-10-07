/**
 * Server reachability state, shared by every service.
 *
 * No React, no navigation, never throws. The request helpers call
 * markReachable() on any HTTP response (any status code — a 401 or a 500 still
 * proves the server answered) and markUnreachable() on a network failure
 * (throw, connect exception, timeout, abort).
 */

type ServerStatusListener = (reachable: boolean) => void;

let reachable = true; // Optimistic until the first request proves otherwise.
const listeners = new Set<ServerStatusListener>();

function emit(value: boolean): void {
  for (const listener of Array.from(listeners)) {
    try {
      listener(value);
    } catch {
      // A throwing subscriber must never break the others or this module.
    }
  }
}

export function markReachable(): void {
  if (!reachable) {
    reachable = true;
    emit(true);
  }
}

export function markUnreachable(): void {
  if (reachable) {
    reachable = false;
    emit(false);
  }
}

export function isServerReachable(): boolean {
  return reachable;
}

/** Subscribe to reachability changes. Returns an unsubscribe function. */
export function subscribeServerStatus(listener: ServerStatusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}