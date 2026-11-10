import { expect, it } from "vitest";
import { normalizeSerial } from "./serial";

it("uppercases and colon-separates hex serials", () => {
  expect(normalizeSerial("04a1b2c3")).toBe("04:A1:B2:C3");
  expect(normalizeSerial("04:a1:b2:c3")).toBe("04:A1:B2:C3");
  expect(normalizeSerial("04-a1-b2-c3")).toBe("04:A1:B2:C3");
});
