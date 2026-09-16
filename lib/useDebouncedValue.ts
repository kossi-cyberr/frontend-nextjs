"use client";

import { useEffect, useState } from "react";

/**
 * Renvoie la valeur différée de `value` après `delay` ms sans changement.
 * Évite de déclencher une requête API à chaque frappe dans les champs de recherche.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
