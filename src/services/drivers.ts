import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { DeliveryDriver } from "@/types/database";

export async function fetchOnlineDrivers() {
  const { data, error } = await supabase
    .from("delivery_drivers")
    .select("*, profiles(*)")
    .eq("is_online", true);

  if (error) throw error;
  return (data as any[]) || [];
}

export function useOnlineDrivers() {
  return useQuery({
    queryKey: ["online-drivers"],
    queryFn: fetchOnlineDrivers,
    refetchInterval: 5000, // Refresh every 5s for realtime feel
  });
}
