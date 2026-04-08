import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useOnlineDrivers } from "@/services/drivers";
import { useCompanies } from "@/services/companies";
import { useCity } from "@/contexts/CityContext";
import { Region } from "@/types/database";
import { useNavigate } from "react-router-dom";

interface UnifiedMapProps {
  regions?: Region[];
  centerCity?: { name: string; lat: number; lng: number } | null;
  interactive?: boolean;
  darkTheme?: boolean;
}

export function UnifiedMap({ regions = [], centerCity: propCenterCity, interactive = false, darkTheme = false }: UnifiedMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const regionsRenderedRef = useRef<string[]>([]);
  const navigate = useNavigate();

  const { selectedCityCoords } = useCity();
  const centerCity = propCenterCity || selectedCityCoords;

  const { data: drivers } = useOnlineDrivers();
  const { data: companies } = useCompanies();

  const calculateCentroid = (regs: Region[]) => {
    if (!regs.length) return null;
    let totalLat = 0;
    let totalLng = 0;
    let count = 0;

    regs.forEach(r => {
      if (r.geometry && (r.geometry as any).coordinates?.[0]) {
        const coords = (r.geometry as any).coordinates[0];
        coords.forEach((c: [number, number]) => {
          totalLng += c[0];
          totalLat += c[1];
          count++;
        });
      }
    });

    return count > 0 ? [totalLng / count, totalLat / count] as [number, number] : null;
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: darkTheme 
        ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: centerCity ? [centerCity.lng, centerCity.lat] : [-56.4462, -14.4087], // Default to Diamantino
      zoom: 12,
    });

    map.current.addControl(new maplibregl.NavigationControl(), "bottom-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Centering logic
  useEffect(() => {
    if (!map.current) return;
    if (centerCity) {
      map.current.flyTo({ center: [centerCity.lng, centerCity.lat], zoom: 13, duration: 1500 });
    } else if (regions.length > 0) {
      const centroid = calculateCentroid(regions);
      if (centroid) {
        map.current.flyTo({ center: centroid, zoom: 13, duration: 1500 });
      }
    }
  }, [centerCity?.lat, centerCity?.lng, regions]);

  // Render Regions
  useEffect(() => {
    const m = map.current;
    if (!m || !regions) return;

    const render = () => {
      regionsRenderedRef.current.forEach((id) => {
        [`rfill-${id}`, `rline-${id}`, `rlabel-${id}`].forEach(l => {
          if (m.getLayer(l)) m.removeLayer(l);
        });
        if (m.getSource(`rsrc-${id}`)) m.removeSource(`rsrc-${id}`);
      });
      regionsRenderedRef.current = [];

      regions.forEach((region) => {
        if (!region.geometry) return;
        const geojson = region.geometry as any;
        if (geojson.type !== "Polygon") return;

        const srcId = `rsrc-${region.id}`;
        m.addSource(srcId, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: { 
              name: region.name, 
              price: `R$ ${Number(region.delivery_fee ?? 0).toFixed(2)}` 
            },
            geometry: geojson,
          },
        });

        m.addLayer({
          id: `rfill-${region.id}`,
          type: "fill",
          source: srcId,
          paint: { "fill-color": region.color || "#F59E0B", "fill-opacity": 0.15 },
        });

        m.addLayer({
          id: `rline-${region.id}`,
          type: "line",
          source: srcId,
          paint: { "line-color": region.color || "#F59E0B", "line-width": 2, "line-opacity": 0.6 },
        });

        regionsRenderedRef.current.push(region.id);
      });
    };

    if (m.isStyleLoaded()) render();
    else m.once("load", render);
  }, [regions]);

  // Realtime Drivers & Companies
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    markersRef.current.forEach(mk => mk.remove());
    markersRef.current = [];

    // Drivers
    (drivers ?? []).forEach((driver) => {
      if (!driver.latitude || !driver.longitude) return;
      const el = document.createElement("div");
      el.innerHTML = `<div style="width: 34px; height: 34px; border-radius: 50%; background: #ea1d2c; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); font-size: 16px;">🛵</div>`;
      
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([driver.longitude, driver.latitude])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`<div style="padding: 5px; font-weight: bold;">Entregador Próximo</div>`))
        .addTo(m);
      markersRef.current.push(marker);
    });

    // Companies (Stores)
    (companies ?? []).forEach((company) => {
      if (!company.latitude || !company.longitude) return;
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.innerHTML = `<div style="width: 36px; height: 36px; border-radius: 10px; background: #22c55e; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 18px;">🏪</div>`;
      
      el.onclick = () => navigate(`/marketplace/store/${company.id}`);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([company.longitude, company.latitude])
        .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML(`<div style="padding: 5px;"><strong style="display:block; margin-bottom:4px;">${company.name}</strong><small style="color:#666">Clique para ver o cardápio</small></div>`))
        .addTo(m);
      markersRef.current.push(marker);
    });
  }, [drivers, companies, navigate]);

  return <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-muted/20 border border-border" />;
}
