import { supabase } from '@/integrations/supabase/client';

/**
 * Order emails, sent through the `send-order-email` edge function (ZeptoMail).
 *
 * The recipient is decided server-side from the order row, so callers only name the
 * order and the kind of email — there is no way to aim one of these at another address.
 */
export type OrderEmailType = 'confirmation' | 'invoice' | 'status';

export interface OrderEmailResult {
  sent: boolean;
  error?: string;
}

/**
 * Fire-and-forget by design: a mail outage must never fail an order that has already
 * been paid for and written to the database. Failures are surfaced in the return value
 * for callers that want to show a toast, and logged either way.
 */
export async function sendOrderEmail(
  orderNumber: string,
  type: OrderEmailType = 'confirmation'
): Promise<OrderEmailResult> {
  try {
    const { data, error } = await supabase.functions.invoke('send-order-email', {
      body: { orderNumber, type },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send the email';
    // Not deployed / not configured is the common case in a fresh environment.
    console.warn(`[orderEmail] ${type} email for ${orderNumber} was not sent:`, message);
    return { sent: false, error: message };
  }
}
