import { createServer } from "node:http";
import { createHash } from "node:crypto";

// A stand-in for Midtrans Snap and the status API, for local tests only.
// The app runs with MIDTRANS_SNAP_URL and MIDTRANS_API_URL pointing here.
// /pay/<order> is the "payment page"; /pay/<order>/settlement or /expire
// sets the result, sends the signed notification and returns to the site.
export function startMockMidtrans({ port, serverKey, appUrl }) {
  const orders = new Map();
  const auth = "Basic " + Buffer.from(serverKey + ":").toString("base64");
  const status = (order) => {
    const code =
      order.status === "settlement"
        ? "200"
        : order.status === "pending"
          ? "201"
          : "407";
    const gross = order.gross ?? `${order.amount}.00`;
    return {
      order_id: order.id,
      status_code: code,
      gross_amount: gross,
      transaction_status: order.status,
      fraud_status: "accept",
      payment_type: "bank_transfer",
      transaction_id: "mock-" + order.id,
      signature_key: createHash("sha512")
        .update(order.id + code + gross + serverKey)
        .digest("hex"),
    };
  };
  const notify = (id, overrides = {}) =>
    fetch(appUrl + "/api/payments/midtrans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...status(orders.get(id)), ...overrides }),
    });
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://mock");
    const send = (code, body, type = "application/json") => {
      res.writeHead(code, { "Content-Type": type });
      res.end(type === "application/json" ? JSON.stringify(body) : body);
    };
    if (req.method === "POST" && url.pathname === "/snap/v1/transactions") {
      if (req.headers.authorization !== auth)
        return send(401, { error_messages: ["bad key"] });
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      const id = body.transaction_details.order_id;
      orders.set(id, {
        id,
        amount: body.transaction_details.gross_amount,
        finish: body.callbacks?.finish,
        items: body.item_details,
        customer: body.customer_details,
        status: null,
      });
      return send(201, {
        token: "mock-token-" + id,
        redirect_url: `http://127.0.0.1:${port}/pay/${id}`,
      });
    }
    const pay = url.pathname.match(/^\/pay\/([\w.~-]+)(?:\/(\w+))?$/);
    if (pay && orders.has(pay[1])) {
      const order = orders.get(pay[1]);
      if (!pay[2])
        return send(
          200,
          `<!doctype html><title>Mock Midtrans</title><h1>Mock Midtrans</h1><p>${order.id} · ${order.amount}</p><a id="settle" href="/pay/${order.id}/settlement">Pay</a> <a id="expire" href="/pay/${order.id}/expire">Let it expire</a> <a id="back" href="${order.finish}&order_id=${order.id}">Back without paying</a>`,
          "text/html",
        );
      order.status = pay[2];
      await notify(order.id);
      res.writeHead(302, {
        Location: `${order.finish}&order_id=${order.id}&status_code=${status(order).status_code}&transaction_status=${order.status}`,
      });
      return res.end();
    }
    const check = url.pathname.match(/^\/v2\/([\w.~-]+)\/status$/);
    if (check) {
      if (req.headers.authorization !== auth) return send(401, {});
      const order = orders.get(check[1]);
      if (!order?.status)
        return send(404, {
          status_code: "404",
          status_message: "Transaction doesn't exist.",
        });
      return send(200, status(order));
    }
    send(404, { error: "not found" });
  });
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () =>
      resolve({ server, orders, notify, status }),
    ),
  );
}
