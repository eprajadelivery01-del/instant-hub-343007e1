import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Region } from "@/types/database";

export async function fetchRegions() {
  const { data, error } = await supabase
    .from("regions")
    .select("*")
    .eq("active", true)
    .order("name");

  if (error) throw error;
  return data || [];
}

export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: fetchRegions,
  });
}
