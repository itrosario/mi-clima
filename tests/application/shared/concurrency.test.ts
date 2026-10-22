import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "@/application/shared/concurrency";

async function double(value: number): Promise<number> {
  return value * 2;
}

describe("mapWithConcurrency", () => {
  it("conserva el orden de entrada", async () => {
    const results = await mapWithConcurrency([1, 2, 3, 4], 2, double);

    expect(results).toEqual([2, 4, 6, 8]);
  });

  it("procesa en serie cuando el limite es uno", async () => {
    const inFlight: number[] = [];

    const results = await mapWithConcurrency([1, 2, 3], 1, async (value, index) => {
      inFlight.push(index);
      await Promise.resolve();

      return value + index;
    });

    expect(results).toEqual([1, 3, 5]);
    expect(inFlight).toEqual([0, 1, 2]);
  });

  it("normaliza un limite no positivo a un trabajador", async () => {
    await expect(mapWithConcurrency([1, 2], 0, double)).resolves.toEqual([2, 4]);
  });

  it("tolera mas trabajadores que elementos", async () => {
    await expect(mapWithConcurrency([5], 10, double)).resolves.toEqual([10]);
  });

  it("devuelve una lista vacia sin invocar al mapeo", async () => {
    let calls = 0;

    const results = await mapWithConcurrency([], 3, async (value: number) => {
      calls += 1;

      return value;
    });

    expect(results).toEqual([]);
    expect(calls).toBe(0);
  });

  it("propaga el primer error", async () => {
    const failure = new Error("sin datos");

    await expect(
      mapWithConcurrency([1, 2], 2, async (value) => {
        if (value === 2) {
          throw failure;
        }

        return value;
      }),
    ).rejects.toBe(failure);
  });
});
