import { describe, expect, it } from "vitest";
import { validateCardFormat } from "./card";

describe("validateCardFormat", () => {
  it("accepts the printed number and the NFC serial, however they were typed", () => {
    expect(validateCardFormat("1234-5678-9012")).toBeUndefined();
    expect(validateCardFormat("123456789012")).toBeUndefined();
    expect(validateCardFormat("04:A1:B2:C3")).toBeUndefined();
    expect(validateCardFormat("04 a1 b2 c3")).toBeUndefined();
  });
  it("rejects blank, too short and non-card text", () => {
    expect(validateCardFormat("")).toBeTruthy();
    expect(validateCardFormat("   ")).toBeTruthy();
    expect(validateCardFormat("12")).toBeTruthy();
    expect(validateCardFormat("hello")).toBeTruthy();
    expect(validateCardFormat("04:A1:ZZ:C3")).toBeTruthy();
  });
});
