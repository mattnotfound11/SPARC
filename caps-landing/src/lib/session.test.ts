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
