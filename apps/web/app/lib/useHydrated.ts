"use client";

import { useSyncExternalStore } from "react";

const subscribe = (() => () => undefined) as (onStoreChange: () => void) => () => void;

function getSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function useHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
