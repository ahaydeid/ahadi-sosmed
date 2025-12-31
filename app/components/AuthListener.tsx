"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AuthListener() {
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange(() => {});
    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);
  return null;
}
