import { describe, expect, it } from "vitest";
import { decodeBase64Url, encodeBase64Url } from "@/worker/base64";

describe("base64url", () => {
  it("codifica y decodifica bytes", () => {
    const bytes = Uint8Array.from([4, 65, 66, 67, 255]);
    const encoded = encodeBase64Url(bytes);

    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");

    const decoded = decodeBase64Url(encoded);
    expect(Array.from(decoded ?? [])).toEqual(Array.from(bytes));
  });

  it("rehúsa valores vacíos e inválidos", () => {
    expect(decodeBase64Url("")).toBeNull();
    expect(decodeBase64Url("abc!")).toBeNull();
    expect(decodeBase64Url("===")).toBeNull();
  });

  it("maneja padding incompleto y datos corruptos", () => {
    expect(decodeBase64Url("YQ")).not.toBeNull();
    expect(decodeBase64Url("YWI")).not.toBeNull();
    expect(decodeBase64Url("YWI=")).not.toBeNull();
    expect(decodeBase64Url("$$$")).toBeNull();
  });
});
