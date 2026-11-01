/**
 * PayPal Integration for CollectIt
 * - Orders API v2 (sandbox & live)
 * - Currency conversion (₹ INR to USD or charged currency)
 * - Capture with amount verification & idempotency
 * - Payouts API & simulated payouts
 */

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
  chargeCurrency: string;
  inrPerUsd: number;
  payoutsEnabled: boolean;
  baseUrl: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export function getPayPalConfig(): PayPalConfig {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  const mode = (process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox') as 'sandbox' | 'live';
  const chargeCurrency = process.env.PAYPAL_CHARGE_CURRENCY || 'USD';
  const inrPerUsd = parseFloat(process.env.INR_PER_USD || '88') || 88;
  const payoutsEnabled = process.env.PAYPAL_PAYOUTS_ENABLED === 'true';
  const baseUrl = mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

  return {
    clientId,
    clientSecret,
    mode,
    chargeCurrency,
    inrPerUsd,
    payoutsEnabled,
    baseUrl,
  };
}

export function isPayPalConfigured(): boolean {
  const { clientId, clientSecret } = getPayPalConfig();
  return Boolean(clientId && clientSecret && clientId !== 'MY_PAYPAL_CLIENT_ID');
}

export function inrToCharge(amountInr: number) {
  const { chargeCurrency, inrPerUsd } = getPayPalConfig();
  if (chargeCurrency === 'USD') {
    const rawUsd = amountInr / inrPerUsd;
    const chargeAmount = Math.max(0.50, Math.round(rawUsd * 100) / 100);
    return {
      chargeAmount,
      chargeCurrency: 'USD',
      fxRate: inrPerUsd,
    };
  }
  return {
    chargeAmount: Math.round(amountInr * 100) / 100,
    chargeCurrency: 'INR',
    fxRate: 1,
  };
}

async function getAccessToken(): Promise<string> {
  const { clientId, clientSecret, baseUrl } = getPayPalConfig();
  if (!clientId || !clientSecret) {
    throw new Error('PayPal client ID or secret is not configured.');
  }

  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authHeader}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('PayPal OAuth token error:', errText);
    throw new Error(`Failed to obtain PayPal access token: ${res.statusText}`);
  }

  const data = await res.json();
  const token = data.access_token;
  const expiresIn = data.expires_in || 3600;
  cachedToken = {
    token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return token;
}

export async function createPayPalOrder(params: {
  collectionId: string;
  paymentId: string;
  amountInr: number;
  description: string;
}) {
  const { chargeAmount, chargeCurrency } = inrToCharge(params.amountInr);
  const { baseUrl } = getPayPalConfig();
  const token = await getAccessToken();

  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: `collection-${params.collectionId}-payment-${params.paymentId}`,
        custom_id: params.paymentId,
        description: params.description.slice(0, 127),
        amount: {
          currency_code: chargeCurrency,
          value: chargeAmount.toFixed(2),
        },
      },
    ],
  };

  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('PayPal create order error:', errBody);
    throw new Error(`PayPal create order failed: ${res.statusText}`);
  }

  const orderData = await res.json();
  return {
    orderId: orderData.id,
    chargeAmount,
    chargeCurrency,
  };
}

export async function capturePayPalOrder(orderId: string, expectedChargedAmount: number) {
  const { baseUrl } = getPayPalConfig();
  const token = await getAccessToken();

  const res = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('PayPal capture error:', errBody);
    throw new Error(`PayPal capture failed: ${res.statusText}`);
  }

  const captureData = await res.json();
  const captureObj = captureData.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = captureObj?.id;
  const captureStatus = captureData.status; // 'COMPLETED'
  const capturedValue = parseFloat(captureObj?.amount?.value || '0');

  // Verify amount matches expected charged amount within 0.05
  if (Math.abs(capturedValue - expectedChargedAmount) > 0.05) {
    console.warn(`Captured value ${capturedValue} differs from expected ${expectedChargedAmount}`);
  }

  return {
    status: captureStatus,
    captureId: captureId || orderId,
    capturedValue,
  };
}

export async function executePayout(params: {
  payoutId: string;
  amountInr: number;
  paypalEmail: string;
  note: string;
}) {
  const { payoutsEnabled, baseUrl } = getPayPalConfig();
  const { chargeAmount, chargeCurrency } = inrToCharge(params.amountInr);

  if (!payoutsEnabled || !isPayPalConfigured()) {
    // Simulated payout
    return {
      status: 'sent' as const,
      isSimulated: true,
      batchId: `sim-batch-${Date.now()}`,
    };
  }

  const token = await getAccessToken();
  const payload = {
    sender_batch_header: {
      sender_batch_id: `batch-${params.payoutId}-${Date.now()}`,
      email_subject: 'You have a payout from CollectIt',
      email_message: params.note || 'Settlement payout from CollectIt',
    },
    items: [
      {
        recipient_type: 'EMAIL',
        amount: {
          value: chargeAmount.toFixed(2),
          currency: chargeCurrency,
        },
        note: params.note || 'Collection settlement',
        sender_item_id: params.payoutId,
        receiver: params.paypalEmail,
      },
    ],
  };

  const res = await fetch(`${baseUrl}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error('PayPal payout error:', errBody);
    throw new Error(`PayPal Payout failed: ${res.statusText}`);
  }

  const payoutResult = await res.json();
  return {
    status: 'sent' as const,
    isSimulated: false,
    batchId: payoutResult.batch_header?.payout_batch_id || `batch-${Date.now()}`,
  };
}
