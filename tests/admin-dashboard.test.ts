import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarLeadingDays,
  monthBounds,
  operationalOrderMetrics,
  shiftIsoDate,
  shiftMonth,
} from "../lib/admin-dashboard";
import type { Order } from "../lib/types";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  customer_id: null,
  public_code: "YMP-2026-0001",
  source: "web" as const,
  customer_user_id: null,
  customer_name: "Cliente",
  customer_phone: "999999999",
  details: "",
  delivery_method: "recojo" as const,
  delivery_address: "",
  delivery_date: "2026-10-01",
  occasion: "",
  gift_note: "",
  notes: "",
  cake_guests: null,
  cake_flavor: "",
  cake_design: "",
  total_cents: 10000,
  deposit_cents: 2000,
  quote_required: false,
  status: "Nuevo" as const,
  created_at: "2026-09-30T12:00:00Z",
};

function order(patch: Partial<Order>): Order {
  return { ...base, ...patch };
}

test("dashboard excludes quotations from financial totals", () => {
  const metrics = operationalOrderMetrics(
    [
      order({ status: "Nuevo", delivery_date: "2026-09-30" }),
      order({
        id: "22222222-2222-4222-8222-222222222222",
        quote_required: true,
        total_cents: 99999,
        delivery_date: "2026-10-01",
      }),
      order({
        id: "33333333-3333-4333-8333-333333333333",
        status: "Entregado",
        total_cents: 5000,
        deposit_cents: 5000,
      }),
      order({
        id: "55555555-5555-4555-8555-555555555555",
        status: "Confirmado",
        total_cents: 12000,
        deposit_cents: 2000,
      }),
      order({
        id: "44444444-4444-4444-8444-444444444444",
        status: "Cancelado",
        total_cents: 7000,
        deposit_cents: 0,
      }),
    ],
    "2026-09-30",
  );

  assert.equal(metrics.attention, 2);
  assert.equal(metrics.today, 1);
  assert.equal(metrics.tomorrow, 2);
  assert.equal(metrics.production, 1);
  assert.equal(metrics.quotes, 1);
  assert.equal(metrics.confirmedAmount, 17000);
  assert.equal(metrics.outstanding, 10000);
});

test("calendar helpers use stable ISO dates and Monday-first grids", () => {
  assert.equal(shiftIsoDate("2026-09-30", 1), "2026-10-01");
  assert.deepEqual(monthBounds("2026-10"), {
    start: "2026-10-01",
    end: "2026-10-31",
    year: 2026,
    monthNumber: 10,
    lastDay: 31,
  });
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(calendarLeadingDays("2026-10"), 3);
  assert.throws(() => monthBounds("2026-13"));
});
