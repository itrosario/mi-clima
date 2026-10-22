/**
 * Normalizacion de nombres de rio publicados por los organismos oficiales.
 *
 * El INA publica el rio con nombres heterogeneos: `PARANAMED`, `PARANAINF`,
 * `Paraná`, `Paraná de las Palmas`, `Parana medio`, ... Esta pieza traduce
 * esas variantes a un rio canonico con su tramo, de modo que el catalogo
 * pueda agrupar, filtrar y comparar estaciones.
 */

import type { NormalizedRiver, ReachId, RiverId } from "./types";

/**
 * Reglas curadas del catalogo. El patron se evalua contra el nombre
 * normalizado (mayusculas, sin acentos y sin puntuacion).
 */
interface RiverRule {
  readonly pattern: RegExp;
  readonly id: RiverId;
  readonly name: string;
  readonly reachId: ReachId;
  readonly reachName: string;
}

export const curatedRiverRules: readonly RiverRule[] = [
  {
    pattern: /^PARANA$/,
    id: "parana",
    name: "Parana",
    reachId: "parana-general",
    reachName: "Parana",
  },
  {
    pattern: /^PARANAMED$/,
    id: "parana",
    name: "Parana",
    reachId: "parana-medio",
    reachName: "Parana medio",
  },
  {
    pattern: /^PARANAINF$/,
    id: "parana",
    name: "Parana",
    reachId: "parana-inferior",
    reachName: "Parana inferior",
  },
  {
    pattern: /^PARANASUP$/,
    id: "parana",
    name: "Parana",
    reachId: "parana-superior",
    reachName: "Parana superior",
  },
  {
    pattern: /^PARANA\s*(SUPERIOR|SUP)$/,
    id: "parana",
    name: "Parana",
    reachId: "parana-superior",
    reachName: "Parana superior",
  },
  {
    pattern: /^PARANA\s*(MEDIO)$/,
    id: "parana",
    name: "Parana",
    reachId: "parana-medio",
    reachName: "Parana medio",
  },
  {
    pattern: /^PARANA\s*(INFERIOR|INF)$/,
    id: "parana",
    name: "Parana",
    reachId: "parana-inferior",
    reachName: "Parana inferior",
  },
  {
    pattern: /^PARANA\s*DE\s*LAS\s*PALMAS$/,
    id: "parana-de-las-palmas",
    name: "Parana de las Palmas",
    reachId: "parana-de-las-palmas",
    reachName: "Parana de las Palmas",
  },
  {
    pattern: /^PARAGUAY$/,
    id: "paraguay",
    name: "Paraguay",
    reachId: "paraguay",
    reachName: "Paraguay",
  },
  {
    pattern: /^URUGUAY$/,
    id: "uruguay",
    name: "Uruguay",
    reachId: "uruguay",
    reachName: "Uruguay",
  },
  {
    pattern: /^RIO\s*DE\s*LA\s*PLATA$/,
    id: "rio-de-la-plata",
    name: "Rio de la Plata",
    reachId: "rio-de-la-plata",
    reachName: "Rio de la Plata",
  },
  {
    pattern: /^BERMEJO$/,
    id: "bermejo",
    name: "Bermejo",
    reachId: "bermejo",
    reachName: "Bermejo",
  },
  {
    pattern: /^PILCOMAYO$/,
    id: "pilcomayo",
    name: "Pilcomayo",
    reachId: "pilcomayo",
    reachName: "Pilcomayo",
  },
  {
    pattern: /^SALADO$/,
    id: "salado",
    name: "Salado",
    reachId: "salado",
    reachName: "Salado",
  },
  {
    pattern: /^SALADO\s*DEL\s*NORTE$/,
    id: "salado-del-norte",
    name: "Salado del Norte",
    reachId: "salado-del-norte",
    reachName: "Salado del Norte",
  },
  {
    pattern: /^COLORADO$/,
    id: "colorado",
    name: "Colorado",
    reachId: "colorado",
    reachName: "Colorado",
  },
  {
    pattern: /^NEGRO$/,
    id: "negro",
    name: "Negro",
    reachId: "negro",
    reachName: "Negro",
  },
  {
    pattern: /^DULCE$/,
    id: "dulce",
    name: "Dulce",
    reachId: "dulce",
    reachName: "Dulce",
  },
  {
    pattern: /^LIMAY$/,
    id: "limay",
    name: "Limay",
    reachId: "limay",
    reachName: "Limay",
  },
  {
    pattern: /^NEUQUEN$/,
    id: "neuquen",
    name: "Neuquen",
    reachId: "neuquen",
    reachName: "Neuquen",
  },
  {
    pattern: /^SANTA\s*CRUZ$/,
    id: "santa-cruz",
    name: "Santa Cruz",
    reachId: "santa-cruz",
    reachName: "Santa Cruz",
  },
  {
    pattern: /^CHUBUT$/,
    id: "chubut",
    name: "Chubut",
    reachId: "chubut",
    reachName: "Chubut",
  },
  {
    pattern: /^QUEQUEN$/,
    id: "quequen",
    name: "Quequen",
    reachId: "quequen",
    reachName: "Quequen",
  },
  {
    pattern: /^SAUCE$/,
    id: "sauce",
    name: "Sauce",
    reachId: "sauce",
    reachName: "Sauce",
  },
  {
    pattern: /^TERCERO$/,
    id: "tercero",
    name: "Tercero",
    reachId: "tercero",
    reachName: "Tercero",
  },
  {
    pattern: /^ARRECIFES$/,
    id: "arrecifes",
    name: "Arrecifes",
    reachId: "arrecifes",
    reachName: "Arrecifes",
  },
  {
    pattern: /^CORONDA$/,
    id: "coronda",
    name: "Coronda",
    reachId: "coronda",
    reachName: "Coronda",
  },
  {
    pattern: /^LUDENA$/,
    id: "ludena",
    name: "Ludena",
    reachId: "ludena",
    reachName: "Ludena",
  },
  {
    pattern: /^RIACHUELO$/,
    id: "riachuelo",
    name: "Riachuelo",
    reachId: "riachuelo",
    reachName: "Riachuelo",
  },
  {
    pattern: /^ITU$/,
    id: "itu",
    name: "Itu",
    reachId: "itu",
    reachName: "Itu",
  },
];

