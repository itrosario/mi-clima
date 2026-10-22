import { describe, expect, it } from "vitest";
import {
  conditionFromWmoCode,
  isPrecipitationCondition,
  windDirectionFromDegrees,
} from "@/domain/weather/conditions";
import type { WeatherCondition } from "@/domain/weather/types";

describe("conditionFromWmoCode", () => {
  it.each([
    [0, "clear"],
    [1, "mainly-clear"],
    [2, "partly-cloudy"],
    [3, "overcast"],
    [45, "fog"],
    [48, "fog"],
    [51, "drizzle"],
    [53, "drizzle"],
    [55, "drizzle"],
    [56, "freezing-drizzle"],
    [57, "freezing-drizzle"],
    [61, "rain"],
    [63, "rain"],
    [65, "rain"],
    [66, "freezing-rain"],
    [67, "freezing-rain"],
    [71, "snow"],
    [73, "snow"],
    [75, "snow"],
    [77, "snow"],
    [80, "rain-showers"],
    [81, "rain-showers"],
    [82, "rain-showers"],
    [85, "snow-showers"],
    [86, "snow-showers"],
    [95, "thunderstorm"],
    [96, "thunderstorm-hail"],
    [99, "thunderstorm-hail"],
  ])("traduce el codigo WMO %s a %s", (wmoCode, condition) => {
    expect(conditionFromWmoCode(wmoCode)).toBe(condition);
  });

  it("devuelve unknown cuando el codigo falta o no esta previsto", () => {
    expect(conditionFromWmoCode(null)).toBe("unknown");
    expect(conditionFromWmoCode(undefined)).toBe("unknown");
    expect(conditionFromWmoCode(42)).toBe("unknown");
  });
});

describe("windDirectionFromDegrees", () => {
  it.each([
    [0, "north"],
    [22, "north"],
    [45, "north-east"],
    [90, "east"],
    [135, "south-east"],
    [180, "south"],
    [225, "south-west"],
    [270, "west"],
    [315, "north-west"],
    [360, "north"],
    [400, "north-east"],
    [-45, "north-west"],
    [-90, "west"],
  ])("traduce %s grados a %s", (degrees, direction) => {
    expect(windDirectionFromDegrees(degrees)).toBe(direction);
  });

  it("devuelve null cuando la direccion no es un numero", () => {
    expect(windDirectionFromDegrees(null)).toBeNull();
    expect(windDirectionFromDegrees(undefined)).toBeNull();
    expect(windDirectionFromDegrees(Number.NaN)).toBeNull();
  });
});

describe("isPrecipitationCondition", () => {
  it.each([
    "drizzle",
    "freezing-drizzle",
    "rain",
    "freezing-rain",
    "snow",
    "rain-showers",
    "snow-showers",
    "thunderstorm",
    "thunderstorm-hail",
  ])("considera %s una condicion con precipitacion", (condition) => {
    expect(isPrecipitationCondition(condition as WeatherCondition)).toBe(true);
  });

  it.each(["clear", "mainly-clear", "partly-cloudy", "overcast", "fog", "unknown"])(
    "no considera %s una condicion con precipitacion",
    (condition) => {
      expect(isPrecipitationCondition(condition as WeatherCondition)).toBe(false);
    },
  );
});
