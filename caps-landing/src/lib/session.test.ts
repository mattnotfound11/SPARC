import { afterEach, describe, expect, it, vi } from "vitest";

async function loginRequiredWith(value: string | undefined) {
  vi.resetModules();
  if (value === undefined) vi.stubEnv("NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN", "");
  else vi.stubEnv("NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN", value);
  if (value === undefined) delete process.env.NEXT_PUBLIC_REQUIRE_ADMIN_LOGIN;
  return (await import("./session")).loginRequired;
}

afterEach(() => vi.unstubAllEnvs());

describe("loginRequired", { timeout: 30000 }, () => {
  it("is on when nothing is set, so signing out really signs you out", async () => {
    expect(await loginRequiredWith(undefined)).toBe(true);
  });
  it("is on when set to true", async () => {
    expect(await loginRequiredWith("true")).toBe(true);
  });
  it("is on for an empty value", async () => {
    expect(await loginRequiredWith("")).toBe(true);
  });
  it("can still be switched off on purpose with false", async () => {
    expect(await loginRequiredWith("false")).toBe(false);
  });
});

describe("canAccess", () => {
  it("lets administrators open every page", async () => {
    vi.resetModules();
    const { canAccess } = await import("./session");
    for (const p of ["/admin", "/admin/users", "/admin/reports", "/admin/analytics", "/admin/pass"]) expect(canAccess("admin", p)).toBe(true);
  });

  it("keeps facilitators on the gate pages, off users, reports and analytics", async () => {
    vi.resetModules();
    const { canAccess } = await import("./session");
    for (const p of ["/admin", "/admin/scan", "/admin/pass", "/admin/logs"]) expect(canAccess("facilitator", p)).toBe(true);
    for (const p of ["/admin/users", "/admin/reports", "/admin/analytics", "/admin/appeals", "/admin/suggestions", "/admin/semesters"]) expect(canAccess("facilitator", p)).toBe(false);
  });
});

describe("isStaffRole", () => {
  it("accepts only the two staff roles, so a stored member never opens the console", async () => {
    vi.resetModules();
    const { isStaffRole } = await import("./mockSession");
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("facilitator")).toBe(true);
    expect(isStaffRole("member")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});
