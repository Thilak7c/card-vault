"use client";
import { useSyncExternalStore } from "react";

// Per-device preferences in localStorage. Every access is guarded because
// storage can be unavailable (private windows, blocked site data).
const KEYS = {
  privateMode: "cv:privateMode",
  lastEvent: "cv:lastEvent",
  lastExport: "cv:lastExport",
} as const;

export function getPref(key: keyof typeof KEYS): string | null {
  try {
    return localStorage.getItem(KEYS[key]);
  } catch {
    return null;
  }
}

export function setPref(key: keyof typeof KEYS, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(KEYS[key]);
    else localStorage.setItem(KEYS[key], value);
  } catch {}
  window.dispatchEvent(new Event("cv:prefs"));
}

function subscribe(cb: () => void) {
  window.addEventListener("cv:prefs", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("cv:prefs", cb);
    window.removeEventListener("storage", cb);
  };
}

export function usePref(key: keyof typeof KEYS): string | null {
  return useSyncExternalStore(subscribe, () => getPref(key), () => null);
}

export const usePrivateMode = () => usePref("privateMode") === "1";
