import { useState, useEffect, useMemo } from 'react';
import { Address } from '@/types/database';

export interface DeliveryEstimateResult {
  status: 'ready' | 'no_address' | 'no_store_location' | 'calculating' | 'unavailable';
  formatted: string;
  minMinutes: number | null;
  maxMinutes: number | null;
  distanceKm: number | null;
  routeMinutes: number | null;
  prepMinutes: number | null;
}

export interface StoreEstimateInput {
  id?: string;
  latitude?: number | null;
  longitude?: number | null;
  prep_time?: number | null;
  prep_time_min?: number | null;
  prep_time_max?: number | null;
}

// In-memory route duration cache: key -> { routeMinutes, distanceKm, timestamp }
interface CacheEntry {
  routeMinutes: number;
  distanceKm: number;
  timestamp: number;
}
export const routeCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Validates geographical coordinates strictly.
 * Rejects null, undefined, NaN, (0,0), and out-of-range latitudes/longitudes.
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (lat == null || lng == null) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;
  if (numLat < -90 || numLat > 90) return false;
  if (numLng < -180 || numLng > 180) return false;
  if (numLat === 0 && numLng === 0) return false;
  return true;
}

function getCacheKey(originLat: number, originLng: number, destLat: number, destLng: number): string {
  return `${originLat.toFixed(4)},${originLng.toFixed(4)}->${destLat.toFixed(4)},${destLng.toFixed(4)}`;
}

/**
 * Clears expired entries or the whole route cache.
 */
export function clearRouteCache(): void {
  routeCache.clear();
}

/**
 * Extracts real prep time range from store database record.
 * Returns [min, max] or null if not configured by merchant.
 */
export function getStorePrepTimeRange(company: StoreEstimateInput): [number, number] | null {
  const min = company.prep_time_min != null ? Number(company.prep_time_min) : null;
  const max = company.prep_time_max != null ? Number(company.prep_time_max) : null;

  if (min != null && max != null && !isNaN(min) && !isNaN(max) && min > 0 && max >= min) {
    return [min, max];
  }

  const prep = company.prep_time != null ? Number(company.prep_time) : null;
  if (prep != null && !isNaN(prep) && prep > 0) {
    return [prep, prep];
  }

  return null;
}

/**
 * Fetches estimated driving duration and distance from OSRM Route API.
 * If OSRM fails or times out, returns null (NO fabricated numbers).
 */
export async function getRouteDrivingTime(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): Promise<{ routeMinutes: number; distanceKm: number } | null> {
  if (!isValidCoordinate(originLat, originLng) || !isValidCoordinate(destLat, destLng)) {
    return null;
  }

  const key = getCacheKey(originLat, originLng, destLat, destLng);
  const cached = routeCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { routeMinutes: cached.routeMinutes, distanceKm: cached.distanceKm };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.routes?.[0]) {
        const durationSec = Number(data.routes[0].duration);
        const distanceMeters = Number(data.routes[0].distance);
        if (!isNaN(durationSec) && durationSec > 0) {
          const routeMinutes = Math.max(1, Math.ceil(durationSec / 60));
          const distanceKm = !isNaN(distanceMeters) ? Math.round((distanceMeters / 1000) * 10) / 10 : 0;

          routeCache.set(key, { routeMinutes, distanceKm, timestamp: Date.now() });
          return { routeMinutes, distanceKm };
        }
      }
    }
  } catch {
    // Network failure or timeout -> returns null
  }

  return null;
}

/**
 * Fetches driving route durations for a batch of destinations in a single HTTP request using OSRM Table API.
 * Only stores with valid coordinates are queried.
 */
