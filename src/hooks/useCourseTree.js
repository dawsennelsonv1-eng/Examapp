// src/hooks/useCourseTree.js
// Reads AI-authored, PUBLISHED course trees from Supabase (course_tree table).
// Students only ever see status='published'. Falls back gracefully when Supabase
// isn't configured (returns empty → Cours tab shows nothing rather than crashing).

import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

// Deterministic, stable IDs so lesson cache + quiz attachment stay consistent
// across reloads even though the tree lives in the DB.
export function pageId(subjectId, ci, pi, gi) {
  return `${subjectId}__c${ci}_p${pi}_g${gi}`;
}
export function chapterId(subjectId, ci) {
  return `${subjectId}__c${ci}`;
}

// List which subjects have a published course for a given track.
export function usePublishedSubjects(track) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!isSupabaseConfigured || !track) { setSubjects([]); setLoading(false); return; }
      try {
        const { data } = await supabase
          .from("course_tree")
          .select("subject, subject_name, track, status, version, updated_at")
          .eq("track", track)
          .eq("status", "published");
        if (!cancelled) setSubjects(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSubjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [track]);

  return { subjects, loading };
}

// Load one subject's published tree.
export function useCourseTree(subjectId, track) {
  const [tree, setTree] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    if (!isSupabaseConfigured || !subjectId || !track) { setTree(null); setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("course_tree")
        .select("subject, subject_name, track, tree, status, version")
        .eq("subject", subjectId).eq("track", track)
        .eq("status", "published").single();
      setTree(data?.tree || null);
      setMeta(data ? { subjectName: data.subject_name, version: data.version } : null);
    } catch {
      setTree(null); setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [subjectId, track]);

  useEffect(() => { load(); }, [load]);

  return { tree, meta, loading, reload: load };
}
