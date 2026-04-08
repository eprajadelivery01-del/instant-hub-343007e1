import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCompanies } from "@/services/companies";
import { useCity } from "@/contexts/CityContext";
import { useNavigate } from "react-router-dom";

interface UnifiedMapProps {
  centerCity?: { name: string; lat: number; lng: number } | null;
  interactive?: boolean;
  darkTheme?: boolean;
}

export function UnifiedMap({ centerCity: propCenterCity, interactive = false, darkTheme = false }: UnifiedMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const navigate = useNavigate();

  const { selectedCityCoords } = useCity();
  const centerCity = propCenterCity || selectedCityCoords;

  const { data: companies } = useCompanies();

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: darkTheme 
        ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: centerCity ? [centerCity.lng, centerCity.lat] : [-56.4462, -14.4087],
      zoom: 12,
      attributionControl: false,
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
    }
  }, [centerCity?.lat, centerCity?.lng]);

  // Realtime Companies (Stores)
  useEffect(() => {
    const m = map.current;
    if (!m) return;

    markersRef.current.forEach(mk => mk.remove());
    markersRef.current = [];

    (companies ?? []).forEach((company) => {
      if (!company.latitude || !company.longitude) return;
      
      const el = document.createElement("div");
      el.style.cursor = "pointer";
      el.innerHTML = `<div style="width: 38px; height: 38px; border-radius: 12px; background: #22c55e; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0,0,0,0.2); font-size: 20px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">🏪</div>`;
      
      el.onclick = (e) => {
        e.stopPropagation();
        navigate(`/marketplace/store/${company.id}`);
      };

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([company.longitude, company.latitude])
        .setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(`
          <div style="padding: 10px; font-family: sans-serif;">
            <strong style="display:block; font-size: 14px; color: #1a1a1a;">${company.name}</strong>
            <span style="display:block; font-size: 11px; color: #22c55e; font-weight: bold; margin-top: 2px;">Loja Aberta • Entrega Rápida</span>
            <button style="margin-top: 8px; width: 100%; background: #f97316; color: white; border: none; border-radius: 6px; padding: 5px; font-size: 11px; font-weight: bold; cursor: pointer;">Ver Cardápio</button>
          </div>
        `))
        .addTo(m);
      markersRef.current.push(marker);
    });
  }, [companies, navigate]);

  return <div ref={mapContainer} className="w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-muted/20 border border-border" />;
}
