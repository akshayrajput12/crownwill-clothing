import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Order emails via ZeptoMail (Zoho's transactional mail service).
 *
 * Why this runs here and not in the browser: the ZeptoMail send token is a bearer
 * credential with permission to send mail as your domain. Anything shipped to the
 * browser is public, so a client-side call would hand that token to every visitor.
 * ZeptoMail also does not send CORS headers, so the request would be blocked anyway.
 * This function is the smallest possible server — no host to run, deployed with
 * `supabase functions deploy`.
 *
 * Security model:
 *  - The recipient is ALWAYS read from the order row, never from the request body, so
 *    this cannot be used to mail arbitrary addresses.
 *  - `confirmation` is callable without a login (guests check out) but only within
 *    CONFIRMATION_WINDOW_MINUTES of the order being created, so an old order number
 *    cannot be replayed to spam that customer.
 *  - `invoice` and `status` require a signed-in caller who either owns the order or
 *    is an admin.
 *
 * Secrets (supabase secrets set):
 *  ZEPTOMAIL_TOKEN      Send Mail token from ZeptoMail → Mail Agents → SMTP/API
 *  ZEPTOMAIL_FROM       verified sender, e.g. orders@yourdomain.com
 *  ZEPTOMAIL_FROM_NAME  optional display name, defaults to the store name
 *  ZEPTOMAIL_HOST       optional, api.zeptomail.in (default) or api.zeptomail.com
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONFIRMATION_WINDOW_MINUTES = 60;

type EmailType = "confirmation" | "invoice" | "status";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/* ------------------------------------------------------------------ helpers ---- */

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (amount: unknown, symbol = "₹") => {
  const value = Number(amount ?? 0);
  return `${symbol}${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
};

interface OrderItem {
  name?: string;
  price?: number;
  quantity?: number;
  size?: string | null;
  weight?: string | null;
}

const STATUS_COPY: Record<string, { subject: string; heading: string; body: string }> = {
  placed: {
    subject: "We have your order",
    heading: "Order received",
    body: "Thanks for shopping with us. We are getting your pieces ready.",
  },
  confirmed: {
    subject: "Your order is confirmed",
    heading: "Order confirmed",
    body: "Payment received. Your order is now being prepared for dispatch.",
  },
  processing: {
    subject: "Your order is being packed",
    heading: "Being packed",
    body: "Our team is packing your order. You will get tracking details once it ships.",
  },
  shipped: {
    subject: "Your order has shipped",
    heading: "On its way",
    body: "Your order has left our warehouse and is on its way to you.",
  },
  delivered: {
    subject: "Your order has been delivered",
    heading: "Delivered",
    body: "Your order has been delivered. We would love to hear how it fits.",
  },
  cancelled: {
    subject: "Your order has been cancelled",
    heading: "Order cancelled",
    body: "This order has been cancelled. Any payment made will be refunded to the original method.",
  },
};

/** One email shell so confirmation, invoice and status mails all look like the same store. */
function renderEmail(options: {
  storeName: string;
  heading: string;
  intro: string;
  order: Record<string, any>;
  items: OrderItem[];
  currency: string;
  showItems: boolean;
  footerNote?: string;
}) {
  const { storeName, heading, intro, order, items, currency, showItems, footerNote } = options;
  const address = order.address_details ?? {};
  const customer = order.customer_info ?? {};

  const itemRows = items
    .map((item) => {
      const variant = [item.size ? `Size ${item.size}` : null, item.weight || null]
        .filter(Boolean)
        .join(" · ");
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eeeeee;">
            <div style="font-size:14px;color:#111111;">${escapeHtml(item.name)}</div>
            ${variant ? `<div style="font-size:12px;color:#777777;margin-top:2px;">${escapeHtml(variant)}</div>` : ""}
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eeeeee;text-align:center;font-size:14px;color:#555555;">
            ${escapeHtml(item.quantity ?? 1)}
          </td>
          <td style="padding:12px 0;border-bottom:1px solid #eeeeee;text-align:right;font-size:14px;color:#111111;">
            ${money(Number(item.price ?? 0) * Number(item.quantity ?? 1), currency)}
          </td>
        </tr>`;
    })
    .join("");

  const summaryRow = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:4px 0;font-size:${strong ? "15px" : "13px"};color:${strong ? "#111111" : "#666666"};${strong ? "font-weight:600;padding-top:12px;border-top:1px solid #eeeeee;" : ""}">${escapeHtml(label)}</td>
      <td style="padding:4px 0;text-align:right;font-size:${strong ? "15px" : "13px"};color:#111111;${strong ? "font-weight:600;padding-top:12px;border-top:1px solid #eeeeee;" : ""}">${value}</td>
    </tr>`;

  const completeAddress = address.complete_address
    ?? [address.plotNumber, address.buildingName, address.street, address.city, address.state, address.pincode]
      .filter(Boolean)
      .join(", ");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f6f6f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #eceae5;">

        <tr><td style="background:#111111;padding:28px 32px;">
          <div style="font-size:20px;letter-spacing:0.18em;text-transform:uppercase;color:#ffffff;">${escapeHtml(storeName)}</div>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#111111;">${escapeHtml(heading)}</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#555555;">${escapeHtml(intro)}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf9f7;padding:16px;margin-bottom:24px;">
            <tr><td style="font-size:12px;color:#777777;text-transform:uppercase;letter-spacing:0.12em;">Order number</td></tr>
            <tr><td style="font-size:16px;color:#111111;font-weight:600;padding-top:4px;">${escapeHtml(order.order_number)}</td></tr>
            <tr><td style="font-size:12px;color:#777777;padding-top:10px;">
              Placed ${escapeHtml(new Date(order.created_at ?? Date.now()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }))}
              &nbsp;·&nbsp; ${escapeHtml(String(order.payment_method ?? "").toUpperCase())}
              &nbsp;·&nbsp; ${escapeHtml(order.payment_status === "paid" ? "Paid" : "Payment pending")}
            </td></tr>
          </table>

          ${showItems ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
            <tr>
              <th align="left" style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999999;padding-bottom:8px;border-bottom:1px solid #eeeeee;">Item</th>
              <th align="center" style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999999;padding-bottom:8px;border-bottom:1px solid #eeeeee;">Qty</th>
              <th align="right" style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999999;padding-bottom:8px;border-bottom:1px solid #eeeeee;">Total</th>
            </tr>
            ${itemRows}
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            ${summaryRow("Subtotal", money(order.subtotal, currency))}
            ${Number(order.tax ?? 0) > 0 ? summaryRow("Tax", money(order.tax, currency)) : ""}
            ${summaryRow("Delivery", Number(order.delivery_fee ?? 0) === 0 ? "Free" : money(order.delivery_fee, currency))}
            ${Number(order.cod_fee ?? 0) > 0 ? summaryRow("Cash on delivery fee", money(order.cod_fee, currency)) : ""}
            ${Number(order.discount ?? 0) > 0 ? summaryRow(`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`, `- ${money(order.discount, currency)}`) : ""}
            ${summaryRow("Total", money(order.total, currency), true)}
          </table>
          ` : ""}

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eeeeee;padding-top:16px;">
            <tr><td style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#999999;padding-top:16px;">Delivering to</td></tr>
            <tr><td style="font-size:14px;color:#111111;padding-top:6px;">${escapeHtml(customer.name)}</td></tr>
            <tr><td style="font-size:13px;color:#666666;line-height:1.6;padding-top:2px;">${escapeHtml(completeAddress)}</td></tr>
            ${customer.phone ? `<tr><td style="font-size:13px;color:#666666;padding-top:2px;">${escapeHtml(customer.phone)}</td></tr>` : ""}
            ${order.estimated_delivery_time ? `<tr><td style="font-size:13px;color:#666666;padding-top:8px;">Estimated delivery: ${escapeHtml(order.estimated_delivery_time)}</td></tr>` : ""}
          </table>
        </td></tr>

        <tr><td style="background:#faf9f7;padding:20px 32px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#888888;">
            ${escapeHtml(footerNote ?? `Questions about this order? Reply to this email and we will help.`)}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

