import { describe, expect, it } from "vitest";
import {
  assessFlood,
  compareStatusSeverity,
  evaluateFloodStatus,
  highestFloodStatus,
  isAlertOrWorse,
  isEvacuation,
  orderedFloodStatuses,
  summarizeFlood,
} from "@/domain/flood/evaluator";
import type { FloodStatus } from "@/domain/flood/types";
import { createThresholds } from "../../support/factories";

const evaluatedAt = new Date("2026-10-22T12:00:00.000Z");

describe("evaluateFloodStatus", () => {
  it("devuelve undefined cuando no hay nivel observado", () => {
    expect(evaluateFloodStatus(null, createThresholds())).toBe("undefined");
  });

  it("devuelve undefined cuando la estacion no publica umbrales", () => {
    expect(
      evaluateFloodStatus(4, createThresholds({ lowWater: null, alert: null, evacuation: null })),
    ).toBe("undefined");
  });

  it("declara evacuacion en el umbral o por encima", () => {
    expect(evaluateFloodStatus(5.25, createThresholds())).toBe("evacuation");
    expect(evaluateFloodStatus(6, createThresholds())).toBe("evacuation");
  });

  it("declara alerta entre el umbral de alerta y el de evacuacion", () => {
    expect(evaluateFloodStatus(5, createThresholds())).toBe("alert");
    expect(evaluateFloodStatus(5.2, createThresholds())).toBe("alert");
  });

  it("declara aguas bajas en el umbral o por debajo", () => {
    expect(evaluateFloodStatus(1.64, createThresholds())).toBe("low");
    expect(evaluateFloodStatus(1, createThresholds())).toBe("low");
  });

  it("declara normal entre aguas bajas y alerta", () => {
    expect(evaluateFloodStatus(3.5, createThresholds())).toBe("normal");
  });

  it("declara alerta cuando solo existe el umbral de alerta", () => {
    expect(evaluateFloodStatus(5.1, createThresholds({ lowWater: null, evacuation: null }))).toBe(
      "alert",
    );
    expect(evaluateFloodStatus(4, createThresholds({ lowWater: null, evacuation: null }))).toBe(
      "normal",
    );
  });

  it("declara evacuacion cuando solo existe el umbral de evacuacion", () => {
    expect(evaluateFloodStatus(5.3, createThresholds({ lowWater: null, alert: null }))).toBe(
      "evacuation",
    );
  });

  it("declara aguas bajas cuando solo existe ese umbral", () => {
    expect(evaluateFloodStatus(1.5, createThresholds({ alert: null, evacuation: null }))).toBe(
      "low",
    );
    expect(evaluateFloodStatus(3, createThresholds({ alert: null, evacuation: null }))).toBe(
      "normal",
    );
  });
});

describe("clasificacion del estado", () => {
  it("considera alerta o peor a alerta y evacuacion", () => {
    expect(isAlertOrWorse("alert")).toBe(true);
    expect(isAlertOrWorse("evacuation")).toBe(true);
    expect(isAlertOrWorse("normal")).toBe(false);
    expect(isAlertOrWorse("low")).toBe(false);
    expect(isAlertOrWorse("undefined")).toBe(false);
  });

  it("reconoce la evacuacion", () => {
    expect(isEvacuation("evacuation")).toBe(true);
    expect(isEvacuation("alert")).toBe(false);
  });

  it("ordena los estados por gravedad", () => {
    expect(compareStatusSeverity("evacuation", "alert")).toBeGreaterThan(0);
    expect(compareStatusSeverity("low", "alert")).toBeLessThan(0);
    expect(compareStatusSeverity("normal", "normal")).toBe(0);
  });

  it("elige el estado mas grave de un conjunto", () => {
    expect(highestFloodStatus(["normal", "alert", "low"])).toBe("alert");
    expect(highestFloodStatus([])).toBe("undefined");
  });

  it("publica los estados en orden de gravedad", () => {
    expect(orderedFloodStatuses()).toEqual(["evacuation", "alert", "low", "normal", "undefined"]);
  });
});

