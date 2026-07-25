/**
 * CLW Marketplace — Centralized Fee Engine
 * ─────────────────────────────────────────
 * Fee model (dual-sided structure):
 *
 *  BUYER        pays  10% service fee on the merchandise subtotal
 *  SELLER       pays  10% commission on the merchandise subtotal (deducted at payout)
 *  PLATFORM     earns 20% gross (10% from each side) → absorbs ~1.4% Flutterwave processing fee
 *  NET MARGIN   ≈ 20% − 1.4% = 18.6% per successful transaction
 *
 *  Tax (8%) and shipping are pass-through — not subject to the service fee.
 */

export const FEES = {
  /** Flutterwave processing rate (~1.4% capped at ₦2,000) — budgeted at flat 1.4% */
  PAYMENT_FEE_RATE: 0.014,

  /** Buyer service fee — 10% service fee on the merchandise subtotal */
  BUYER_SERVICE_FEE_RATE: 0.10,

  /** % deducted from the vendor's merchandise subtotal at escrow release */
  SELLER_FEE_RATE: 0.10,

  /** Sales tax rate (8%) */
  TAX_RATE: 0.08,

  /** @deprecated Use PAYMENT_FEE_RATE. Kept for backward compat with existing DB records */
  STRIPE_RATE: 0.014,
} as const;

export interface FeeBreakdown {
  /** Merchandise subtotal (sum of item prices × quantities) */
  subtotal: number;
  /** Shipping cost */
  shipping: number;
  /** Buyer-side 10% service fee on merchandise subtotal */
  buyerServiceFee: number;
  /** 8% sales tax on merchandise subtotal only */
  tax: number;
  /** Grand total charged to buyer: subtotal + buyerServiceFee + shipping + tax */
  buyerTotal: number;
  /** Payment processing fee (~1.4% of buyerTotal) — absorbed by platform */
  paymentFee: number;
  /** @deprecated Use paymentFee. Kept for backward compat with existing DB records */
  stripeFee: number;
  /** 10% seller commission deducted at escrow payout */
  sellerFee: number;
  /** Net amount released to vendor after sellerFee deduction */
  vendorPayout: number;
  /** Platform gross revenue = buyerServiceFee + sellerFee */
  platformGross: number;
  /** Platform net revenue = platformGross − paymentFee */
  platformNet: number;
}

/**
 * Calculate the complete fee breakdown for a given order.
 * @param subtotal - Merchandise subtotal (items only, no shipping or tax)
 * @param shipping - Shipping cost
 */
export function calculateFees(subtotal: number, shipping: number): FeeBreakdown {
  const buyerServiceFee = round2(subtotal * FEES.BUYER_SERVICE_FEE_RATE);
  const tax             = round2(subtotal * FEES.TAX_RATE);
  const buyerTotal      = round2(subtotal + buyerServiceFee + shipping + tax);
  const paymentFee      = round2(buyerTotal * FEES.PAYMENT_FEE_RATE);
  const sellerFee       = round2(subtotal * FEES.SELLER_FEE_RATE);
  const vendorPayout    = round2(subtotal - sellerFee);
  const platformGross   = round2(buyerServiceFee + sellerFee);
  const platformNet     = round2(platformGross - paymentFee);

  return {
    subtotal,
    shipping,
    buyerServiceFee,
    tax,
    buyerTotal,
    paymentFee,
    stripeFee: paymentFee, // backward compat alias
    sellerFee,
    vendorPayout,
    platformGross,
    platformNet,
  };
}

/** Round to 2 decimal places (money precision) */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
