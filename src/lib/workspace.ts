import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type Campaign = Database["public"]["Tables"]["campaigns"]["Row"];
export type Conversion = Database["public"]["Tables"]["conversions"]["Row"];
export type TrackingLink = Database["public"]["Tables"]["tracking_links"]["Row"];
export type Integration = Database["public"]["Tables"]["integrations"]["Row"];

export const workspaceQuery = queryOptions({
  queryKey: ["workspace"],
  queryFn: async () => {
    // Garante que o utilizador tem um workspace (cria no primeiro login se faltar)
    const { data: wsId, error: e1 } = await supabase.rpc("ensure_workspace");
    if (e1) throw e1;
    const { data, error } = await supabase.from("workspaces").select("*").eq("id", wsId as string).single();
    if (error) throw error;
    return data;
  },
  staleTime: 60_000,
});

export function useWorkspace() {
  return useQuery(workspaceQuery);
}

export function useCampaigns(wsId?: string) {
  return useQuery({
    queryKey: ["campaigns", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").eq("workspace_id", wsId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useConversions(wsId?: string, sinceIso?: string) {
  return useQuery({
    queryKey: ["conversions", wsId, sinceIso],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase.from("conversions").select("*").eq("workspace_id", wsId!).order("occurred_at", { ascending: false }).limit(1000);
      if (sinceIso) q = q.gte("occurred_at", sinceIso);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSessionsCount(wsId?: string, sinceIso?: string) {
  return useQuery({
    queryKey: ["sessions-by-campaign", wsId, sinceIso],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase.from("sessions").select("campaign_id, created_at").eq("workspace_id", wsId!).limit(5000);
      if (sinceIso) q = q.gte("created_at", sinceIso);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}
