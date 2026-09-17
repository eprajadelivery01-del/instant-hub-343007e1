import { describe, it, expect, vi } from "vitest";
import { getPrepTimeLabel } from "@/lib/storeHours";

describe("Regra de Tempo de Entrega Configurado pelo Lojista", () => {
  it("TESTE 1: Lojista configura 25 e 45 min -> deve retornar '25–45 min'", () => {
    const company = { prep_time_min: 25, prep_time_max: 45 };
    expect(getPrepTimeLabel(company)).toBe("25–45 min");
  });

  it("TESTE 2: Lojista altera para 30 e 50 min -> deve retornar '30–50 min'", () => {
    const company = { prep_time_min: 30, prep_time_max: 50 };
    expect(getPrepTimeLabel(company)).toBe("30–50 min");
  });

  it("TESTE 3: Lojista coloca valores iguais 30 e 30 min -> deve retornar '30 min'", () => {
    const company = { prep_time_min: 30, prep_time_max: 30 };
    expect(getPrepTimeLabel(company)).toBe("30 min");
  });

  it("TESTE 4: Empresa possui apenas prep_time legado (ex: 40) sem min/max -> deve retornar '40 min'", () => {
    const company = { prep_time: 40 };
    expect(getPrepTimeLabel(company)).toBe("40 min");
  });

  it("TESTE 5: Empresa sem campos configurados ou nulos -> deve retornar padrão '25–45 min'", () => {
    expect(getPrepTimeLabel(null)).toBe("25–45 min");
    expect(getPrepTimeLabel({})).toBe("25–45 min");
    expect(getPrepTimeLabel({ prep_time_min: null, prep_time_max: null })).toBe("25–45 min");
    expect(getPrepTimeLabel({ prep_time_min: 0, prep_time_max: 0 })).toBe("25–45 min");
  });

  it("TESTE 6: Prioridade de min/max sobre prep_time simples", () => {
    const company = { prep_time: 20, prep_time_min: 35, prep_time_max: 55 };
    expect(getPrepTimeLabel(company)).toBe("35–55 min");
  });

  it("TESTE 7: Não depende do endereço do cliente (mesmo resultado independente do endereço)", () => {
    const company = { prep_time_min: 25, prep_time_max: 45 };
    // Chamada pura e síncrona sem precisar de endereço ou lat/long
    const estimateSemEndereco = getPrepTimeLabel(company);
    const estimateComEndereco = getPrepTimeLabel(company);
    expect(estimateSemEndereco).toBe("25–45 min");
    expect(estimateComEndereco).toBe("25–45 min");
    expect(estimateSemEndereco).not.toContain("Informe seu endereço");
    expect(estimateSemEndereco).not.toContain("Calculando prazo");
    expect(estimateSemEndereco).not.toContain("Estimativa indisponível");
  });

  it("TESTE 8: Não realiza chamadas OSRM externas", () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    const company = { prep_time_min: 25, prep_time_max: 45 };
    getPrepTimeLabel(company);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
