/**
 * Aviso de evacuacion.
 *
 * El cartel de emergencia se muestra en las vistas que consultan el corredor.
 * Si ninguna estacion esta en evacuacion queda oculto, de modo que un cambio
 * de estado en la recarga lo apaga sin recargar la pagina.
 */

import type { StationReading } from "@/application/station/loadStationReadings";
import type { FloodSummary } from "@/domain/flood/types";
import { interpolate } from "../i18n";
import type { TranslationSchema } from "../i18n/translations/es";
import { queryElement, setHidden } from "../runtime/dom";

export function evacuatingStationNames(
  summary: FloodSummary,
  readings: readonly StationReading[],
): readonly string[] {
  const nameById = new Map(readings.map((reading) => [reading.station.id, reading.station.name]));

  return summary.evacuatingStationIds
    .map((stationId) => nameById.get(stationId) ?? stationId)
    .sort((left, right) => left.localeCompare(right));
}

export function updateEmergencyBanner(
  document: Document,
  stationNames: readonly string[],
  translations: TranslationSchema,
): void {
  const banner = queryElement<HTMLElement>(document, "[data-emergency-banner]");

  if (banner === null) {
    return;
  }

  if (stationNames.length === 0) {
    setHidden(banner, true);
    return;
  }

  const message = queryElement<HTMLElement>(banner, "[data-emergency-message]");

  if (message !== null) {
    message.textContent = interpolate(translations.dashboard.emergencyBanner, {
      station: stationNames.join(", "),
    });
  }

  setHidden(banner, false);
}
