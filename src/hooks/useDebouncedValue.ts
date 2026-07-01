import { useState, useEffect } from "react";

/**
 * Debounce a value by the given delay (ms).
 * Returns the debounced value that updates only after the delay.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
