import { describe, expect, it } from "vitest";
import { millisecondsPerDay, rangeEndingAt, shiftDays } from "@/application/shared/time";

describe("shiftDays", () => {
  it("avanza y retrocede dias sin tocar el reloj", () => {
    const base = new Date("2026-10-22T12:00:00.000Z");

    expect(shiftDays(base, 1).toISOString()).toBe("2026-10-23T12:00:00.000Z");
    expect(shiftDays(base, -2).toISOString()).toBe("2026-10-20T12:00:00.000Z");
    expect(shiftDays(base, 0).getTime()).toBe(base.getTime());
  });
});

describe("rangeEndingAt", () => {
  it("construye una ventana que termina en el instante pedido", () => {
    const end = new Date("2026-10-22T12:00:00.000Z");
    const range = rangeEndingAt(end, 7);

    expect(range.to).toBe(end);
    expect(range.from.getTime()).toBe(end.getTime() - 7 * millisecondsPerDay);
  });
});
