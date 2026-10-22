import { describe, expect, it } from "vitest";
import {
  isRecord,
  readArray,
  readArrayItem,
  toFiniteNumber,
  toNonEmptyText,
} from "@/infrastructure/parsing/jsonValues";

describe("isRecord", () => {
  it("acepta objetos y rechaza arreglos, nulos y primitivos", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("texto")).toBe(false);
    expect(isRecord(3)).toBe(false);
  });
});

describe("toFiniteNumber", () => {
  it("acepta numeros finitos", () => {
    expect(toFiniteNumber(4.2)).toBe(4.2);
    expect(toFiniteNumber(0)).toBe(0);
  });

  it("rechaza numeros no finitos", () => {
    expect(toFiniteNumber(Number.NaN)).toBeNull();
    expect(toFiniteNumber(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("interpreta cadenas numericas y descarta el resto", () => {
    expect(toFiniteNumber(" 5.25 ")).toBe(5.25);
    expect(toFiniteNumber("")).toBeNull();
    expect(toFiniteNumber("   ")).toBeNull();
    expect(toFiniteNumber("no es un numero")).toBeNull();
  });

  it("rechaza valores que no son numeros ni cadenas", () => {
    expect(toFiniteNumber(null)).toBeNull();
    expect(toFiniteNumber(undefined)).toBeNull();
    expect(toFiniteNumber(true)).toBeNull();
    expect(toFiniteNumber({})).toBeNull();
  });
});

describe("toNonEmptyText", () => {
  it("recorta y devuelve el texto utilizable", () => {
    expect(toNonEmptyText("  Rosario  ")).toBe("Rosario");
  });

  it("rechaza textos vacios y valores que no son cadenas", () => {
    expect(toNonEmptyText("")).toBeNull();
    expect(toNonEmptyText("   ")).toBeNull();
    expect(toNonEmptyText(null)).toBeNull();
    expect(toNonEmptyText(34)).toBeNull();
  });
});

describe("readArrayItem", () => {
  it("lee la posicion pedida y devuelve null cuando el campo no es un arreglo", () => {
    expect(readArrayItem(["a", "b"], 1)).toBe("b");
    expect(readArrayItem(["a"], 5)).toBeUndefined();
    expect(readArrayItem("no es arreglo", 0)).toBeNull();
    expect(readArrayItem(null, 0)).toBeNull();
  });
});

describe("readArray", () => {
  it("devuelve el arreglo o uno vacio", () => {
    const values = [1, 2, 3];

    expect(readArray(values)).toBe(values);
    expect(readArray("no es arreglo")).toEqual([]);
    expect(readArray(null)).toEqual([]);
  });
});
