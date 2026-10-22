/**
 * Evaluacion del semaforo hidrologico y sintesis del estado agregado.
 *
 * Toda la logica es pura: recibe un nivel y umbrales, devuelve un estado.
 */

import type { StationId, Thresholds } from "../catalog/types";
import type { FloodAssessment, FloodStatus, FloodSummary } from "./types";
import { floodStatuses } from "./types";

/** Orden de gravedad creciente para resumir un conjunto de estados. */
const statusSeverity: Readonly<Record<FloodStatus, number>> = {
  undefined: 0,
  normal: 1,
  low: 2,
  alert: 3,
  evacuation: 4,
};

/**
 * Evalua el estado del semaforo.
 *
 * El orden importa: evacuacion prevalece sobre alerta, y alerta prevalece
 * sobre aguas bajas. Si no hay ningun umbral publicado, el estado es
 * `undefined` aunque haya una medicion.
 */
export function evaluateFloodStatus(level: number | null, thresholds: Thresholds): FloodStatus {
  const hasThreshold =
    thresholds.lowWater !== null || thresholds.alert !== null || thresholds.evacuation !== null;

  if (!hasThreshold || level === null) {
    return "undefined";
  }

  if (thresholds.evacuation !== null && level >= thresholds.evacuation) {
    return "evacuation";
  }

  if (thresholds.alert !== null && level >= thresholds.alert) {
    return "alert";
  }

  if (thresholds.lowWater !== null && level <= thresholds.lowWater) {
    return "low";
  }

  return "normal";
}

export function isAlertOrWorse(status: FloodStatus): boolean {
  return status === "alert" || status === "evacuation";
}

export function isEvacuation(status: FloodStatus): boolean {
  return status === "evacuation";
}

export function compareStatusSeverity(left: FloodStatus, right: FloodStatus): number {
  return statusSeverity[left] - statusSeverity[right];
}

/** Mayor gravedad presente en un conjunto de estados. */
export function highestFloodStatus(statuses: readonly FloodStatus[]): FloodStatus {
  let highest: FloodStatus = "undefined";

  for (const status of statuses) {
    if (statusSeverity[status] > statusSeverity[highest]) {
      highest = status;
    }
  }

  return highest;
}

export interface FloodAssessmentInput {
  readonly stationId: StationId;
  readonly level: number | null;
  readonly thresholds: Thresholds;
  readonly evaluatedAt: Date;
}

/** Construye la evaluacion completa de una estacion. */
export function assessFlood(input: FloodAssessmentInput): FloodAssessment {
  const { stationId, level, thresholds, evaluatedAt } = input;

  return {
    stationId,
    status: evaluateFloodStatus(level, thresholds),
    level,
    thresholds,
    marginToAlert: level !== null && thresholds.alert !== null ? thresholds.alert - level : null,
    marginToEvacuation:
      level !== null && thresholds.evacuation !== null ? thresholds.evacuation - level : null,
    marginToLowWater:
      level !== null && thresholds.lowWater !== null ? level - thresholds.lowWater : null,
    evaluatedAt,
  };
}

function emptyStatusCounts(): Record<FloodStatus, number> {
  return {
    evacuation: 0,
    alert: 0,
    low: 0,
    normal: 0,
    undefined: 0,
  };
}

/** Resume un conjunto de evaluaciones para el panel y el banner de emergencia. */
export function summarizeFlood(assessments: readonly FloodAssessment[]): FloodSummary {
  const countsByStatus = emptyStatusCounts();

  for (const assessment of assessments) {
    countsByStatus[assessment.status] += 1;
  }

  return {
    total: assessments.length,
    countsByStatus,
    highestStatus: highestFloodStatus(assessments.map((assessment) => assessment.status)),
    alertingStationIds: assessments
      .filter((assessment) => isAlertOrWorse(assessment.status))
      .map((assessment) => assessment.stationId),
    evacuatingStationIds: assessments
      .filter((assessment) => isEvacuation(assessment.status))
      .map((assessment) => assessment.stationId),
  };
}

/** Estados en orden de gravedad, util para leyendas. */
export function orderedFloodStatuses(): readonly FloodStatus[] {
  return floodStatuses;
}
