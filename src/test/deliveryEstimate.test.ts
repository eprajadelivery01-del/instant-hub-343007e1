import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  isValidCoordinate,
  getStorePrepTimeRange,
  calculateEstimate,
  getRouteDrivingTime,
  getBatchRouteDrivingTimes,
  routeCache,
} from "@/services/deliveryEstimate";

describe("deliveryEstimate unit tests", () => {
  beforeEach(() => {
    routeCache.clear();
    vi.restoreAllMocks();
  });

  describe("Coordenadas - Validação estrita", () => {
    it("deve aceitar coordenadas válidas", () => {
      expect(isValidCoordinate(-14.4086, -56.4461)).toBe(true);
      expect(isValidCoordinate(0.5, -50.2)).toBe(true);
      expect(isValidCoordinate(-90, -180)).toBe(true);
      expect(isValidCoordinate(90, 180)).toBe(true);
    });

    it("deve rejeitar coordenadas 0,0", () => {
      expect(isValidCoordinate(0, 0)).toBe(false);
    });

    it("deve rejeitar null, undefined e NaN", () => {
      expect(isValidCoordinate(null, -56.4)).toBe(false);
      expect(isValidCoordinate(-14.4, undefined)).toBe(false);
      expect(isValidCoordinate(NaN, -56.4)).toBe(false);
      expect(isValidCoordinate(-14.4, NaN)).toBe(false);
    });

    it("deve rejeitar valores fora do intervalo -90..90 e -180..180", () => {
      expect(isValidCoordinate(-90.1, -50)).toBe(false);
      expect(isValidCoordinate(90.1, -50)).toBe(false);
      expect(isValidCoordinate(-14.4, -180.1)).toBe(false);
      expect(isValidCoordinate(-14.4, 180.1)).toBe(false);
    });
  });

  describe("Tempo de preparo - Regras sem dados fictícios", () => {
    it("deve respeitar prep_time_min e prep_time_max cadastrados", () => {
      const company = { prep_time_min: 20, prep_time_max: 35 };
      expect(getStorePrepTimeRange(company)).toEqual([20, 35]);
    });

    it("deve usar valor único de prep_time sem inventar margem ±5 min", () => {
      const company = { prep_time: 30 };
      expect(getStorePrepTimeRange(company)).toEqual([30, 30]);
    });

    it("deve retornar null se não houver tempo de preparo cadastrado (sem inventar 25-45)", () => {
      const companyEmpty = {};
      expect(getStorePrepTimeRange(companyEmpty)).toBeNull();

      const companyZero = { prep_time_min: 0, prep_time_max: 0 };
      expect(getStorePrepTimeRange(companyZero)).toBeNull();
    });
  });

  describe("Cálculo do ETA - Estados e Formatação", () => {
    it("deve retornar 'Informe seu endereço' quando o cliente não tiver endereço ou coordenadas", () => {
      const company = { latitude: -14.4, longitude: -56.4, prep_time: 20 };
      
      const noAddress = calculateEstimate(company, null, 10);
      expect(noAddress.status).toBe("no_address");
      expect(noAddress.formatted).toBe("Informe seu endereço");

      const addressWithoutCoords = calculateEstimate(company, { latitude: null, longitude: null }, 10);
      expect(addressWithoutCoords.status).toBe("no_address");
      expect(addressWithoutCoords.formatted).toBe("Informe seu endereço");
    });

    it("deve retornar 'Tempo indisponível' quando a loja não tiver coordenadas válidas", () => {
      const address = { latitude: -14.4, longitude: -56.4 };
      
      const noStoreCoords = calculateEstimate({ prep_time: 20 }, address, 10);
      expect(noStoreCoords.status).toBe("no_store_location");
      expect(noStoreCoords.formatted).toBe("Tempo indisponível");

      const storeZeroZero = calculateEstimate({ latitude: 0, longitude: 0, prep_time: 20 }, address, 10);
      expect(storeZeroZero.status).toBe("no_store_location");
      expect(storeZeroZero.formatted).toBe("Tempo indisponível");
    });

    it("deve retornar 'Tempo indisponível' quando a loja não tiver tempo de preparo cadastrado", () => {
      const address = { latitude: -14.4, longitude: -56.4 };
      const storeWithoutPrep = calculateEstimate({ latitude: -14.41, longitude: -56.41 }, address, 10);
      expect(storeWithoutPrep.status).toBe("no_store_location");
      expect(storeWithoutPrep.formatted).toBe("Tempo indisponível");
    });

    it("deve somar tempo de rota com intervalo de preparo min/max", () => {
      const company = { latitude: -14.4, longitude: -56.4, prep_time_min: 15, prep_time_max: 25 };
      const address = { latitude: -14.41, longitude: -56.42 };
      const routeMinutes = 8;

      const result = calculateEstimate(company, address, routeMinutes);
      expect(result.status).toBe("ready");
      expect(result.minMinutes).toBe(23); // 15 + 8
      expect(result.maxMinutes).toBe(33); // 25 + 8
      expect(result.formatted).toBe("23–33 min");
    });

    it("deve calcular ETA exato quando só houver prep_time único", () => {
      const company = { latitude: -14.4, longitude: -56.4, prep_time: 20 };
      const address = { latitude: -14.41, longitude: -56.42 };
      const routeMinutes = 6;

      const result = calculateEstimate(company, address, routeMinutes);
      expect(result.status).toBe("ready");
      expect(result.minMinutes).toBe(26);
      expect(result.maxMinutes).toBe(26);
      expect(result.formatted).toBe("26 min");
    });

    it("deve diferenciar loja próxima e loja distante", () => {
      const storeNear = { latitude: -14.401, longitude: -56.441, prep_time: 15 };
      const storeFar = { latitude: -14.450, longitude: -56.490, prep_time: 15 };
      const address = { latitude: -14.400, longitude: -56.440 };

      const nearResult = calculateEstimate(storeNear, address, 4);
      const farResult = calculateEstimate(storeFar, address, 22);

      expect(nearResult.formatted).toBe("19 min");
      expect(farResult.formatted).toBe("37 min");
      expect(nearResult.minMinutes).not.toBe(farResult.minMinutes);
    });

    it("deve diferenciar lojas com tempos de preparo distintos para a mesma rota", () => {
      const fastStore = { latitude: -14.405, longitude: -56.445, prep_time: 15 };
      const slowStore = { latitude: -14.405, longitude: -56.445, prep_time: 45 };
      const address = { latitude: -14.400, longitude: -56.440 };

      const fastResult = calculateEstimate(fastStore, address, 10);
      const slowResult = calculateEstimate(slowStore, address, 10);

      expect(fastResult.formatted).toBe("25 min");
      expect(slowResult.formatted).toBe("55 min");
    });
  });

  describe("Integração de Rota OSRM e Fallback estrito", () => {
    it("deve retornar 'Estimativa indisponível' quando OSRM falhar (sem usar haversine)", async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const routeData = await getRouteDrivingTime(-14.400, -56.440, -14.420, -56.460);
      expect(routeData).toBeNull();

      const company = { latitude: -14.420, longitude: -56.460, prep_time: 20 };
      const address = { latitude: -14.400, longitude: -56.440 };
      const result = calculateEstimate(company, address, null);

      expect(result.status).toBe("unavailable");
      expect(result.formatted).toBe("Estimativa indisponível");
    });

    it("deve calcular em lote usando OSRM Table em uma única requisição", async () => {
      const mockTableResponse = {
        code: "Ok",
        durations: [
          [360, 720] // Destino 1 (360s = 6min) e Destino 2 (720s = 12min)
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTableResponse,
      });

      const stores = [
        { id: "store-1", lat: -14.410, lng: -56.450 },
        { id: "store-2", lat: -14.420, lng: -56.460 },
      ];

      const durations = await getBatchRouteDrivingTimes(-14.400, -56.440, stores);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(durations.get("store-1")?.routeMinutes).toBe(6);
      expect(durations.get("store-2")?.routeMinutes).toBe(12);
    });

    it("deve utilizar cache de rota para evitar chamadas duplicadas", async () => {
      const mockRouteResponse = {
        code: "Ok",
        routes: [{ duration: 480, distance: 3500 }] // 8 minutos
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRouteResponse,
      });

      const firstCall = await getRouteDrivingTime(-14.400, -56.440, -14.410, -56.450);
      expect(firstCall?.routeMinutes).toBe(8);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Segunda chamada com as mesmas coordenadas deve retornar do cache sem novo fetch
      const secondCall = await getRouteDrivingTime(-14.400, -56.440, -14.410, -56.450);
      expect(secondCall?.routeMinutes).toBe(8);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
