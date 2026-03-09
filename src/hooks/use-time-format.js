import { useState, useEffect } from "react";

/**
 * Custom hook for managing time format preference (24h/12h)
 * Syncs with localStorage
 */
export function useTimeFormat() {
  const [use24Hour, setUse24Hour] = useState(() => {
    const saved = localStorage.getItem("timeFormat");
    return saved === "12h" ? false : true;
  });

  // Save time format preference to localStorage
  useEffect(() => {
    localStorage.setItem("timeFormat", use24Hour ? "24h" : "12h");
  }, [use24Hour]);

  const toggleTimeFormat = () => setUse24Hour((prev) => !prev);

  return { use24Hour, setUse24Hour, toggleTimeFormat };
}
