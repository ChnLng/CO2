// ==============================================
// JASPER E-COMMERCE - ORDER SERVICE
// ==============================================
import { supabase } from "./supabase";
import { calculateFrozenUntilDate, isFundsReleased } from "./stripeService";

export type OrderItem = {
  product_id: number;
  product_name: string;
  product_price: number;
  quantity: number;
};

export type ShippingInfo = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
};

// --- --- --- --- --- --- --- --- --- --- ---
// 1. CREATE NEW ORDER
// --- --- --- --- --- --- --- --- --- --- ---
export async function createOrder(params: {
  user_id?: string;
  stripe_payment_intent_id?: string;
  subtotal: number;
  shipping_cost: number;
  discount_amount?: number;
  tax_amount?: number;
  total_amount: number;
  promo_code_id?: number;
  shipping: ShippingInfo;
  items: OrderItem[];
}) {
  // Validation
  if (
    !params.shipping.name ||
    !params.shipping.email ||
    !params.shipping.phone ||
    !params.shipping.address ||
    !params.shipping.city ||
    !params.shipping.postal_code ||
    !params.shipping.country
  ) {
    throw new Error(
      "Veuillez remplir tous les champs de livraison obligatoires",
    );
  }

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: params.user_id,
      stripe_payment_intent_id: params.stripe_payment_intent_id,
      subtotal: params.subtotal,
      shipping_cost: params.shipping_cost,
      discount_amount: params.discount_amount || 0,
      tax_amount: params.tax_amount || 0,
      total_amount: params.total_amount,
      promo_code_id: params.promo_code_id,
      status: "pending",
      shipping_name: params.shipping.name,
      shipping_email: params.shipping.email,
      shipping_phone: params.shipping.phone,
      shipping_address: params.shipping.address,
      shipping_city: params.shipping.city,
      shipping_postal_code: params.shipping.postal_code,
      shipping_country: params.shipping.country,
    })
    .select()
    .single();

  if (orderError) throw orderError;

  // Create order items
  const orderItems = params.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.product_name,
    product_price: item.product_price,
    quantity: item.quantity,
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // Create shipping info
  const { error: shippingError } = await supabase.from("shipping_info").insert({
    order_id: order.id,
    status: "preparing",
  });

  if (shippingError) throw shippingError;

  // Create fund pool entry (14 jours de gel)
  const frozenUntil = calculateFrozenUntilDate();
  const { error: fundError } = await supabase.from("fund_pool").insert({
    order_id: order.id,
    amount: params.total_amount,
    status: "frozen",
    frozen_until: frozenUntil.toISOString(),
  });

  if (fundError) throw fundError;

  // Update promo code usage
  if (params.promo_code_id) {
    await supabase.rpc("increment_promo_code_usage", {
      promo_id: params.promo_code_id,
    });
  }

  return order;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 2. MARK ORDER AS PAID
