/**
 * Respuestas simuladas de los organismos.
 *
 * Las pruebas end-to-end nunca salen a internet: el navegador recibe estas
 * cargas por intercepcion de red, con la misma forma que publican el INA, la
 * Prefectura y Open-Meteo.
 */

import type { Page } from "@playwright/test";

interface StationDefinition {
  readonly id: number;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly alert: number;
  readonly evacuation: number;
  readonly lowWater: number;
  readonly levels: readonly number[];
}

const corridor: readonly StationDefinition[] = [
  {
    id: 19,
    name: "Corrientes",
    latitude: -27.469,
    longitude: -58.834,
    alert: 6.5,
    evacuation: 7.5,
    lowWater: 2.0,
    levels: [5.1, 5.2, 5.3, 5.4],
  },
  {
    id: 29,
    name: "Parana",
    latitude: -31.733,
    longitude: -60.529,
    alert: 4.8,
    evacuation: 5.5,
    lowWater: 1.5,
    levels: [4.2, 4.3, 4.4, 4.5],
  },
  {
    id: 30,
    name: "Santa Fe",
    latitude: -31.633,
    longitude: -60.7,
    alert: 5.0,
    evacuation: 5.8,
    lowWater: 1.6,
    levels: [4.6, 4.7, 4.8, 4.9],
  },
  {
    id: 33,
    name: "San Lorenzo",
    latitude: -32.819,
    longitude: -60.73,
    alert: 4.9,
    evacuation: 5.4,
    lowWater: 1.5,
    levels: [4.4, 4.5, 4.6, 4.7],
  },
  {
    id: 34,
    name: "Rosario",
    latitude: -32.943,
    longitude: -60.631,
    alert: 5.0,
    evacuation: 5.25,
    lowWater: 1.64,
    levels: [5.2, 5.3, 5.4, 5.6],
  },
  {
    id: 35,
    name: "Villa Constitucion",
    latitude: -33.23,
    longitude: -60.33,
    alert: 5.2,
    evacuation: 5.7,
    lowWater: 1.7,
    levels: [4.8, 4.9, 5.0, 5.1],
  },
];

const observationDates = [
  "2026-10-19T00:00:00",
  "2026-10-20T00:00:00",
  "2026-10-21T00:00:00",
  "2026-10-22T00:00:00",
] as const;

export function stationRows(): readonly Readonly<Record<string, unknown>>[] {
  return corridor.map((station) => ({
    sitecode: station.id,
    nombre: station.name,
    distrito: "Santa Fe",
    pais: "Argentina",
    tipo: "H",
    tipo_nombre: "Hidrologica",
    propietario: null,
    id_externo: null,
    url: null,
    var: "H",
    tabla_id: "alturas_prefe",
    nombre_red: "escalas Prefectura Nacional",
    redes_id: 10,
    abrev: station.name,
    lon: station.longitude,
    lat: station.latitude,
    cero_ign: null,
    automatica: false,
    rio: "PARANAINF",
    real: true,
    nivel_de_alerta: station.alert,
    nivel_de_evacuacion: station.evacuation,
    nivel_de_aguas_bajas: station.lowWater,
  }));
}

function stationById(stationId: number): StationDefinition | null {
  return corridor.find((station) => station.id === stationId) ?? null;
}

export function observationRowsFor(
  stationId: number,
): readonly Readonly<Record<string, unknown>>[] {
  const station = stationById(stationId);

  if (station === null) {
    return [];
  }

  return station.levels.map((level, index) => ({
    obs_id: stationId * 10 + index,
    timestart: observationDates[index] as string,
    timeend: null,
    valor: level,
    timeupdate: `${observationDates[index] as string}.000`,
  }));
}

export const seriesRows = [
  {
    seriesid: 3400 + 34,
    sitecode: 34,
    estacion_nombre: "Rosario",
    varid: 2,
    procid: 1,
    proc_nombre: "medicion directa",
    unit_nombre: "metros",
    obs_count: 53_740,
  },
];

export const percentileRows = [
  { doy: 295, percentil: 0.5, valor: 3.2, tipo: "puntual" },
  { doy: 295, percentil: 0.01, valor: 1.1, tipo: "puntual" },
  { doy: 295, percentil: 0.99, valor: 6.4, tipo: "puntual" },
];

