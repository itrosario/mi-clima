import { describe, expect, it } from "vitest";
import { buildAlertPush, isGonePushResponse } from "@/worker/alertPush";
import { createFloodEvent } from "../support/alertFakes";

describe("buildAlertPush", () => {
  it("construye mensajes para todos los tipos en español", () => {
    const alert = buildAlertPush(
      createFloodEvent({ type: "alert", stationName: "Rosario", level: 5.2 }),
      "es",
    );
    expect(alert.title).toContain("Rosario");
    expect(alert.body).toContain("oficial");
    expect(alert.url).toBe("/es/alertas/");
    expect(alert.tag).toBe("mi-clima-34");

    const evacuation = buildAlertPush(
      createFloodEvent({ type: "evacuation", stationName: "Paraná", level: 5.5 }),
      "es",
    );
    expect(evacuation.title).toContain("Evacuación");
    expect(evacuation.body).toContain("evacuación");

    const clear = buildAlertPush(
      createFloodEvent({ type: "clear", stationName: "Santa Fe", level: 3.0 }),
      "es",
    );
    expect(clear.title).toContain("finalizada");
    expect(clear.body).toContain("ya no supera");

    const rapid = buildAlertPush(
      createFloodEvent({
        type: "rapid-rise",
        stationName: "Corrientes",
        level: 4.8,
        riseMetres: 0.35,
        windowHours: 6,
      }),
      "es",
    );
    expect(rapid.title).toContain("Subida rápida");
    expect(rapid.body).toContain("0,35");
  });

  it("construye mensajes en inglés sin nivel", () => {
    expect(buildAlertPush(createFloodEvent({ type: "alert", level: null }), "en").body).toContain(
      "alert threshold",
    );
    expect(
      buildAlertPush(createFloodEvent({ type: "evacuation", level: null }), "en").body,
    ).toContain("evacuation threshold");
    expect(buildAlertPush(createFloodEvent({ type: "clear", level: null }), "en").body).toContain(
      "no longer above",
    );
    expect(
      buildAlertPush(
        createFloodEvent({ type: "rapid-rise", riseMetres: null, windowHours: 24 }),
        "en",
      ).body,
    ).toContain("rose sharply");
  });

  it("detecta respuestas vencidas", () => {
    expect(isGonePushResponse({ status: 404 })).toBe(true);
    expect(isGonePushResponse({ status: 410 })).toBe(true);
    expect(isGonePushResponse({ status: 201 })).toBe(false);
  });
});
