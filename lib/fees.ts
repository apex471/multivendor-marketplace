/**
 * CLW Marketplace — Centralized Fee Engine
 * ─────────────────────────────────────────
 * Fee model (mirrors Fiverr's dual-sided structure):
 *
 *  BUYER        pays  5% service fee on the merchandise subtotal
 *  SELLER       pays  5% commission on the merchandise subtotal (deducted at payout)
 *  PLATFORM     earns 10% gross (5% from each side) → absorbs 2.9% Stripe processing fee
 *  NET MARGIN   = 10% − 2.9% = 7.1% per successful transaction
 *
 *  Tax (8%) and shipping are pass-through — not subject to the service fee.
 */

export const FEES = {
  /** Stripe processing rate (2.9% + $0.30, budgeted at flat 2.9%) */
  STRIPE_RATE: 0.029,

  /** Buyer service fee — 5% service fee on the merchandise subtotal */
  BUYER_SERVICE_FEE_RATE: 0.05,

  /** % deducted from the vendor's merchandise subtotal at escrow release */
  SELLER_FEE_RATE: 0.05,

  /** Sales tax rate (8%) */
  TAX_RATE: 0.08,
} as const;

export interface FeeBreakdown {
  /** Merchandise subtotal (sum of item prices × quantities) */
  subtotal: number;
  /** Shipping cost */
  shipping: number;
  /** Buyer-side 5% service fee on merchandise subtotal */
  buyerServiceFee: number;
  /** 8% sales tax on merchandise subtotal only */
  tax: number;
  /** Grand total charged to buyer: subtotal + buyerServiceFee + shipping + tax */
  buyerTotal: number;
  /** Stripe processing fee (2.9% of buyerTotal) — absorbed by platform */
  stripeFee: number;
  /** 5% seller commission deducted at escrow payout */
  sellerFee: number;
  /** Net amount released to vendor after sellerFee deduction */
  vendorPayout: number;
  /** Platform gross revenue = buyerServiceFee + sellerFee */
  platformGross: number;
  /** Platform net revenue = platformGross − stripeFee */
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
  const stripeFee       = round2(buyerTotal * FEES.STRIPE_RATE + 0.30);
  const sellerFee       = round2(subtotal * FEES.SELLER_FEE_RATE);
  const vendorPayout    = round2(subtotal - sellerFee);
  const platformGross   = round2(buyerServiceFee + sellerFee);
  const platformNet     = round2(platformGross - stripeFee);

  return {
    subtotal,
    shipping,
    buyerServiceFee,
    tax,
    buyerTotal,
    stripeFee,
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
