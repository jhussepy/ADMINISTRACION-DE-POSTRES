import test from "node:test";
import assert from "node:assert/strict";
import {
  customerWhatsappNumber,
  nextOrderStatus,
  orderStatusWhatsappMessage,
} from "../lib/order-progress";

test("quick progress follows the production flow and stops at terminal states", () => {
  assert.equal(nextOrderStatus("Nuevo"), "Por confirmar");
  assert.equal(nextOrderStatus("Por confirmar"), "Confirmado");
  assert.equal(nextOrderStatus("Confirmado"), "En preparación");
  assert.equal(nextOrderStatus("En preparación"), "Listo");
  assert.equal(nextOrderStatus("Listo"), "Entregado");
  assert.equal(nextOrderStatus("Entregado"), null);
  assert.equal(nextOrderStatus("Cancelado"), null);
});

test("customer notification distinguishes order confirmation from payment and includes the private link", () => {
  const message = orderStatusWhatsappMessage(
    "YMP-2026-0002",
    "Confirmado",
    "https://yemape.example/seguimiento/private-token",
  );
  assert.match(message, /Pedido confirmado/);
  assert.match(message, /YMP-2026-0002/);
  assert.match(
    message,
    /https:\/\/yemape\.example\/seguimiento\/private-token/,
  );
  assert.doesNotMatch(message, /pago confirmado/i);
  assert.match(
    orderStatusWhatsappMessage("YMP-2026-0002", "Listo"),
    /Coordina la entrega/,
  );
  assert.equal(customerWhatsappNumber("934 219 749"), "51934219749");
  assert.equal(customerWhatsappNumber("no disponible"), null);
});
