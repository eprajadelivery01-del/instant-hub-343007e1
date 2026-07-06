import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Navigation, Check } from 'lucide-react';
import { toast } from 'sonner';

interface LocationPickerProps {
  initialCoords?: { lat: number; lng: number };
  onConfirm: (data: {
    lat: number;
    lng: number;
    address: {
      street: string;
      number: string;
      neighborhood: string;
      city: string;
    };
  }) => void;
  onCancel: () => void;
}

export function LocationPicker({ initialCoords, onConfirm, onCancel }: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(initialCoords || null);
  const [loading, setLoading] = useState(false);
  const [addressPreview, setAddressPreview] = useState<string>('');

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Default to Diamantinão/Cuiabá region if não initial coords
    const defaultCenter: [number, number] = initialCoords 
      ? [initialCoords.lng, initialCoords.lat] 
      : [-56.4462, -14.4087];

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: defaultCenter,
      zoom: initialCoords ? 16 : 13,
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    if (initialCoords) {
      marker.current = new maplibregl.Marker({ color: '#f97316' })
        .setLngLat([initialCoords.lng, initialCoords.lat])
        .addTo(map.current);
      reverseGeocode(initialCoords.lat, initialCoords.lng);
    }

    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      setSelectedCoords({ lat, lng });
      
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new maplibregl.Marker({ color: '#f97316' })
          .setLngLat([lng, lat])
          .addTo(map.current!);
      }

      reverseGeocode(lat, lng);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const resp = await fetch(`https://nãominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await resp.json();
      if (data.address) {
        setAddressPreview(data.display_name);
      }
    } catch (err) {
      console.error("Geocoding error", err);
    }
  };

  const handleConfirm = async () => {
    if (!selectedCoords) {
      toast.error('Selecione um ponto não mapa');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch(`https://nãominatim.openstreetmap.org/reverse?format=jsonv2&lat=${selectedCoords.lat}&lon=${selectedCoords.lng}`);
      const data = await resp.json();
      
      const addr = data.address || {};
      
      onConfirm({
        lat: selectedCoords.lat,
        lng: selectedCoords.lng,
        address: {
          street: addr.road || addr.pedestrian || addr.suburb || '',
          number: addr.house_number || '',
          neighborhood: addr.neighbourhood || addr.suburb || '',
          city: addr.city || addr.town || addr.village || 'Diamantinão',
        }
      });
    } catch (err) {
      toast.error('Erro ao processar localização');
    } finally {
      setLoading(false);
    }
  };

  const handleMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setSelectedCoords({ lat: latitude, lng: longitude });
        map.current?.flyTo({ center: [longitude, latitude], zoom: 16 });
        
        if (marker.current) {
          marker.current.setLngLat([longitude, latitude]);
        } else {
          marker.current = new maplibregl.Marker({ color: '#f97316' })
            .setLngLat([longitude, latitude])
            .addTo(map.current!);
        }
        reverseGeocode(latitude, longitude);
      });
    }
  };

  return (
    <div className="flex flex-col h-[500px] sm:h-[600px] w-full relative">
      <div ref={mapContainer} className="flex-1 w-full h-full rounded-2xl border border-slate-100 shadow-inner" />
      
      <button 
        onClick={handleMyLocation}
        className="absolute top-4 right-4 h-11 w-11 rounded-2xl bg-background shadow-xl flex items-center justify-center text-primary group active:scale-95 transition-all border border-border"
        title="Minha localização"
      >
        <Navigation className="h-5 w-5 group-hover:rotate-12 transition-transform" />
      </button>

      <div className="absolute bottom-6 left-6 right-6 z-[100] pointer-events-none">
        {addressPreview && (
          <div className="bg-background/90 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-border animate-in slide-in-from-bottom-2 pointer-events-auto mb-3">
            <div className="flex items-center justify-between mb-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                 <MapPin className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[11px] font-bold text-slate-600 leading-tight">
                {addressPreview}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pointer-events-auto">
          <Button variant="outline" onClick={onCancel} className="flex-1 h-12 rounded-2xl bg-background/80 backdrop-blur-md font-bold">
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || !selectedCoords}
            className="flex-[2] h-12 rounded-2xl font-black uppercase tracking-widest text-xs"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4 mr-2" /> Confirmar</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

