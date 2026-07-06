// Registers TanStack Query data-prefetchers for known routes.
// Imported eagerly from App.tsx so the registry is populated before any
// hover/pointer event fires — the route chunks themselves stay lazy.

import { supabase } from "@/lib/supabase";
import { registerRouteDataPrefetcher } from "@/lib/routePrefetch";

// /marketplace/store/:id — company + products. Matches the queryKey used
// inside StoreDetail.tsx (["store", id]) so the prefetched cache is read
// directly by useQuery on mount.
registerRouteDataPrefetcher("/marketplace/store", async ({ id }, queryClient, signal) => {
  if (!id) return;
  await queryClient.prefetchQuery({
    queryKey: ["store", id],
    queryFn: async () => {
      if (signal.aborted) throw new Error("aborted");
      const [companyRes, productsRes] = await Promise.all([
        supabase
          .from("companies")
          .select(
            "id, name, description, category, rating, is_open, active, is_active, delivery_fee, delivery_regions_pricing, show_in_marketplace, city, state, banner_url, cover_url, logo_url, business_hours, prep_time_min, prep_time_max, created_at, user_id"
          )
          .eq("id", id)
          .single(),
        supabase
          .from("products")
          .select("*")
          .eq("company_id", id)
          .eq("active", true)
          .order("category")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);
      return { company: companyRes.data, products: productsRes.data ?? [] };
    },
    staleTime: 30_000,
  });
});

// /marketplace/orders/:id — order header, items and delivery row.
registerRouteDataPrefetcher("/marketplace/orders", async ({ id }, queryClient, signal) => {
  if (!id) return;
  await queryClient.prefetchQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      if (signal.aborted) throw new Error("aborted");
      const [orderRes, itemsRes, deliveryRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*, company:companies(*), address:addresses(*)")
          .eq("id", id)
          .single(),
        supabase.from("order_items").select("*, products(*)").eq("order_id", id),
        supabase.from("deliveries").select("*").eq("order_id", id).maybeSingle(),
      ]);
      return {
        order: orderRes.data,
        items: itemsRes.data ?? [],
        delivery: deliveryRes.data,
      };
    },
    staleTime: 10_000,
  });
});

// /marketplace/checkout — the user's addresses (the page also computes
// delivery fee, but that depends on cart context we don't have here).
registerRouteDataPrefetcher("/marketplace/checkout", async (_params, queryClient, signal) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || signal.aborted) return;
  await queryClient.prefetchQuery({
    queryKey: ["addresses", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 60_000,
  });
});