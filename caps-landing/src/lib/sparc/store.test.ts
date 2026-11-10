import { describe, expect, it } from "vitest";
import { normalizeNfc, validateUser } from "./store";
import type { RegisteredUser, UserInput } from "./types";

const input = (nfcId: string): UserInput => ({
  name: "Test Driver",
  nfcId,
  role: "student",
  vehicle: "light",
  plate: "ABC 1234",
  active: true,
});

const existing = (nfcId: string): RegisteredUser => ({
  id: "U-1",
  nfcId,
  name: "Other",
  role: "student",
  vehicle: "light",
  plate: "XYZ 9999",
  active: true,
  createdAt: 0,
  expiresAt: 1,
});

describe("normalizeNfc", () => {
  it("uppercases hex serials", () => expect(normalizeNfc("04:a1:b2:c3")).toBe("04:A1:B2:C3"));
  it("leaves digit ids alone", () => expect(normalizeNfc("1234-5678-9012")).toBe("1234-5678-9012"));
});

describe("validateUser nfcId", () => {
  it("accepts 4 and 7 byte hex serials", () => {
    expect(validateUser(input("04:A1:B2:C3"), []).nfcId).toBeUndefined();
    expect(validateUser(input("04:A1:B2:C3:D4:E5:F6"), []).nfcId).toBeUndefined();
  });
  it("accepts lowercase hex typed by hand", () => {
    expect(validateUser(input("04:a1:b2:c3"), []).nfcId).toBeUndefined();
  });
  it("rejects bad hex, colon-less hex and mixed formats", () => {
    expect(validateUser(input("04:A1:ZZ:C3"), []).nfcId).toBeDefined();
    expect(validateUser(input("04A1B2C3"), []).nfcId).toBeDefined();
    expect(validateUser(input("04-a1"), []).nfcId).toBeDefined();
  });
  it("detects duplicates case-insensitively", () => {
    expect(validateUser(input("04:a1:b2:c3"), [existing("04:A1:B2:C3")]).nfcId).toMatch(/already registered/);
  });
});
