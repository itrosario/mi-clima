import { describe, expect, it } from "vitest";
import {
  defaultDashboardWindowDays,
  loadCorridorDashboard,
} from "@/application/dashboard/loadCorridorDashboard";
import { millisecondsPerDay } from "@/application/shared/time";
import { createSeries } from "@/domain/telemetry/series";
import { FakeClock, FakeHydrologySource } from "../../support/applicationFakes";
import { createPoint, createStation } from "../../support/factories";

const now = new Date("2026-10-22T12:00:00.000Z");

function seriesAt(stationId: string, value: number) {
  return createSeries(stationId, 2, "m", [createPoint("2026-10-22T03:00:00.000Z", value)]);
}

describe("loadCorridorDashboard", () => {
  it("resume el corredor y compara contra la estacion de referencia", async () => {
    const source = new FakeHydrologySource({
      "34": seriesAt("34", 5.1),
      "35": seriesAt("35", 3),
    });
    const clock = new FakeClock(now);

    const dashboard = await loadCorridorDashboard(
      [
        createStation({ id: "34", name: "Rosario" }),
        createStation({ id: "35", name: "Villa Constitucion" }),
      ],
      { hydrologySource: source, clock },
    );

    expect(dashboard.generatedAt).toBe(now);
    expect(dashboard.range.to).toBe(now);
    expect(dashboard.range.from.getTime()).toBe(
      now.getTime() - defaultDashboardWindowDays * millisecondsPerDay,
    );
    expect(dashboard.referenceStationId).toBe("34");
    expect(dashboard.comparison).toHaveLength(2);
    expect(dashboard.comparison[0]).toMatchObject({
      stationId: "34",
      name: "Rosario",
      value: 5.1,
      differenceFromReference: 0,
      dropFromPrevious: null,
    });
    expect(dashboard.comparison[1]).toMatchObject({
      stationId: "35",
      name: "Villa Constitucion",
      value: 3,
    });
    expect(dashboard.comparison[1]?.differenceFromReference).toBeCloseTo(-2.1);
    expect(dashboard.comparison[1]?.dropFromPrevious).toBeCloseTo(2.1);
    expect(dashboard.summary.countsByStatus).toMatchObject({ alert: 1, normal: 1 });
    expect(dashboard.hasEmergency).toBe(false);
  });

  it("activa la emergencia cuando una estacion esta en evacuacion", async () => {
    const source = new FakeHydrologySource({
      "34": seriesAt("34", 5.3),
      "35": createSeries("35", 2, "m", []),
    });
    const clock = new FakeClock(now);

    const dashboard = await loadCorridorDashboard(
      [
        createStation({ id: "34", name: "Rosario" }),
        createStation({ id: "35", name: "Villa Constitucion" }),
      ],
      { hydrologySource: source, clock, windowDays: 3 },
    );

    expect(dashboard.hasEmergency).toBe(true);
    expect(dashboard.summary.evacuatingStationIds).toEqual(["34"]);
    expect(dashboard.comparison.map((entry) => entry.stationId)).toEqual(["34"]);
  });

  it("respeta un rango explicito por sobre la ventana de dias", async () => {
    const source = new FakeHydrologySource({ "34": seriesAt("34", 5.1) });
    const range = {
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-30T00:00:00.000Z"),
    };

    const dashboard = await loadCorridorDashboard([createStation({ id: "34" })], {
      hydrologySource: source,
      clock: new FakeClock(now),
      windowDays: 3,
      range,
    });

    expect(dashboard.range).toBe(range);
    expect(source.calls[0]?.request.from).toBe(range.from);
    expect(source.calls[0]?.request.to).toBe(range.to);
  });
});
