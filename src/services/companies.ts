import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Company } from "@/types/database";

export async function fetchCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("show_in_marketplace", true)
    .order("name");

  if (error) throw error;
  return data || [];
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });
}