// --- --- --- --- --- --- --- --- --- --- ---
export async function markOrderAsPaid(
  orderId: number,
  paymentIntentId: string,
) {
  const { data, error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 3. GET USER ORDERS
// --- --- --- --- --- --- --- --- --- --- ---
export async function getUserOrders(userId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
            *,
            order_items (*),
            shipping_info (*)
        `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 4. GET ALL ORDERS (ADMIN)
// --- --- --- --- --- --- --- --- --- --- ---
export async function getAllOrders() {
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
            *,
            order_items (*),
            shipping_info (*),
            profiles (email, phone, full_name),
            refunds (*)
        `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 5. UPDATE SHIPPING INFO
// --- --- --- --- --- --- --- --- --- --- ---
export async function updateShippingInfo(
  orderId: number,
  updates: {
    tracking_number?: string;
    carrier?: string;
    shipping_url?: string;
    status?: string;
    estimated_delivery?: string;
  },
) {
  const { data, error } = await supabase
    .from("shipping_info")
    .update(updates)
    .eq("order_id", orderId)
    .select()
    .single();

  if (error) throw error;

  // Also update order status if shipped or delivered
  if (updates.status === "shipped") {
    await supabase
      .from("orders")
      .update({
        status: "shipped",
        shipped_at: new Date().toISOString(),
      })
      .eq("id", orderId);
  } else if (updates.status === "delivered") {
    await supabase
      .from("orders")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
      })
      .eq("id", orderId);
  }

  return data;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 6. REQUEST A REFUND
// --- --- --- --- --- --- --- --- --- --- ---
export async function requestRefund(
  orderId: number,
  userId: string,
  reason: string,
  amount?: number,
) {
  // Get order to verify
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (!order) throw new Error("Commande introuvable");

  // Create refund request
  const { data, error } = await supabase
    .from("refunds")
    .insert({
      order_id: orderId,
      amount: amount || order.total_amount,
      reason: reason,
      requested_by: userId,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 7. PROCESS REFUND (ADMIN)
// --- --- --- --- --- --- --- --- --- --- ---
export async function processRefund(
  refundId: number,
  adminId: string,
  approve: boolean,
  stripeRefundId?: string,
) {
  const { data, error } = await supabase
    .from("refunds")
    .update({
      status: approve ? "approved" : "rejected",
      approved_by: approve ? adminId : null,
      approved_at: approve ? new Date().toISOString() : null,
      stripe_refund_id: stripeRefundId || null,
    })
    .eq("id", refundId)
    .select()
    .single();

  if (error) throw error;

  // Update order status if refund approved
  if (approve) {
    const { data: refundData } = await supabase
      .from("refunds")
      .select("order_id")
      .eq("id", refundId)
      .single();

    if (refundData) {
      await supabase
        .from("orders")
        .update({
          status: "refunded",
          refunded_at: new Date().toISOString(),
        })
        .eq("id", refundData.order_id);
    }
  }

  return data;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 8. GET FUND POOL (ADMIN)
// --- --- --- --- --- --- --- --- --- --- ---
export async function getFundPool() {
  const { data, error } = await supabase
    .from("fund_pool")
    .select(
      `
            *,
            orders (id, created_at, total_amount)
        `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 9. GET RELEASED FUNDS (14 jours écoulés)
// --- --- --- --- --- --- --- --- --- --- ---
export async function getReleasedFunds() {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("fund_pool")
    .select("*")
    .eq("status", "frozen")
    .lte("frozen_until", now);

  if (error) throw error;

  // Mettre à jour le statut à 'available'
  if (data && data.length > 0) {
    const ids = data.map((item) => item.id);
    await supabase
      .from("fund_pool")
      .update({ status: "available", released_at: now })
      .in("id", ids);
  }

  return await getFundPool();
}

// --- --- --- --- --- --- --- --- --- --- ---
// 10. CREATE DIVIDEND DISTRIBUTION
// --- --- --- --- --- --- --- --- --- --- ---
export async function createDividendDistribution(
  totalAmount: number,
  admin1Share: number,
  admin2Share: number,
  notes?: string,
) {
  const { data, error } = await supabase
    .from("dividend_distributions")
    .insert({
      total_amount: totalAmount,
      admin1_share: admin1Share,
      admin2_share: admin2Share,
      notes: notes || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 11. UPDATE DIVIDEND WITH STRIPE TRANSFERS
// --- --- --- --- --- --- --- --- --- --- ---
export async function updateDividendWithTransfers(
  distributionId: number,
  admin1TransferId?: string,
  admin2TransferId?: string,
) {
  const { data, error } = await supabase
    .from("dividend_distributions")
    .update({
      admin1_stripe_transfer_id: admin1TransferId || null,
      admin2_stripe_transfer_id: admin2TransferId || null,
      status: "completed",
      distributed_at: new Date().toISOString(),
    })
    .eq("id", distributionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// --- --- --- --- --- --- --- --- --- --- ---
// 12. GET ALL DIVIDEND DISTRIBUTIONS
// --- --- --- --- --- --- --- --- --- --- ---
export async function getDividendDistributions() {
  const { data, error } = await supabase
    .from("dividend_distributions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
