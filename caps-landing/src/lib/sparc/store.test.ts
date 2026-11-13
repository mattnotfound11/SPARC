import { describe, expect, it } from "vitest";
import { cardKey, createSparcStore, normalizeNfc, normalizeStudentId, validateUser } from "./store";
import type { RegisteredUser, UserInput } from "./types";

const input = (nfcId: string): UserInput => ({
  name: "Test Driver",
  studentId: "",
  nfcId,
  role: "student",
  vehicle: "light",
  active: true,
});

const existing = (nfcId: string): RegisteredUser => ({
  id: "U-1",
  nfcId,
  name: "Other",
  role: "student",
  vehicle: "light",
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
    expect(validateUser(input("04:a1:b2:c3"), [existing("04:A1:B2:C3")]).nfcId).toMatch(/already belongs to/);
  });
});

describe("one card, one user", () => {
  it("treats the same card typed differently as the same card", () => {
    for (const [saved, typed] of [
      ["1234-5678-9012", "123456789012"],
      ["1234-5678-9012", "1234 5678 9012"],
      ["04:A1:B2:C3", "04 a1 b2 c3"],
    ])
      expect(validateUser(input(typed), [existing(saved)]).nfcId).toMatch(/already belongs to .*remove .* first/);
  });

  it("names the owner, and lets that user keep their own card when edited", () => {
    const owner = { ...existing("04:A1:B2:C3"), name: "Maria Santos" };
    expect(validateUser(input("04:A1:B2:C3"), [owner]).nfcId).toContain("Maria Santos");
    expect(validateUser(input("04:A1:B2:C3"), [owner], owner.id).nfcId).toBeUndefined();
  });

  it("refuses a second user or an edit onto a taken card, until the admin removes the owner", () => {
    const store = createSparcStore(Date.now());
    expect(store.addUser(input("1234-0000-0001"))).toEqual({ ok: true });
    expect(store.addUser({ ...input("123400000001"), name: "Second Person" }).ok).toBe(false);
    expect(store.addUser(input("04:AA:00:01"))).toEqual({ ok: true });
    const second = store.getState().users.find((u) => u.nfcId === "04:AA:00:01")!;
    expect(store.updateUser(second.id, input("1234 0000 0001")).ok).toBe(false);
    expect(store.getState().users.filter((u) => cardKey(u.nfcId) === "123400000001")).toHaveLength(1);

    const first = store.getState().users.find((u) => u.nfcId === "1234-0000-0001")!;
    expect(store.removeUser(first.id).ok).toBe(true);
    expect(store.addUser({ ...input("123400000001"), name: "New Owner" })).toEqual({ ok: true });
  });

  it("finds the card at the scanner however it was registered", () => {
    const store = createSparcStore(Date.now());
    store.addUser(input("1234-0000-0002"));
    expect(store.scan("123400000002", "entry").status).not.toBe("unregistered");
  });
});

describe("student ID", () => {
  const withSid = (studentId: string, nfcId = "04:A1:B2:C3"): UserInput => ({ ...input(nfcId), studentId });

  it("is optional", () => expect(validateUser(withSid(""), []).studentId).toBeUndefined());
  it("is normalized: trimmed, uppercased, spaces to dashes", () => expect(normalizeStudentId(" 2021 00123a ")).toBe("2021-00123A"));
  it("rejects symbols and bad lengths", () => {
    for (const bad of ["20", "2021/00123", "A".repeat(21), "-2021"]) expect(validateUser(withSid(bad), []).studentId).toBeTruthy();
  });
  it("must be unique, but a user keeps their own", () => {
    const users = [{ ...existing("04:A1:B2:C4"), studentId: "2021-00123" }];
    expect(validateUser(withSid("2021 00123"), users).studentId).toMatch(/already registered/);
    expect(validateUser(withSid("2021-00123", "04:A1:B2:C4"), users, "U-1").studentId).toBeUndefined();
  });
  it("is saved separately from the card ID, and older users without one still work", () => {
    const store = createSparcStore(Date.now());
    expect(store.addUser(withSid("2021-00777", "04:AA:BB:CC"))).toEqual({ ok: true });
    const u = store.getState().users.find((x) => x.nfcId === "04:AA:BB:CC")!;
    expect([u.studentId, u.nfcId]).toEqual(["2021-00777", "04:AA:BB:CC"]);
    const legacy = { ...existing("04:A1:B2:C5") };
    delete legacy.studentId;
    expect(validateUser(withSid("2021-00999"), [legacy]).studentId).toBeUndefined();
  });
});
