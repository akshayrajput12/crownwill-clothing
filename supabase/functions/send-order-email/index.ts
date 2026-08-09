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

/* ------------------------------------------------------------------ template ---- */

const GOLD = "#C9A227";
const INK = "#171310";
const PAPER = "#FAF8F4";
const LINE = "#EAE4DA";
const MUTED = "#8A8079";

/** Absolute base for images and links — relative paths do nothing inside an inbox. */
const siteUrl = (Deno.env.get("STORE_SITE_URL") || "https://crownveil.com").replace(/\/$/, "");

const STATUS_STEPS = ["placed", "confirmed", "processing", "shipped", "delivered"];
const STEP_LABELS: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  processing: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
};

/**
 * Progress rail for status emails. Tables and background colours only — inboxes do not
 * run flexbox, and Outlook ignores most of CSS besides.
 */
function renderTimeline(status: string): string {
  const current = STATUS_STEPS.indexOf(status);
  if (current < 0) return "";

  const cells = STATUS_STEPS.map((step, index) => {
    const done = index <= current;
    return `
      <td align="center" width="20%" style="padding:0 2px;">
        <div style="height:4px;border-radius:2px;background:${done ? GOLD : LINE};margin-bottom:8px;"></div>
        <div style="font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:${done ? INK : MUTED};">
          ${escapeHtml(STEP_LABELS[step])}
        </div>
      </td>`;
  }).join("");

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
      <tr>${cells}</tr>
    </table>`;
}

/** One email shell so confirmation, invoice and status mails all look like the same store. */
function renderEmail(options: {
  storeName: string;
  heading: string;
  intro: string;
  order: Record<string, any>;
  items: OrderItem[];
  currency: string;
  showItems: boolean;
  showTimeline?: boolean;
  footerNote?: string;
}) {
  const { storeName, heading, intro, order, items, currency, showItems, showTimeline, footerNote } = options;
  const address = order.address_details ?? {};
  const customer = order.customer_info ?? {};
  const status = String(order.order_status ?? "placed").toLowerCase();

  // Item rows carry the product shot — an order confirmation without pictures of what
  // you bought reads like a bank statement.
  const itemRows = items
    .map((item, index) => {
      const variant = [item.size ? `Size ${item.size}` : null, item.weight || null]
        .filter(Boolean)
        .join("&nbsp;&middot;&nbsp;");
      const thumb = (item as any).image;
      return `
        <tr>
          <td style="padding:14px 0;${index ? `border-top:1px solid ${LINE};` : ""}">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="64" valign="top" style="padding-right:14px;">
                  ${thumb
                    ? `<img src="${escapeHtml(thumb)}" width="64" alt="" style="display:block;width:64px;height:80px;object-fit:cover;border-radius:8px;background:${PAPER};" />`
                    : `<div style="width:64px;height:80px;border-radius:8px;background:${PAPER};"></div>`}
                </td>
                <td valign="top">
                  <div style="font-size:14px;line-height:1.4;color:${INK};">${escapeHtml(item.name)}</div>
                  ${variant ? `<div style="font-size:12px;color:${MUTED};margin-top:4px;">${variant}</div>` : ""}
                  <div style="font-size:12px;color:${MUTED};margin-top:4px;">Qty ${escapeHtml(item.quantity ?? 1)}</div>
                </td>
                <td valign="top" align="right" style="font-size:14px;color:${INK};white-space:nowrap;padding-left:12px;">
                  ${money(Number(item.price ?? 0) * Number(item.quantity ?? 1), currency)}
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const summaryRow = (label: string, value: string, tone: "muted" | "total" | "save" = "muted") => {
    const colour = tone === "save" ? "#2E7D32" : tone === "total" ? INK : MUTED;
    const size = tone === "total" ? "16px" : "13px";
    const weight = tone === "total" ? "500" : "400";
    const border = tone === "total" ? `border-top:1px solid ${LINE};padding-top:14px;` : "";
    return `
      <tr>
        <td style="padding:5px 0;${border}font-size:${size};color:${colour};font-weight:${weight};">${escapeHtml(label)}</td>
        <td align="right" style="padding:5px 0;${border}font-size:${size};color:${tone === "save" ? "#2E7D32" : INK};font-weight:${weight};">${value}</td>
      </tr>`;
  };

  const completeAddress = address.complete_address
    ?? [address.plotNumber, address.buildingName, address.street, address.city, address.state, address.pincode]
      .filter(Boolean)
      .join(", ");

  const placedOn = new Date(order.created_at ?? Date.now()).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};-webkit-font-smoothing:antialiased;font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif;">

  <!-- Inbox preview line, hidden in the body -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${escapeHtml(intro)} &mdash; ${escapeHtml(order.order_number)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">

        <!-- Masthead -->
        <tr><td align="center" style="background:${INK};padding:30px 32px 26px;">
          <img src="${siteUrl}/assets/logo-full.png" width="132" alt="${escapeHtml(storeName)}"
               style="display:block;width:132px;height:auto;margin:0 auto;" />
        </td></tr>

        <!-- Gold rule -->
        <tr><td style="height:3px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- Headline -->
        <tr><td style="padding:36px 32px 0;">
          <h1 style="margin:0 0 10px;font-size:24px;font-weight:500;letter-spacing:-0.01em;color:${INK};">
            ${escapeHtml(heading)}
          </h1>
          <p style="margin:0;font-size:15px;line-height:1.65;color:#5C544E;">${escapeHtml(intro)}</p>
        </td></tr>

        <!-- Order meta -->
        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="background:${PAPER};border-radius:12px;">
            <tr>
              <td style="padding:16px 18px;">
                <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">Order</div>
                <div style="font-size:17px;color:${INK};margin-top:3px;letter-spacing:0.02em;">${escapeHtml(order.order_number)}</div>
              </td>
              <td align="right" style="padding:16px 18px;">
                <div style="font-size:12px;color:${MUTED};">${escapeHtml(placedOn)}</div>
                <div style="font-size:12px;color:${MUTED};margin-top:3px;">
                  ${escapeHtml(String(order.payment_method ?? "").toUpperCase())}
                  &nbsp;&middot;&nbsp;
                  <span style="color:${order.payment_status === "paid" ? "#2E7D32" : "#B26A00"};">
                    ${order.payment_status === "paid" ? "Paid" : "Payment on delivery"}
                  </span>
                </div>
              </td>
            </tr>
          </table>
        </td></tr>

        ${showTimeline ? `<tr><td style="padding:28px 32px 0;">${renderTimeline(status)}</td></tr>` : ""}

        ${showItems ? `
        <!-- Items -->
        <tr><td style="padding:28px 32px 0;">
          <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};padding-bottom:6px;">
            Your order
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
        </td></tr>

        <!-- Totals -->
        <tr><td style="padding:20px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="border-top:1px solid ${LINE};padding-top:8px;">
            ${summaryRow("Subtotal", money(order.subtotal, currency))}
            ${Number(order.tax ?? 0) > 0 ? summaryRow("Tax", money(order.tax, currency)) : ""}
            ${summaryRow("Delivery", Number(order.delivery_fee ?? 0) === 0 ? "Free" : money(order.delivery_fee, currency))}
            ${Number(order.cod_fee ?? 0) > 0 ? summaryRow("Cash on delivery", money(order.cod_fee, currency)) : ""}
            ${Number(order.discount ?? 0) > 0
              ? summaryRow(`Discount${order.coupon_code ? ` · ${order.coupon_code}` : ""}`, `− ${money(order.discount, currency)}`, "save")
              : ""}
            ${summaryRow("Total", money(order.total, currency), "total")}
          </table>
          ${Number(order.tax ?? 0) > 0 ? "" : `
          <div style="font-size:11px;color:${MUTED};padding-top:6px;text-align:right;">Inclusive of all taxes</div>`}
        </td></tr>` : ""}

        <!-- Delivery -->
        <tr><td style="padding:28px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="border:1px solid ${LINE};border-radius:12px;">
            <tr><td style="padding:18px;">
              <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED};">Delivering to</div>
              <div style="font-size:14px;color:${INK};margin-top:8px;">${escapeHtml(customer.name)}</div>
              <div style="font-size:13px;color:#5C544E;line-height:1.6;margin-top:4px;">${escapeHtml(completeAddress)}</div>
              ${customer.phone ? `<div style="font-size:13px;color:${MUTED};margin-top:4px;">${escapeHtml(customer.phone)}</div>` : ""}
              ${order.estimated_delivery_time
                ? `<div style="font-size:13px;color:${INK};margin-top:10px;">Estimated arrival: ${escapeHtml(order.estimated_delivery_time)}</div>`
                : ""}
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA -->
        <tr><td align="center" style="padding:30px 32px 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="background:${INK};border-radius:8px;">
              <a href="${siteUrl}/products"
                 style="display:inline-block;padding:14px 34px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#FFFFFF;text-decoration:none;">
                Continue shopping
              </a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:28px 32px 32px;">
          <div style="border-top:1px solid ${LINE};padding-top:20px;">
            <p style="margin:0 0 6px;font-size:12px;line-height:1.7;color:${MUTED};">
              ${escapeHtml(footerNote ?? "Questions about this order? Just reply to this email and we will help.")}
            </p>
            <p style="margin:0;font-size:11px;color:#B4ABA3;">
              ${escapeHtml(storeName)} &middot; This email was sent about order ${escapeHtml(order.order_number)}.
            </p>
          </div>
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
      // The progress rail only means something on a status update.
      showTimeline: type === "status",
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
