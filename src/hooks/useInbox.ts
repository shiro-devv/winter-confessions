import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { inboxFor } from "../services/confessions";
import { useEffect } from "react";

export function useInbox(userId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel('inbox')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'confessions', filter: `recipient_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ['inbox', userId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);
  return useQuery({ queryKey: ['inbox', userId], queryFn: () => inboxFor(userId) });
}