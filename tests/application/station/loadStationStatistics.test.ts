import { describe, expect, it } from "vitest";
import { loadStationStatistics } from "@/application/station/loadStationStatistics";
import { createSeries } from "@/domain/telemetry/series";
import type { DateRange } from "@/domain/telemetry/types";
import {
  FakeCache,
  FakeClock,
  FakeHydrologySource,
  FakePercentilesSource,
} from "../../support/applicationFakes";
import { createPoint, createStation } from "../../support/factories";

const now = new Date("2026-10-22T12:00:00.000Z");
const recentRange: DateRange = {
  from: new Date("2026-07-25T00:00:00.000Z"),
  to: now,
};
const historyRange: DateRange = {
  from: new Date("2021-10-22T00:00:00.000Z"),
  to: now,
};

const percentileTable = {
  stationId: "34",
  variableId: 2,
  profiles: [
    {
      dayOfYear: 1,
      percentiles: [
        { percentile: 10, value: 1 },
        { percentile: 50, value: 3 },
        { percentile: 90, value: 5 },
      ],
    },
  ],
};

describe("loadStationStatistics", () => {
  it("combina la ventana reciente con el historico y la anomalia", async () => {
    const recentSeries = createSeries("34", 2, "m", [
      createPoint("2026-10-21T03:00:00.000Z", 4.9),
      createPoint("2026-10-22T03:00:00.000Z", 5.1),
    ]);
    const historySeries = createSeries("34", 2, "m", [
      createPoint("2025-10-01T03:00:00.000Z", 5.4),
      createPoint("2026-10-22T03:00:00.000Z", 5.1),
    ]);
    const source = new FakeHydrologySource((request) =>
      request.from.getTime() === recentRange.from.getTime() ? recentSeries : historySeries,
    );
    const controller = new AbortController();

    const statistics = await loadStationStatistics(
      { station: createStation(), recentRange, historyRange },
      {
        hydrologySource: source,
        clock: new FakeClock(now),
        percentilesSource: new FakePercentilesSource({ "34": percentileTable }),
        cache: new FakeCache(),
      },
      controller.signal,
    );

    expect(source.calls).toHaveLength(2);
    expect(source.calls[0]?.signal).toBe(controller.signal);
    expect(statistics.reading.latestPoint?.value).toBe(5.1);
    expect(statistics.annualExtremes.map((extreme) => extreme.year)).toEqual([2025, 2026]);
    expect(statistics.historyPointCount).toBe(2);
    expect(statistics.anomaly?.anomaly.observed).toBe(5.1);
  });

  it("omite la anomalia cuando no hay observaciones recientes", async () => {
    const source = new FakeHydrologySource((request) =>
      request.from.getTime() === recentRange.from.getTime()
        ? createSeries("34", 2, "m", [])
        : createSeries("34", 2, "m", []),
    );

    const statistics = await loadStationStatistics(
      { station: createStation(), recentRange, historyRange },
      {
        hydrologySource: source,
        clock: new FakeClock(now),
        percentilesSource: new FakePercentilesSource({ "34": percentileTable }),
        cache: new FakeCache(),
      },
    );

    expect(statistics.reading.latestPoint).toBeNull();
    expect(statistics.anomaly).toBeNull();
    expect(statistics.annualExtremes).toEqual([]);
    expect(statistics.historyPointCount).toBe(0);
  });
});
