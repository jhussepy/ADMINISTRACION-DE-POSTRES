import test from "node:test";
import assert from "node:assert/strict";
import {
  customerOrderStats,
  normalizeCustomerPhone,
  safeCrmSearch,
} from "../lib/crm";
import type { CustomerOrderSummary } from "../lib/types";

const base: CustomerOrderSummary = {
  id: "11111111-1111-4111-8111-111111111111",
  public_code: "YMP-2026-0001",
  status: "Nuevo",
  delivery_method: "recojo",
  delivery_address: "",
  delivery_date: "2026-10-03",
  quote_required: true,
  created_at: "2026-10-01T10:00:00Z",
};

test("customer phone normalization groups Peruvian local and +51 formats", () => {
  assert.equal(normalizeCustomerPhone("970 769 587"), "970769587");
  assert.equal(normalizeCustomerPhone("+51 970 769 587"), "970769587");
  assert.equal(normalizeCustomerPhone("0051 970 769 587"), "970769587");
  assert.equal(normalizeCustomerPhone("+34 612 345 678"), "34612345678");
});

test("customer stats separate active, delivered and quotations without money", () => {
  const orders: CustomerOrderSummary[] = [
    base,
    {
      ...base,
      id: "22222222-2222-4222-8222-222222222222",
      public_code: "YMP-2026-0002",
      status: "Entregado",
      quote_required: false,
      delivery_method: "delivery",
      created_at: "2026-09-20T10:00:00Z",
    },
    {
      ...base,
      id: "33333333-3333-4333-8333-333333333333",
      public_code: "YMP-2026-0003",
      status: "Confirmado",
      quote_required: false,
      delivery_method: "delivery",
      created_at: "2026-10-02T10:00:00Z",
    },
  ];

  const stats = customerOrderStats(orders);
  assert.equal(stats.total, 3);
  assert.equal(stats.active, 2);
  assert.equal(stats.delivered, 1);
  assert.equal(stats.quotePending, 1);
  assert.equal(stats.preferredDelivery, "delivery");
  assert.equal(stats.lastOrder?.public_code, "YMP-2026-0003");
});

test("CRM search strips PostgREST separator characters", () => {
  assert.equal(safeCrmSearch(" Juan,(970)  "), "Juan 970");
  assert.equal(safeCrmSearch("x".repeat(100)).length, 80);
});