/**
 * Reduce un nombre de rio a una forma comparable: mayusculas, sin acentos,
 * sin puntuacion y con espacios colapsados.
 */
export function normalizeRiverKey(rawName: string): string {
  return rawName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/**
 * Convierte una clave normalizada en un identificador estable para URL y
 * comparaciones (`Parana de las Palmas` -> `parana-de-las-palmas`).
 */
export function toRiverSlug(normalizedKey: string): string {
  return normalizedKey.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Normaliza un nombre crudo de rio publicado por un organismo oficial.
 *
 * Devuelve `null` cuando el nombre esta vacio o no aporta informacion
 * utilizable (por ejemplo, cuando el organismo no informa el rio).
 */
export function normalizeRiverName(rawName: string | null | undefined): NormalizedRiver | null {
  if (!rawName) {
    return null;
  }

  const normalizedKey = normalizeRiverKey(rawName);
  if (normalizedKey.length === 0) {
    return null;
  }

  const matchedRule = curatedRiverRules.find((rule) => rule.pattern.test(normalizedKey));
  if (matchedRule) {
    return {
      id: matchedRule.id,
      name: matchedRule.name,
      reachId: matchedRule.reachId,
      reachName: matchedRule.reachName,
      isCurated: true,
    };
  }

  const slug = toRiverSlug(normalizedKey);
  return {
    id: slug,
    name: normalizedKey
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" "),
    reachId: `${slug}-general`,
    reachName: "Tramo general",
    isCurated: false,
  };
}