/* --------------------------------------------------------------------- main ---- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("ZEPTOMAIL_TOKEN");
    const from = Deno.env.get("ZEPTOMAIL_FROM");
    if (!token || !from) {
      return json(
        { error: "Email is not configured. Set ZEPTOMAIL_TOKEN and ZEPTOMAIL_FROM." },
        500
      );
    }

    const { orderNumber, type = "confirmation" } = (await req.json()) as {
      orderNumber?: string;
      type?: EmailType;
    };

    if (!orderNumber) return json({ error: "orderNumber is required" }, 400);
    if (!["confirmation", "invoice", "status"].includes(type)) {
      return json({ error: `Unknown email type: ${type}` }, 400);
    }

    // Service role: this function has to read any order, including guest orders that no
    // logged-in user owns.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("*")
      .eq("order_number", orderNumber)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return json({ error: "Order not found" }, 404);

    /* Authorisation. */
    if (type === "confirmation") {
      const ageMinutes = (Date.now() - new Date(order.created_at ?? 0).getTime()) / 60000;
      if (ageMinutes > CONFIRMATION_WINDOW_MINUTES) {
        return json({ error: "This order is too old to send a confirmation for." }, 403);
      }
    } else {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      if (!jwt) return json({ error: "Sign in required" }, 401);

      const { data: userData } = await admin.auth.getUser(jwt);
      const user = userData?.user;
      if (!user) return json({ error: "Sign in required" }, 401);

      const { data: profile } = await admin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      const owns = order.user_id && order.user_id === user.id;
      if (!owns && !profile?.is_admin) {
        return json({ error: "Not allowed to email this order" }, 403);
      }
    }

    /* Recipient always comes from the order, never from the caller. */
    const customer = (order.customer_info ?? {}) as { name?: string; email?: string };
    const to = customer.email;
    if (!to) return json({ error: "This order has no customer email on it." }, 422);

    /* Store details for the template. */
    const { data: settingsRows } = await admin
      .from("settings")
      .select("key,value")
      .in("key", ["store_name", "currency_symbol", "store_email"]);

    const settings = Object.fromEntries(
      (settingsRows ?? []).map((row: { key: string; value: unknown }) => {
        const raw = typeof row.value === "string" ? row.value.replace(/^"|"$/g, "") : row.value;
        return [row.key, raw];
      })
    ) as Record<string, string>;

    const storeName = settings.store_name || "Crownveil";
    const currency = settings.currency_symbol || "₹";
    const items = Array.isArray(order.items) ? (order.items as OrderItem[]) : [];

    const status = String(order.order_status ?? "placed").toLowerCase();
    const statusCopy = STATUS_COPY[status] ?? STATUS_COPY.placed;

    const content = type === "invoice"
      ? {
          subject: `Invoice for order ${order.order_number}`,
          heading: "Your invoice",
          intro: `Here is the invoice for order ${order.order_number}.`,
        }
      : type === "status"
        ? {
            subject: `${statusCopy.subject} — ${order.order_number}`,
            heading: statusCopy.heading,
            intro: statusCopy.body,
          }
        : {
            subject: `Order ${order.order_number} confirmed`,
            heading: `Thanks${customer.name ? `, ${customer.name.split(" ")[0]}` : ""}!`,
            intro: "We have received your order. Here is everything you ordered.",
          };

    const html = renderEmail({
      storeName,
      heading: content.heading,
      intro: content.intro,
      order,
      items,
      currency,
      // A status nudge does not need the whole bill repeated; confirmations and invoices do.
      showItems: type !== "status",
      footerNote: settings.store_email
        ? `Questions about this order? Write to ${settings.store_email}.`
        : undefined,
    });

    /* Send. ZeptoMail's India data centre is api.zeptomail.in; global is .com. */
    const host = Deno.env.get("ZEPTOMAIL_HOST") || "api.zeptomail.in";
    const response = await fetch(`https://${host}/v1.1/email`, {
      method: "POST",
      headers: {
        // Note: the scheme really is "Zoho-enczapikey", not "Bearer".
        Authorization: `Zoho-enczapikey ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        from: { address: from, name: Deno.env.get("ZEPTOMAIL_FROM_NAME") || storeName },
        to: [{ email_address: { address: to, name: customer.name || to } }],
        subject: content.subject,
        htmlbody: html,
      }),
    });

    const result = await response.text();
    if (!response.ok) {
      console.error("ZeptoMail rejected the send:", response.status, result);
      return json({ error: "Email provider rejected the message", detail: result }, 502);
    }

    return json({ sent: true, to, type });
  } catch (error) {
    console.error("send-order-email failed:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
