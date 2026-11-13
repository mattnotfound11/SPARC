import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createPublisher, toAvailability, watchAvailability } from "./shared";

function fakeClient(row: unknown = null) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  let handler: (p: { new: unknown }) => void = () => {};
  const channel = {
    on: vi.fn((_t: string, _f: unknown, cb: typeof handler) => ((handler = cb), channel)),
    subscribe: vi.fn(() => channel),
  };
  const client = {
    from: vi.fn(() => ({ upsert, select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: row }) }) }) })),
    channel: vi.fn(() => channel),
    removeChannel: vi.fn(),
  };
  return { client: client as unknown as SupabaseClient, upsert, push: (r: unknown) => handler({ new: r }), raw: client };
}

describe("shared availability", () => {
  it("publishes the count and skips repeats", async () => {
    const f = fakeClient();
    const publish = createPublisher(() => Promise.resolve(f.client));
    await publish({ free: 109, total: 110 });
    await publish({ free: 109, total: 110 });
    await publish({ free: 110, total: 110 });
    expect(f.upsert.mock.calls.map((c) => [c[0].free, c[0].total])).toEqual([[109, 110], [110, 110]]);
  });

  it("does nothing without a configured backend", async () => {
    await expect(createPublisher(() => Promise.resolve(null))({ free: 1, total: 2 })).resolves.toBeUndefined();
  });

  it("delivers the current row, then pushed changes, and stops on unsubscribe", async () => {
    const f = fakeClient({ free: 110, total: 110 });
    const seen: unknown[] = [];
    const stop = watchAvailability((a) => seen.push(a), () => Promise.resolve(f.client));
    await vi.waitFor(() => expect(seen).toEqual([{ free: 110, total: 110 }]));
    f.push({ free: 109, total: 110, id: "main" });
    f.push({ nonsense: true });
    expect(seen).toEqual([{ free: 110, total: 110 }, { free: 109, total: 110 }]);
    stop();
    expect(f.raw.removeChannel).toHaveBeenCalled();
  });

  it("rejects malformed rows", () => {
    expect(toAvailability(null)).toBeNull();
    expect(toAvailability({ free: "1", total: 2 })).toBeNull();
  });
});
