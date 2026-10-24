/**
 * Procedencia de los datos que muestra el sitio.
 *
 * La atribucion viaja con cada exportacion y con cada vista para que el dato
 * nunca se separe de su origen. La unica fuente marcada como de terceros es el
 * pronostico: todo lo demas sale de organismos publicos argentinos.
 */

import type { SourceAttribution } from "@/domain/export/types";

export const inaAttribution: SourceAttribution = {
  name: "INA - Sistema de Informacion Hidrologica",
  url: "https://alerta.ina.gob.ar/",
  isThirdParty: false,
};

export const prefecturaAttribution: SourceAttribution = {
  name: "Prefectura Naval Argentina",
  url: "https://www.argentina.gob.ar/prefecturanaval",
  isThirdParty: false,
};

export const intaAttribution: SourceAttribution = {
  name: "INTA - Instituto Nacional de Tecnologia Agropecuaria",
  url: "https://www.argentina.gob.ar/inta",
  isThirdParty: false,
};

export const smnAttribution: SourceAttribution = {
  name: "SMN - Servicio Meteorologico Nacional",
  url: "https://www.smn.gob.ar/",
  isThirdParty: false,
};

export const openMeteoAttribution: SourceAttribution = {
  name: "Open-Meteo",
  url: "https://open-meteo.com/",
  isThirdParty: true,
};

/** Fuentes oficiales que respaldan las series hidrometricas publicadas. */
export const hydrologyAttributions: readonly SourceAttribution[] = [
  inaAttribution,
  prefecturaAttribution,
  intaAttribution,
];