export async function getBatchRouteDrivingTimes(
  originLat: number,
  originLng: number,
  destinations: Array<{ id: string; lat: number; lng: number }>
): Promise<Map<string, { routeMinutes: number; distanceKm: number }>> {
  const results = new Map<string, { routeMinutes: number; distanceKm: number }>();
  if (!isValidCoordinate(originLat, originLng) || destinations.length === 0) return results;

  const validDestinations = destinations.filter((d) => isValidCoordinate(d.lat, d.lng));
  if (validDestinations.length === 0) return results;

  const missingDestinations: Array<{ id: string; lat: number; lng: number }> = [];

  // Check cache first
  validDestinations.forEach((dest) => {
    const key = getCacheKey(originLat, originLng, dest.lat, dest.lng);
    const cached = routeCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      results.set(dest.id, { routeMinutes: cached.routeMinutes, distanceKm: cached.distanceKm });
    } else {
      missingDestinations.push(dest);
    }
  });

  if (missingDestinations.length === 0) {
    return results;
  }

  try {
    const coordinatesString = [
      `${originLng},${originLat}`,
      ...missingDestinations.map((d) => `${d.lng},${d.lat}`),
    ].join(';');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const destinationsParam = missingDestinations.map((_, i) => i + 1).join(';');
    const url = `https://router.project-osrm.org/table/v1/driving/${coordinatesString}?sources=0&destinations=${destinationsParam}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.durations?.[0]) {
        const row = data.durations[0];
        missingDestinations.forEach((dest, i) => {
          const durationSec = Number(row[i]);
          if (!isNaN(durationSec) && durationSec >= 0) {
            const routeMinutes = Math.max(1, Math.ceil(durationSec / 60));
            const key = getCacheKey(originLat, originLng, dest.lat, dest.lng);

            routeCache.set(key, { routeMinutes, distanceKm: 0, timestamp: Date.now() });
            results.set(dest.id, { routeMinutes, distanceKm: 0 });
          }
        });
      }
    }
  } catch {
    // Network failure -> missing destinations will simply not be in results
  }

  return results;
}

/**
 * Calculates delivery estimate from verified store data, client address, and route duration.
 */
export function calculateEstimate(
  company: StoreEstimateInput | null | undefined,
  selectedAddress: { latitude?: number | null; longitude?: number | null } | null | undefined,
  routeMinutes: number | null,
  distanceKm: number | null = null
): DeliveryEstimateResult {
  if (!selectedAddress || !isValidCoordinate(selectedAddress.latitude, selectedAddress.longitude)) {
    return {
      status: 'no_address',
      formatted: 'Informe seu endereço',
      minMinutes: null,
      maxMinutes: null,
      distanceKm: null,
      routeMinutes: null,
      prepMinutes: null,
    };
  }

  if (!company || !isValidCoordinate(company.latitude, company.longitude)) {
    return {
      status: 'no_store_location',
      formatted: 'Tempo indisponível',
      minMinutes: null,
      maxMinutes: null,
      distanceKm: null,
      routeMinutes: null,
      prepMinutes: null,
    };
  }

  const prepRange = getStorePrepTimeRange(company);
  if (!prepRange) {
    return {
      status: 'no_store_location',
      formatted: 'Tempo indisponível',
      minMinutes: null,
      maxMinutes: null,
      distanceKm,
      routeMinutes,
      prepMinutes: null,
    };
  }

  if (routeMinutes == null) {
    return {
      status: 'unavailable',
      formatted: 'Estimativa indisponível',
      minMinutes: null,
      maxMinutes: null,
      distanceKm,
      routeMinutes: null,
      prepMinutes: prepRange[0],
    };
  }

  const [minPrep, maxPrep] = prepRange;
  const minTotal = minPrep + routeMinutes;
  const maxTotal = maxPrep + routeMinutes;

  const formatted = minTotal === maxTotal ? `${minTotal} min` : `${minTotal}–${maxTotal} min`;

  return {
    status: 'ready',
    formatted,
    minMinutes: minTotal,
    maxMinutes: maxTotal,
    distanceKm,
    routeMinutes,
    prepMinutes: minPrep,
  };
}

/**
 * Calculates delivery estimate from verified store data and route duration.
 *
 * Formula:
 * Total Min = Prep Min + Route Duration
 * Total Max = Prep Max + Route Duration
 */
export function calculateEstimateFromData(
  company: StoreEstimateInput,
  routeMinutes: number | null,
  distanceKm: number | null = null
): DeliveryEstimateResult {
  const prepRange = getStorePrepTimeRange(company);

  if (!prepRange) {
    return {
      status: 'no_store_location',
      formatted: 'Tempo indisponível',
      minMinutes: null,
      maxMinutes: null,
      distanceKm,
      routeMinutes,
      prepMinutes: null,
    };
  }

  if (routeMinutes == null) {
    return {
      status: 'unavailable',
      formatted: 'Estimativa indisponível',
      minMinutes: null,
      maxMinutes: null,
      distanceKm,
      routeMinutes: null,
      prepMinutes: prepRange[0],
    };
  }

  const [minPrep, maxPrep] = prepRange;
  const minTotal = minPrep + routeMinutes;
  const maxTotal = maxPrep + routeMinutes;

  const formatted = minTotal === maxTotal ? `${minTotal} min` : `${minTotal}–${maxTotal} min`;

  return {
    status: 'ready',
    formatted,
    minMinutes: minTotal,
    maxMinutes: maxTotal,
    distanceKm,
    routeMinutes,
    prepMinutes: minPrep,
  };
}

/**
 * React Hook for single store delivery estimate.
 */
export function useDeliveryEstimate(
  company: StoreEstimateInput | null | undefined,
  selectedAddress: Address | null | undefined
): DeliveryEstimateResult {
  const [result, setResult] = useState<DeliveryEstimateResult>(() => {
    if (!selectedAddress) {
      return {
        status: 'no_address',
        formatted: 'Informe seu endereço',
        minMinutes: null,
        maxMinutes: null,
        distanceKm: null,
        routeMinutes: null,
        prepMinutes: null,
      };
    }
    const storeLat = company?.latitude;
    const storeLng = company?.longitude;
    if (!isValidCoordinate(storeLat, storeLng)) {
      return {
        status: 'no_store_location',
        formatted: 'Tempo indisponível',
        minMinutes: null,
        maxMinutes: null,
        distanceKm: null,
        routeMinutes: null,
        prepMinutes: null,
      };
    }
    const prepRange = company ? getStorePrepTimeRange(company) : null;
    if (!prepRange) {
      return {
        status: 'no_store_location',
        formatted: 'Tempo indisponível',
        minMinutes: null,
        maxMinutes: null,
        distanceKm: null,
        routeMinutes: null,
        prepMinutes: null,
      };
    }
    return {
      status: 'calculating',
      formatted: 'Calculando prazo...',
      minMinutes: null,
      maxMinutes: null,
      distanceKm: null,
      routeMinutes: null,
      prepMinutes: null,
    };
  });

  useEffect(() => {
    if (!selectedAddress) {
      setResult({
        status: 'no_address',
        formatted: 'Informe seu endereço',
        minMinutes: null,
        maxMinutes: null,
        distanceKm: null,
        routeMinutes: null,
        prepMinutes: null,
      });
      return;
    }

    const clientLat = Number(selectedAddress.latitude);
    const clientLng = Number(selectedAddress.longitude);
    if (!isValidCoordinate(clientLat, clientLng)) {
      setResult({
        status: 'no_address',
        formatted: 'Informe seu endereço',
        minMinutes: null,
        maxMinutes: null,
        distanceKm: null,
        routeMinutes: null,
        prepMinutes: null,
      });
      return;
    }

    const storeLat = Number(company?.latitude);
    const storeLng = Number(company?.longitude);
    if (!isValidCoordinate(storeLat, storeLng)) {
      setResult({
        status: 'no_store_location',
        formatted: 'Tempo indisponível',
        minMinutes: null,
        maxMinutes: null,
        distanceKm: null,
        routeMinutes: null,
        prepMinutes: null,
      });
      return;
    }

    const prepRange = company ? getStorePrepTimeRange(company) : null;
    if (!prepRange) {
      setResult({
        status: 'no_store_location',
        formatted: 'Tempo indisponível',
        minMinutes: null,
        maxMinutes: null,
        distanceKm: null,
        routeMinutes: null,
        prepMinutes: null,
      });
      return;
    }

    let active = true;
    setResult((prev) => (prev.status === 'calculating' ? prev : {
      status: 'calculating',
      formatted: 'Calculando prazo...',
      minMinutes: null,
      maxMinutes: null,
      distanceKm: null,
      routeMinutes: null,
      prepMinutes: null,
    }));

    getRouteDrivingTime(storeLat, storeLng, clientLat, clientLng).then((routeData) => {
      if (!active) return;
      if (!routeData) {
        setResult({
          status: 'unavailable',
          formatted: 'Estimativa indisponível',
          minMinutes: null,
          maxMinutes: null,
          distanceKm: null,
          routeMinutes: null,
          prepMinutes: prepRange[0],
        });
        return;
      }
      const estimate = calculateEstimateFromData(company || {}, routeData.routeMinutes, routeData.distanceKm);
      setResult(estimate);
    });

    return () => {
      active = false;
    };
  }, [
    company?.id,
    company?.latitude,
    company?.longitude,
    company?.prep_time,
    company?.prep_time_min,
    company?.prep_time_max,
    selectedAddress?.id,
    selectedAddress?.latitude,
    selectedAddress?.longitude,
  ]);

  return result;
}

/**
 * React Hook for batch store delivery estimates in Home.tsx.
 * Uses 1 single OSRM Table request for all stores with valid coordinates.
 */
export function useStoreDeliveryEstimates(
  companies: StoreEstimateInput[],
  selectedAddress: Address | null | undefined
): Map<string, DeliveryEstimateResult> {
  const [estimates, setEstimates] = useState<Map<string, DeliveryEstimateResult>>(() => new Map());

  const clientCoords = useMemo(() => {
    if (!selectedAddress) return null;
    const lat = Number(selectedAddress.latitude);
    const lng = Number(selectedAddress.longitude);
    if (!isValidCoordinate(lat, lng)) return null;
    return { lat, lng };
  }, [selectedAddress?.id, selectedAddress?.latitude, selectedAddress?.longitude]);

  useEffect(() => {
    const map = new Map<string, DeliveryEstimateResult>();

    if (!clientCoords) {
      companies.forEach((c) => {
        if (c.id) {
          map.set(c.id, {
            status: 'no_address',
            formatted: 'Informe seu endereço',
            minMinutes: null,
            maxMinutes: null,
            distanceKm: null,
            routeMinutes: null,
            prepMinutes: null,
          });
        }
      });
      setEstimates(map);
      return;
    }

    const validStores: Array<{ id: string; lat: number; lng: number }> = [];

    companies.forEach((c) => {
      if (!c.id) return;
      const storeLat = Number(c.latitude);
      const storeLng = Number(c.longitude);
      const prepRange = getStorePrepTimeRange(c);

      if (isValidCoordinate(storeLat, storeLng) && prepRange) {
        validStores.push({ id: c.id, lat: storeLat, lng: storeLng });
        map.set(c.id, {
          status: 'calculating',
          formatted: 'Calculando prazo...',
          minMinutes: null,
          maxMinutes: null,
          distanceKm: null,
          routeMinutes: null,
          prepMinutes: null,
        });
      } else {
        map.set(c.id, {
          status: 'no_store_location',
          formatted: 'Tempo indisponível',
          minMinutes: null,
          maxMinutes: null,
          distanceKm: null,
          routeMinutes: null,
          prepMinutes: null,
        });
      }
    });

    setEstimates(map);

    if (validStores.length === 0) {
      return;
    }

    let active = true;

    getBatchRouteDrivingTimes(clientCoords.lat, clientCoords.lng, validStores).then((batchTimes) => {
      if (!active) return;
      const updatedMap = new Map(map);

      companies.forEach((c) => {
        if (!c.id) return;
        const routeData = batchTimes.get(c.id);
        if (routeData) {
          const estimate = calculateEstimateFromData(c, routeData.routeMinutes, routeData.distanceKm);
          updatedMap.set(c.id, estimate);
        } else if (updatedMap.get(c.id)?.status === 'calculating') {
          updatedMap.set(c.id, {
            status: 'unavailable',
            formatted: 'Estimativa indisponível',
            minMinutes: null,
            maxMinutes: null,
            distanceKm: null,
            routeMinutes: null,
            prepMinutes: null,
          });
        }
      });

      setEstimates(updatedMap);
    });

    return () => {
      active = false;
    };
  }, [companies, clientCoords]);

  return estimates;
}
