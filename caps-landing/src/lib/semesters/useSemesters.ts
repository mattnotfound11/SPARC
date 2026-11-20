"use client";

import { useCallback, useEffect, useState } from "react";
import { loadSemesters, saveSemesters } from "./data";
import type { Semester } from "./semesters";

/** The semester calendar for a screen. `semesters` is null while it loads. */
export function useSemesters() {
  const [semesters, setSemesters] = useState<Semester[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSemesters().then(
      (list) => alive && setSemesters(list),
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, []);

  /** Saves a new calendar; resolves to an error message, or null when saved. */
  const save = useCallback(async (list: Semester[]) => {
    const problem = await saveSemesters(list);
    if (!problem) setSemesters([...list].sort((a, b) => a.startsAt - b.startsAt));
    return problem;
  }, []);

  return { semesters, failed, save };
}
