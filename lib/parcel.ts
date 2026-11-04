/**
 * Luxury Marketplace Parcel & Volumetric Weight Engine
 * Computes realistic dimensions, physical weight, volumetric weight,
 * and parcel size tier for cart consignments based on product attributes.
 */

export interface ParcelItem {
  id?: string;
  name: string;
  quantity: number;
  size?: string;
  color?: string;
  category?: string;
  price?: number;
}

export interface ParcelSpecs {
  totalPieces: number;
  weight: number; // in kg (actual physical weight)
  tier: 'light' | 'standard' | 'medium' | 'heavy';
  tierLabel: string;
  dimensions: {
    length: number; // cm
    width: number; // cm
    height: number; // cm
  };
  volumetricWeight: number; // in kg
  billableWeight: number; // in kg (greater of physical vs volumetric)
  summaryText: string;
}

/**
 * Calculates parcel dimensions, weight, and size tier from cart items.
 * Accounts for garment categories, footwear, accessories, size grading,
 * and luxury tamper-evident shipping packaging.
 */
export function calculateParcelSpecs(items: ParcelItem[]): ParcelSpecs {
  if (!items || items.length === 0) {
    return {
      totalPieces: 0,
      weight: 0.5,
      tier: 'light',
      tierLabel: 'Small Parcel (under 1kg)',
      dimensions: { length: 25, width: 20, height: 5 },
      volumetricWeight: 0.5,
      billableWeight: 0.5,
      summaryText: '0 items · Small Parcel',
    };
  }

  let totalWeight = 0;
  let totalPieces = 0;
  let totalVolume = 0; // cm^3

  for (const item of items) {
    const qty = Math.max(1, Number(item.quantity) || 1);
    totalPieces += qty;
    const lowerName = (item.name || '').toLowerCase();
    const lowerSize = (item.size || '').toLowerCase();

    // Base weight (kg) & base packaging volume (cm^3) per fashion piece
    let itemBaseWeight = 0.5;
    let itemVolume = 2500;

    if (
      lowerName.includes('coat') ||
      lowerName.includes('jacket') ||
      lowerName.includes('suit') ||
      lowerName.includes('blazer') ||
      lowerName.includes('trench') ||
      lowerName.includes('parka')
    ) {
      itemBaseWeight = 1.35;
      itemVolume = 8000;
    } else if (
      lowerName.includes('boot') ||
      lowerName.includes('shoe') ||
      lowerName.includes('sneaker') ||
      lowerName.includes('heel') ||
      lowerName.includes('loafer') ||
      lowerName.includes('mule') ||
      lowerName.includes('oxford')
    ) {
      itemBaseWeight = 1.2;
      itemVolume = 7000; // standard luxury shoe box
    } else if (
      lowerName.includes('bag') ||
      lowerName.includes('tote') ||
      lowerName.includes('backpack') ||
      lowerName.includes('purse') ||
      lowerName.includes('duffle') ||
      lowerName.includes('clutch')
    ) {
      itemBaseWeight = 0.95;
      itemVolume = 6000;
    } else if (
      lowerName.includes('dress') ||
      lowerName.includes('hoodie') ||
      lowerName.includes('sweater') ||
      lowerName.includes('knit') ||
      lowerName.includes('denim') ||
      lowerName.includes('jean') ||
      lowerName.includes('pant') ||
      lowerName.includes('trouser') ||
      lowerName.includes('tracksuit')
    ) {
      itemBaseWeight = 0.7;
      itemVolume = 4200;
    } else if (
      lowerName.includes('shirt') ||
      lowerName.includes('polo') ||
      lowerName.includes('top') ||
      lowerName.includes('t-shirt') ||
      lowerName.includes('skirt') ||
      lowerName.includes('short') ||
      lowerName.includes('blouse')
    ) {
      itemBaseWeight = 0.35;
      itemVolume = 2200;
    } else if (
      lowerName.includes('watch') ||
      lowerName.includes('jewelry') ||
      lowerName.includes('necklace') ||
      lowerName.includes('ring') ||
      lowerName.includes('earring') ||
      lowerName.includes('wallet') ||
      lowerName.includes('cardholder') ||
      lowerName.includes('belt') ||
      lowerName.includes('scarf') ||
      lowerName.includes('sunglass') ||
      lowerName.includes('accessory')
    ) {
      itemBaseWeight = 0.25;
      itemVolume = 1200;
    }

    // Size grading factor: larger sizes have more fabric/material
    if (lowerSize.includes('xxl') || lowerSize.includes('2xl') || lowerSize.includes('3xl')) {
      itemBaseWeight *= 1.2;
      itemVolume *= 1.2;
    } else if (lowerSize.includes('xl')) {
      itemBaseWeight *= 1.1;
      itemVolume *= 1.1;
    }

    totalWeight += itemBaseWeight * qty;
    totalVolume += itemVolume * qty;
  }

  // Luxury protective box & tamper-evident packaging allowance
  totalWeight += 0.25;
  totalVolume += 1500;

  // Courier volumetric calculation (IATA / CourierPlus standard divisor: 5000 cm^3/kg)
  const volumetricWeight = Math.round((totalVolume / 5000) * 10) / 10;
  const actualWeight = Math.round(Math.max(0.5, totalWeight) * 10) / 10;
  const billableWeight = Math.round(Math.max(actualWeight, volumetricWeight) * 10) / 10;

  let tier: 'light' | 'standard' | 'medium' | 'heavy' = 'light';
  let tierLabel = 'Small Parcel (under 1kg)';

  if (billableWeight > 5) {
    tier = 'heavy';
    tierLabel = `Large Consignment (${billableWeight} kg)`;
  } else if (billableWeight > 2.5) {
    tier = 'medium';
    tierLabel = `Medium Box (${billableWeight} kg)`;
  } else if (billableWeight > 1) {
    tier = 'standard';
    tierLabel = `Standard Parcel (${billableWeight} kg)`;
  }

  const summaryText = `${totalPieces} ${totalPieces === 1 ? 'item' : 'items'} · ${tierLabel}`;

  return {
    totalPieces,
    weight: actualWeight,
    tier,
    tierLabel,
    dimensions: {
      length: Math.max(20, Math.round(Math.cbrt(totalVolume * 2))),
      width: Math.max(15, Math.round(Math.cbrt(totalVolume * 1.5))),
      height: Math.max(5, Math.round(Math.cbrt(totalVolume * 0.75))),
    },
    volumetricWeight,
    billableWeight,
    summaryText,
  };
}

