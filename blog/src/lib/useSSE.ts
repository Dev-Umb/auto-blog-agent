"use client";

import { useEffect, useRef } from "react";

type SSEHandler = (data: Record<string, unknown>) => void;
type ListenerEntry = { event: string; handler: SSEHandler };

let sharedSource: EventSource | null = null;
const handlers = new Map<string, Set<SSEHandler>>();
const boundEvents = new Set<string>();

function ensureSource(): EventSource {
  if (!sharedSource || sharedSource.readyState === EventSource.CLOSED) {
    sharedSource = new EventSource("/api/events");
    boundEvents.clear();

    sharedSource.onerror = () => {
      if (sharedSource?.readyState === EventSource.CLOSED) {
        sharedSource = null;
        boundEvents.clear();
      }
    };
  }
  return sharedSource;
}

function bindEvent(event: string) {
  if (boundEvents.has(event)) return;
  boundEvents.add(event);

  ensureSource().addEventListener(event, ((e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data);
      handlers.get(event)?.forEach((h) => h(data));
    } catch {
      // ignore parse errors
    }
  }) as EventListener);
}

/**
 * Subscribe to SSE event types through a single shared EventSource connection.
 * The connection persists across page navigations to avoid reconnect delays.
 */
export function useSSE(entries: ListenerEntry[]) {
  const prevRef = useRef<ListenerEntry[]>([]);

  useEffect(() => {
    ensureSource();

    const current = entries;
    current.forEach(({ event, handler }) => {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      bindEvent(event);
    });

    prevRef.current = current;

    return () => {
      current.forEach(({ event, handler }) => {
        handlers.get(event)?.delete(handler);
      });
    };
  });
}
