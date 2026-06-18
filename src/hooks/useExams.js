// src/hooks/useExams.js — v24
// Reads uploaded past-exam metadata from Supabase and, on demand, generates a
// short-lived signed URL to view/download a PDF from the private 'exams' bucket.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!supabase) { setExams([]); setLoading(false); return; }
    try {
      const { data } = await supabase
        .from("exams")
        .select("*")
        .order("year", { ascending: false });
      setExams(data || []);
    } catch {
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getPdfUrl = useCallback(async (pdfPath) => {
    if (!supabase || !pdfPath) return null;
    try {
      const { data, error } = await supabase
        .storage.from("exams")
        .createSignedUrl(pdfPath, 300);
      if (error) return null;
      return data?.signedUrl || null;
    } catch {
      return null;
    }
  }, []);

  return { exams, loading, reload: load, getPdfUrl };
}
