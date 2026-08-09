// Calculs purs utilisables dans le navigateur. Toute opération Stripe secrète
// se trouve dans stripe-core.server.ts et n'est jamais envoyée au client.

// --- --- --- --- --- --- --- --- --- --- ---
// CALCULATE SHIPPING COST
// --- --- --- --- --- --- --- --- --- --- ---
export type ShippingZone = "france" | "europe" | "international";

export function calculateShippingCost(
  zone: ShippingZone,
  totalWeightGrams: number,
  shippingRates: Array<{
    zone: string;
    min_weight_grams: number;
    max_weight_grams: number | null;
    base_price: number;
    price_per_kg: number;
  }>,
): number {
  const rate = shippingRates.find(
    (r) =>
      r.zone === zone &&
      r.min_weight_grams <= totalWeightGrams &&
      (r.max_weight_grams === null || r.max_weight_grams >= totalWeightGrams),
  );

  if (!rate) {
    return 0.0;
  }

  let cost = rate.base_price;
  if (totalWeightGrams > 1000 && rate.price_per_kg > 0) {
    const extraKg = Math.max(0, totalWeightGrams / 1000 - 1);
    cost += extraKg * rate.price_per_kg;
  }

  return Math.round(cost * 100) / 100;
}

// --- --- --- --- --- --- --- --- --- --- ---
// CALCULATE TOTAL ORDER AMOUNT
// --- --- --- --- --- --- --- --- --- --- ---
export function calculateOrderTotal(
  productsTotal: number,
  shippingCost: number,
  discountPercent: number = 0,
) {
  const discountAmount = productsTotal * (discountPercent / 100);
  const subtotal = productsTotal - discountAmount;
  const taxRate = 0.2; // TVA 20%
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + shippingCost + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shippingCost: Math.round(shippingCost * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

// --- --- --- --- --- --- --- --- --- --- ---
// CALCULATE 14-DAY FROZEN DATE
// --- --- --- --- --- --- --- --- --- --- ---
export function calculateFrozenUntilDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
}

// --- --- --- --- --- --- --- --- --- --- ---
// CHECK IF FUNDS ARE RELEASED
// --- --- --- --- --- --- --- --- --- --- ---
export function isFundsReleased(frozenUntil: Date): boolean {
  return new Date() > new Date(frozenUntil);
}

// --- --- --- --- --- --- --- --- --- --- ---
// IS IT THE 1ST OF THE MONTH? (FOR AUTO DISTRIBUTION)
// --- --- --- --- --- --- --- --- --- --- ---
export function isFirstOfMonth(): boolean {
  const today = new Date();
  return today.getDate() === 1;
}