export const weatherPayload = {
  latitude: -32.95,
  longitude: -60.63,
  generationtime_ms: 0.1,
  utc_offset_seconds: -10_800,
  timezone: "America/Argentina/Cordoba",
  timezone_abbreviation: "-03",
  elevation: 25,
  current_units: { time: "iso8601", temperature_2m: "C" },
  current: {
    time: "2026-10-22T13:45",
    interval: 900,
    temperature_2m: 23.2,
    relative_humidity_2m: 73,
    apparent_temperature: 24.2,
    precipitation: 0.1,
    weather_code: 51,
    cloud_cover: 99,
    pressure_msl: 1009.1,
    wind_speed_10m: 13.3,
    wind_direction_10m: 74,
  },
  daily_units: { time: "iso8601", temperature_2m_max: "C" },
  daily: {
    time: ["2026-10-22", "2026-10-23"],
    weather_code: [51, 0],
    temperature_2m_max: [25.4, 27.1],
    temperature_2m_min: [14.8, 15.2],
    precipitation_sum: [0.4, 0],
    precipitation_probability_max: [55, 0],
    wind_speed_10m_max: [21.6, 18.4],
  },
};

function prefecturaReading(
  portId: number,
  portName: string,
  levelMetres: number,
  trend: "rising" | "falling" | "steady",
): Readonly<Record<string, unknown>> {
  return {
    portId,
    portName,
    riverName: "PARANA",
    levelMetres,
    variationMetres: 0.03,
    periodHours: 12,
    observedAt: "2026-10-22T15:00:00.000Z",
    trend,
    alertLevelMetres: 5.0,
    evacuationLevelMetres: 5.25,
    previousLevelMetres: levelMetres - 0.03,
    previousObservedAt: "2026-10-22T03:00:00.000Z",
  };
}

export const prefecturaSnapshot = {
  fetchedAt: "2026-10-22T15:20:00.000Z",
  sourceName: "Prefectura Naval Argentina",
  readings: [
    prefecturaReading(280, "ROSARIO", 5.6, "rising"),
    prefecturaReading(281, "SANTA FE", 4.9, "rising"),
    prefecturaReading(282, "PARANA", 4.5, "steady"),
    prefecturaReading(283, "CORRIENTES", 5.4, "falling"),
    prefecturaReading(284, "SAN LORENZO", 4.7, "steady"),
    prefecturaReading(285, "VILLA CONSTITUCION", 5.1, "rising"),
  ],
};

function requestResource(body: string | null): string | null {
  return body === null ? null : new URLSearchParams(body).get("request");
}

/** Intercepta todas las fuentes externas y el proxy propio del sitio. */
function inaDataFor(resource: string | null, params: URLSearchParams): unknown {
  if (resource === "estaciones") {
    return stationRows();
  }

  if (resource === "datos") {
    return observationRowsFor(Number(params.get("siteCode")));
  }

  if (resource === "series") {
    return seriesRows;
  }

  if (resource === "percentiles") {
    return percentileRows;
  }

  return [];
}

export async function mockDataSources(page: Page): Promise<void> {
  await page.route("**/api/ina*", async (route) => {
    const url = new URL(route.request().url());

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: inaDataFor(url.searchParams.get("request"), url.searchParams),
      }),
    });
  });

  await page.route("**/api/clima*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(weatherPayload),
    });
  });

  await page.route("https://alerta.ina.gob.ar/**", async (route) => {
    const request = route.request();
    const resource = requestResource(request.postData());
    const params = new URLSearchParams(request.postData() ?? "");
    let data: unknown = [];

    if (resource === "estaciones") {
      data = stationRows();
    } else if (resource === "datos") {
      data = observationRowsFor(Number(params.get("siteCode")));
    } else if (resource === "series") {
      data = seriesRows;
    } else if (resource === "percentiles") {
      data = percentileRows;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data }),
    });
  });

  await page.route("https://api.open-meteo.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(weatherPayload),
    });
  });

  await page.route("**/api/prefectura*", async (route) => {
    const url = new URL(route.request().url());

    if (url.pathname.endsWith("/historico")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          fetchedAt: "2026-10-22T15:20:00.000Z",
          portId: Number(url.searchParams.get("id")),
          sourceName: "Prefectura Naval Argentina",
          points: [
            { timestamp: "2026-10-21T15:00:00.000Z", levelMetres: 5.5 },
            { timestamp: "2026-10-22T15:00:00.000Z", levelMetres: 5.6 },
          ],
        }),
      });

      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(prefecturaSnapshot),
    });
  });
}
