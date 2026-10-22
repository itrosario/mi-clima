import { describe, expect, it } from "vitest";
import {
  defaultMovingWindowDays,
  findReading,
  loadStationReadings,
  stationsWithReadings,
} from "@/application/station/loadStationReadings";
import { createSeries } from "@/domain/telemetry/series";
import type { DateRange } from "@/domain/telemetry/types";
import { FakeClock, FakeHydrologySource } from "../../support/applicationFakes";
import { createPoint, createStation } from "../../support/factories";

const now = new Date("2026-10-22T12:00:00.000Z");
const range: DateRange = {
  from: new Date("2026-10-15T12:00:00.000Z"),
  to: now,
};

function rosarioSeries() {
  return createSeries("34", 2, "m", [
    createPoint("2026-10-20T03:00:00.000Z", 4.5),
    createPoint("2026-10-21T03:00:00.000Z", 4.8),
    createPoint("2026-10-22T03:00:00.000Z", 5.1),
  ]);
}

describe("loadStationReadings", () => {
  it("evalua la ultima lectura y calcula las analiticas", async () => {
    const source = new FakeHydrologySource({ "34": rosarioSeries() });
    const clock = new FakeClock(now);

    const readings = await loadStationReadings(
      { stations: [createStation()], range },
      { hydrologySource: source, clock },
    );

    const reading = readings[0];

    expect(source.calls[0]?.request).toEqual({
      stationId: "34",
      variableId: 2,
      from: range.from,
      to: range.to,
    });
    expect(reading?.latestPoint?.value).toBe(5.1);
    expect(reading?.assessment.status).toBe("alert");
    expect(reading?.assessment.evaluatedAt.toISOString()).toBe("2026-10-22T03:00:00.000Z");
    expect(reading?.trend.direction).toBe("rising");
    expect(reading?.variability.sampleCount).toBe(3);
    expect(reading?.movingAverage).toHaveLength(3);
    expect(reading?.dailyExtremes).toHaveLength(3);
  });

  it("informa una estacion sin datos como estado indefinido", async () => {
    const source = new FakeHydrologySource({});
    const clock = new FakeClock(now);

    const readings = await loadStationReadings(
      { stations: [createStation()], range },
      { hydrologySource: source, clock },
    );

    const reading = readings[0];

    expect(reading?.latestPoint).toBeNull();
    expect(reading?.assessment.status).toBe("undefined");
    expect(reading?.assessment.evaluatedAt).toBe(now);
    expect(reading?.trend.direction).toBe("unknown");
    expect(reading?.variability.sampleCount).toBe(0);
    expect(reading?.movingAverage).toEqual([]);
    expect(reading?.dailyExtremes).toEqual([]);
  });

  it("acepta otra variable y otra ventana de media movil", async () => {
    const source = new FakeHydrologySource({ "34": rosarioSeries() });

    await loadStationReadings(
      { stations: [createStation()], range, variableId: 4 },
      {
        hydrologySource: source,
        clock: new FakeClock(now),
        movingWindowDays: 1,
        concurrency: 1,
      },
    );

    expect(source.calls[0]?.request.variableId).toBe(4);
    expect(defaultMovingWindowDays).toBe(2);
  });

  it("propaga la senal de cancelacion", async () => {
    const source = new FakeHydrologySource({ "34": rosarioSeries() });
    const controller = new AbortController();

    await loadStationReadings(
      { stations: [createStation()], range },
      { hydrologySource: source, clock: new FakeClock(now) },
      controller.signal,
    );

    expect(source.calls[0]?.signal).toBe(controller.signal);
  });
});

describe("stationsWithReadings", () => {
  it("descarta las lecturas sin nivel observado", async () => {
    const source = new FakeHydrologySource({ "34": rosarioSeries() });

    const readings = await loadStationReadings(
      {
        stations: [createStation({ id: "34" }), createStation({ id: "35", name: "Villa" })],
        range,
      },
      { hydrologySource: source, clock: new FakeClock(now) },
    );

    expect(readings).toHaveLength(2);
    expect(stationsWithReadings(readings).map((reading) => reading.station.id)).toEqual(["34"]);
  });
});

describe("findReading", () => {
  it("encuentra una lectura por estacion y devuelve null si no esta", async () => {
    const source = new FakeHydrologySource({ "34": rosarioSeries() });

    const readings = await loadStationReadings(
      { stations: [createStation()], range },
      { hydrologySource: source, clock: new FakeClock(now) },
    );

    expect(findReading(readings, "34")?.station.name).toBe("Rosario");
    expect(findReading(readings, "99")).toBeNull();
  });
});
