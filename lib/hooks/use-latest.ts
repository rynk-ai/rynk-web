"use client";

import { useRef } from "react";

/**
 * A hook that returns a ref that always contains the latest value.
 * Useful for avoiding stale closures in callbacks without needing
 * separate useRef + useEffect patterns for each value.
 *
 * This replaces the common pattern of:
 * ```
 * const someRef = useRef(someValue);
 * useEffect(() => {
 *   someRef.current = someValue;
 * }, [someValue]);
 * ```
 *
 * With:
 * ```
 * const someRef = useLatest(someValue);
 * ```
 *
 * @param value The value to keep updated in the ref
 * @returns A ref that always contains the latest value
 */
export function useLatest<T>(value: T): React.MutableRefObject<T> {
  const ref = useRef(value);
  // Update the ref synchronously on every render
  // This is safe because we're only updating a ref, not triggering a re-render
  ref.current = value;
  return ref;
}
