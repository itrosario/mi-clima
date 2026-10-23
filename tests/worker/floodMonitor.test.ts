import { describe, expect, it, vi } from "vitest";
import {
  detectFloodEvents,
  type MonitorStationSnapshot,
  runFloodMonitor,
} from "@/worker/floodMonitor";
import { createMonitorState, createStationState, FakeAlertKv } from "../support/alertFakes";

function stationRow() {
  return {
    sitecode: "34",
    nombre: "Rosario",
    rio: "Paraná",
    lat: -32.95,
    lon: -60.63,
    tipo: "H",
    var: "H",
    nivel_de_aguas_bajas: 2,
    nivel_de_alerta: 4,
    nivel_de_evacuacion: 5,
  };
}

function datosRow(timestart: string, valor: number) {
  return { timestart, valor };
}

describe("detectFloodEvents", () => {
  it("detecta subida a alerta", () => {
    const snapshot: MonitorStationSnapshot = {
      stationId: "34",
      stationName: "Rosario",
      state: {
        status: "alert",
        level: 4.5,
        observedAt: "2026-10-23T09:00:00.000Z",
        lastRapidRiseNotifiedAt: null,
      },
      rise6h: 0.4,
      rise24h: 0.5,
    };
    const previous = createMonitorState({
      "34": createStationState({ status: "normal", level: 4.0 }),
    });
    const events = detectFloodEvents([snapshot], previous, new Date("2026-10-23T09:00:00.000Z"));
    expect(events[0]?.type).toBe("alert");
  });

  it("detecta evacuación y clear", () => {
    const snapshotClear: MonitorStationSnapshot = {
      stationId: "34",
      stationName: "Rosario",
      state: {
        status: "normal",
        level: 3.5,
        observedAt: "2026-10-23T09:00:00.000Z",
        lastRapidRiseNotifiedAt: null,
      },
      rise6h: 0.1,
      rise24h: 0.2,
    };
    const prevEvac = createMonitorState({
      "34": createStationState({ status: "evacuation", level: 5.1 }),
    });
    expect(detectFloodEvents([snapshotClear], prevEvac, new Date())[0]?.type).toBe("clear");
    expect(detectFloodEvents([], createMonitorState({}), new Date())).toEqual([]);
    const snapshotUndef: MonitorStationSnapshot = {
      stationId: "34",
      stationName: "Rosario",
      state: { status: "undefined", level: null, observedAt: null, lastRapidRiseNotifiedAt: null },
      rise6h: null,
      rise24h: null,
    };
    expect(detectFloodEvents([snapshotUndef], prevEvac, new Date())).toEqual([]);
  });
});

describe("runFloodMonitor", () => {
  it("no hace nada si no hay KV", async () => {
    const result = await runFloodMonitor({ kv: null });
    expect(result).toEqual({ initialized: false, events: [], delivered: 0 });
  });

  it("inicializa sin enviar avisos", async () => {
    const kv = new FakeAlertKv();
    const fetchImplementation = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input.toString());
      const request = url.searchParams.get("request") ?? "";
      if (request === "estaciones")
        return new Response(JSON.stringify({ data: [stationRow()] }), { status: 200 });
      if (request === "datos")
        return new Response(JSON.stringify({ data: [datosRow("2026-10-23 09:00:00", 4.5)] }), {
          status: 200,
        });
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    });
    const result = await runFloodMonitor({
      kv,
      fetchImplementation,
      now: () => new Date("2026-10-23T09:00:00.000Z"),
    });
    expect(result.initialized).toBe(true);
    expect(result.events).toEqual([]);
  });
});
