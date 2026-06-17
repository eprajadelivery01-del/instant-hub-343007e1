import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export interface Coupon {
  id: string;
  company_id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  active: boolean;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  min_order_value: number;
  max_discount_value: number | null;
  created_at: string;
}

export function useActiveCoupons(companyId?: string) {
  return useQuery({
    queryKey: ["active-coupons", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("company_id", companyId!)
        .eq("active", true)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      const validCoupons = (data as Coupon[]).filter(c => {
        const notExpired = !c.expires_at || new Date(c.expires_at) > new Date();
        const notDepleted = !c.usage_limit || c.used_count < c.usage_limit;
        return notExpired && notDepleted;
      });
      
      return validCoupons;
    },
    enabled: !!companyId,
  });
}
