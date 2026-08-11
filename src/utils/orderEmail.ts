import { supabase } from '@/integrations/supabase/client';

/**
 * Order emails, sent through the `send-order-email` edge function (ZeptoMail).
 *
 * The recipient is decided server-side from the order row, so callers only name the
 * order and the kind of email — there is no way to aim one of these at another address.
 */
export type OrderEmailType =
  /** To the customer, on checkout. */
  | 'confirmation'
  /** To the shop, on checkout — new order, amount, payment method. */
  | 'admin-alert'
  /** To the customer, on demand. */
  | 'invoice'
  /** To the customer, when an admin moves the order along. */
  | 'status';

export interface OrderEmailResult {
  sent: boolean;
  error?: string;
}

const FUNCTION_NAME = 'send-order-email';

/**
 * Fire-and-forget by design: a mail outage must never fail an order that has already
 * been paid for and written to the database. Failures are surfaced in the return value
 * for callers that want to show a toast, and logged either way.
 *
 * Logged as an error, not a warning, and with the URL it tried — a silent warning is how
 * a function that was never reachable stays invisible for weeks. If the URL below is not
 * the project you deployed to, that is the bug.
 */
export async function sendOrderEmail(
  orderNumber: string,
  type: OrderEmailType = 'confirmation'
): Promise<OrderEmailResult> {
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL ?? '(no VITE_SUPABASE_URL)'}/functions/v1/${FUNCTION_NAME}`;

  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: { orderNumber, type },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send the email';
    console.error(
      `[orderEmail] ${type} email for order ${orderNumber} was NOT sent.\n` +
        `  reason:   ${message}\n` +
        `  endpoint: ${endpoint}\n` +
        `  If this 404s, the function is not deployed to this project. ` +
        `POST {"diagnose":true} to that URL to see its configuration.`
    );
    return { sent: false, error: message };
  }
}

/**
 * Configuration read-out from the deployed function: which project it is running in,
 * which ZeptoMail endpoint it will use, and which secrets are present (never their
 * values). Returns the failure itself when the function cannot be reached at all.
 */
export async function diagnoseOrderEmail(): Promise<{ reachable: boolean; detail: unknown }> {
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: { diagnose: true },
    });
    if (error) throw error;
    return { reachable: true, detail: data };
  } catch (error) {
    return {
      reachable: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
