import { createServer } from "node:http";

// A stand-in for the PayPal Orders API, for local tests only. The app runs
// with PAYPAL_API_URL pointing here. /approve/<id> is the "PayPal page":
// its Pay link approves the order and returns to the website's return
// address, Cancel goes to the cancel address.
export function startMockPaypal({ port, clientId, secret }) {
  const orders = new Map();
  const basic =
    "Basic " + Buffer.from(clientId + ":" + secret).toString("base64");
  let count = 0;
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://mock");
    const send = (code, body, type = "application/json") => {
      res.writeHead(code, { "Content-Type": type });
      res.end(type === "application/json" ? JSON.stringify(body) : body);
    };
    let raw = "";
    for await (const chunk of req) raw += chunk;
    if (req.method === "POST" && url.pathname === "/v1/oauth2/token") {
      if (req.headers.authorization !== basic)
        return send(401, {
          error: "invalid_client",
          error_description: "Client Authentication failed",
        });
      return send(200, { access_token: "mock-token", expires_in: 32400 });
    }
    // The guest's PayPal page, opened in the browser.
    const page = url.pathname.match(/^\/approve\/(\w+)(?:\/(pay|cancel))?$/);
    if (page && orders.has(page[1])) {
      const order = orders.get(page[1]);
      if (!page[2])
        return send(
          200,
          `<!doctype html><title>Mock PayPal</title><h1>Mock PayPal</h1><p id="amount">${order.amount.currency_code} ${order.amount.value}</p><a id="pay" href="/approve/${order.id}/pay">Pay Now</a> <a id="cancel" href="/approve/${order.id}/cancel">Cancel and return</a>`,
          "text/html",
        );
      if (page[2] === "pay") order.status = "APPROVED";
      res.writeHead(302, {
        Location:
          (page[2] === "pay" ? order.returnUrl : order.cancelUrl) +
          `&token=${order.id}`,
      });
      return res.end();
    }
    if (req.headers.authorization !== "Bearer mock-token")
      return send(401, { message: "Authentication failed" });
    if (req.method === "POST" && url.pathname === "/v2/checkout/orders") {
      const body = JSON.parse(raw);
      const unit = body.purchase_units[0];
      const id = "MOCKPP" + ++count;
      const context = body.payment_source.paypal.experience_context;
      orders.set(id, {
        id,
        status: "PAYER_ACTION_REQUIRED",
        customId: unit.custom_id,
        amount: unit.amount,
        description: unit.description,
        returnUrl: context.return_url,
        cancelUrl: context.cancel_url,
      });
      return send(200, {
        id,
        status: "PAYER_ACTION_REQUIRED",
        links: [
          {
            rel: "payer-action",
            href: `http://127.0.0.1:${port}/approve/${id}`,
          },
        ],
      });
    }
    const capture = url.pathname.match(
      /^\/v2\/checkout\/orders\/(\w+)(\/capture)?$/,
    );
    if (capture && orders.has(capture[1])) {
      const order = orders.get(capture[1]);
      const answer = () => ({
        id: order.id,
        status: order.status,
        purchase_units: [
          {
            custom_id: order.customId,
            payments:
              order.status === "COMPLETED"
                ? {
                    captures: [
                      {
                        id: "CAP-" + order.id,
                        status: "COMPLETED",
                        amount: order.amount,
                      },
                    ],
                  }
                : undefined,
          },
        ],
      });
      if (!capture[2]) return send(200, answer());
      if (order.status === "COMPLETED")
        return send(422, {
          details: [{ issue: "ORDER_ALREADY_CAPTURED" }],
          message: "Order already captured",
        });
      if (order.status !== "APPROVED")
        return send(422, {
          details: [
            {
              issue: "ORDER_NOT_APPROVED",
              description: "Payer has not yet approved the Order",
            },
          ],
        });
      order.status = "COMPLETED";
      mock.captures++;
      return send(201, answer());
    }
    send(404, { message: "not found" });
  });
  const mock = { server, orders, captures: 0 };
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve(mock)),
  );
}
