import { describe, expect, it } from "vitest";
import {
  dischargeVariableId,
  precipitationVariableId,
  waterLevelVariableId,
} from "@/domain/telemetry/types";

describe("identificadores de variable del INA", () => {
  it("coinciden con los codigos publicados por el organismo", () => {
    expect(waterLevelVariableId).toBe(2);
    expect(dischargeVariableId).toBe(4);
    expect(precipitationVariableId).toBe(1);
  });
});
