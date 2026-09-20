import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

// True only once hydrated in the browser — used to gate content (like a
// portal target) that needs `document` and would otherwise mismatch
// between server and client on first render. useSyncExternalStore (rather
// than useState+useEffect) so React resyncs it during hydration itself,
// without a synchronous setState-in-effect.
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
