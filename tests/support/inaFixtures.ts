/**
 * Respuestas del INA recortadas a partir de datos reales.
 *
 * Se conservan los nombres de campo tal como los publica el organismo, porque
 * son justamente lo que los adaptadores deben traducir.
 */

export const rosarioStationRow = {
  sitecode: 34,
  nombre: "Rosario",
  distrito: "Santa Fe",
  pais: "Argentina",
  tipo: "H",
  tipo_nombre: "Hidrológica",
  propietario: null,
  id_externo: null,
  url: null,
  var: "H",
  tabla_id: "alturas_prefe",
  nombre_red: "escalas Prefectura Nacional",
  redes_id: 10,
  abrev: "Rosario",
  lon: -60.6308206029857,
  lat: -32.9432699442268,
  cero_ign: null,
  automatica: false,
  rio: "PARANAINF",
  real: true,
  nivel_de_alerta: 5,
  nivel_de_evacuacion: 5.25,
  nivel_de_aguas_bajas: 1.64,
};

export const meteorologicalStationRow = {
  sitecode: 1722,
  nombre: "Rosario",
  distrito: null,
  pais: "Argentina",
  tipo: "M",
  tipo_nombre: "Meteorológica",
  propietario: null,
  id_externo: null,
  url: null,
  var: null,
  tabla_id: "estaciones_pvnymm",
  nombre_red: null,
  redes_id: null,
  abrev: null,
  lon: -60.6183013916016,
  lat: -32.9730987548828,
  cero_ign: null,
  automatica: true,
  rio: null,
  real: true,
  nivel_de_alerta: null,
  nivel_de_evacuacion: null,
  nivel_de_aguas_bajas: null,
};

export const firstObservationRow = {
  obs_id: 1,
  timestart: "2026-10-20T00:00:00",
  timeend: null,
  valor: 4.1,
  timeupdate: "2026-10-20T13:30:00",
};

export const secondObservationRow = {
  obs_id: 2,
  timestart: "2026-10-21T00:00:00",
  timeend: null,
  valor: "4.25",
  timeupdate: "2026-10-21T13:30:00",
};

export const observationWithoutTimestampRow = {
  obs_id: 3,
  timestart: null,
  timeend: null,
  valor: 4.3,
  timeupdate: null,
};

export const observationWithoutValueRow = {
  obs_id: 4,
  timestart: "2026-10-22T00:00:00",
  timeend: null,
  valor: null,
  timeupdate: null,
};

export const observationRows = [
  firstObservationRow,
  secondObservationRow,
  observationWithoutTimestampRow,
  observationWithoutValueRow,
];

export const seriesRows = [
  {
    seriesid: 3412,
    sitecode: 34,
    estacion_nombre: "Rosario",
    varid: 2,
    procid: 4,
    proc_nombre: "Simulado",
    unit_nombre: "metros",
    obs_count: null,
  },
  {
    seriesid: 77,
    sitecode: 34,
    estacion_nombre: "Rosario",
    varid: 2,
    procid: 1,
    proc_nombre: "medición directa",
    unit_nombre: "metros",
    obs_count: null,
  },
  {
    seriesid: 78,
    sitecode: 34,
    estacion_nombre: "Rosario",
    varid: 2,
    procid: 1,
    proc_nombre: "medición directa",
    unit_nombre: "metros",
    obs_count: null,
  },
  {
    seriesid: 34,
    sitecode: 34,
    estacion_nombre: "Rosario",
    varid: 2,
    procid: 1,
    proc_nombre: "medición directa",
    unit_nombre: "metros",
    obs_count: 53_740,
  },
  {
    seriesid: 99,
    sitecode: 34,
    estacion_nombre: "Rosario",
    varid: 2,
    procid: 1,
    proc_nombre: "medición directa",
    unit_nombre: "metros",
    obs_count: 120,
  },
];

export const percentileRows = [
  { doy: 295, percentil: 0.5, valor: 3.2, tipo: "puntual" },
  { doy: 295, percentil: 0.01, valor: 1.1, tipo: "puntual" },
  { doy: 295, percentil: 0.99, valor: 6.4, tipo: "puntual" },
  { doy: 100, percentil: 0.5, valor: 2.7, tipo: "puntual" },
  { doy: null, percentil: 0.5, valor: 2.7, tipo: "puntual" },
  { doy: 10, percentil: null, valor: 2.7, tipo: "puntual" },
  { doy: 10, percentil: 0.5, valor: null, tipo: "puntual" },
];

export const openMeteoPayload = {
  latitude: -32.95,
  longitude: -60.63,
  generationtime_ms: 0.1,
  utc_offset_seconds: -10_800,
  timezone: "America/Argentina/Cordoba",
  timezone_abbreviation: "-03",
  elevation: 25,
  current_units: { time: "iso8601", temperature_2m: "°C" },
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
  daily_units: { time: "iso8601", temperature_2m_max: "°C" },
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