describe("assessFlood", () => {
  it("calcula los margenes respecto de cada umbral", () => {
    const assessment = assessFlood({
      stationId: "34",
      level: 4.5,
      thresholds: createThresholds(),
      evaluatedAt,
    });

    expect(assessment.status).toBe("normal");
    expect(assessment.marginToAlert).toBeCloseTo(0.5, 10);
    expect(assessment.marginToEvacuation).toBeCloseTo(0.75, 10);
    expect(assessment.marginToLowWater).toBeCloseTo(2.86, 10);
    expect(assessment.evaluatedAt).toBe(evaluatedAt);
  });

  it("informa margenes negativos cuando el umbral ya se supero", () => {
    const assessment = assessFlood({
      stationId: "34",
      level: 5.5,
      thresholds: createThresholds(),
      evaluatedAt,
    });

    expect(assessment.status).toBe("evacuation");
    expect(assessment.marginToAlert).toBeCloseTo(-0.5, 10);
    expect(assessment.marginToEvacuation).toBeCloseTo(-0.25, 10);
  });

  it("deja los margenes en null cuando falta el nivel o el umbral", () => {
    const withoutLevel = assessFlood({
      stationId: "34",
      level: null,
      thresholds: createThresholds(),
      evaluatedAt,
    });
    expect(withoutLevel.marginToAlert).toBeNull();
    expect(withoutLevel.marginToEvacuation).toBeNull();
    expect(withoutLevel.marginToLowWater).toBeNull();

    const withoutThresholds = assessFlood({
      stationId: "34",
      level: 4,
      thresholds: createThresholds({ lowWater: null, alert: null, evacuation: null }),
      evaluatedAt,
    });
    expect(withoutThresholds.marginToAlert).toBeNull();
    expect(withoutThresholds.marginToEvacuation).toBeNull();
    expect(withoutThresholds.marginToLowWater).toBeNull();
  });
});

describe("summarizeFlood", () => {
  const assessments = [
    assessFlood({ stationId: "34", level: 5.5, thresholds: createThresholds(), evaluatedAt }),
    assessFlood({ stationId: "30", level: 5.1, thresholds: createThresholds(), evaluatedAt }),
    assessFlood({ stationId: "33", level: 1.2, thresholds: createThresholds(), evaluatedAt }),
    assessFlood({ stationId: "29", level: 3, thresholds: createThresholds(), evaluatedAt }),
    assessFlood({
      stationId: "19",
      level: 3,
      thresholds: createThresholds({ lowWater: null, alert: null, evacuation: null }),
      evaluatedAt,
    }),
  ];

  it("cuenta cada estado", () => {
    const summary = summarizeFlood(assessments);

    expect(summary.total).toBe(5);
    expect(summary.countsByStatus).toEqual({
      evacuation: 1,
      alert: 1,
      low: 1,
      normal: 1,
      undefined: 1,
    });
  });

  it("informa el estado mas grave y las estaciones afectadas", () => {
    const summary = summarizeFlood(assessments);

    expect(summary.highestStatus).toBe("evacuation");
    expect(summary.alertingStationIds).toEqual(["34", "30"]);
    expect(summary.evacuatingStationIds).toEqual(["34"]);
  });

  it("resume un conjunto vacio", () => {
    const summary = summarizeFlood([]);

    expect(summary.total).toBe(0);
    expect(summary.highestStatus).toBe("undefined");
    expect(summary.alertingStationIds).toEqual([]);
    expect(summary.evacuatingStationIds).toEqual([]);
    const statuses: readonly FloodStatus[] = orderedFloodStatuses();
    expect(statuses.map((status) => summary.countsByStatus[status])).toEqual([0, 0, 0, 0, 0]);
  });
});
