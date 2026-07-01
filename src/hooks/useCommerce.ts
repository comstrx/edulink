/**
 * useCommerce — Commerce Foundation Hooks
 *
 * Sprint B3-A: Order creation, order items, transactions, and lifecycle.
 * No payment UI — only data layer for commerce operations.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { OrderItemType } from "@/contracts/commerce/commerce.contracts";

// ── Types (mirrors DB enums since types.ts auto-generates later) ──

interface Order {
  id: string;
  buyer_user_id: string;
  status: string;
  currency: string;
  total_amount: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface OrderItemInput {
  item_type: OrderItemType;
  item_id: string;
  unit_price: number;
  quantity: number;
}

interface Transaction {
  id: string;
  order_id: string;
  payment_provider: string | null;
  provider_transaction_id: string | null;
  amount: number;
  currency: string;
  status: string;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ── Fetch user orders ──

export function useMyOrders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
    enabled: !!user,
  });
}

// ── Fetch order details with items and transactions ──

export function useOrderDetails(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order-details", orderId],
    queryFn: async () => {
      const [orderRes, itemsRes, txRes] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId!).single(),
        supabase.from("order_items").select("*").eq("order_id", orderId!),
        supabase.from("transactions").select("*").eq("order_id", orderId!).order("created_at", { ascending: false }),
      ]);
      if (orderRes.error) throw orderRes.error;
      return {
        order: orderRes.data as Order,
        items: (itemsRes.data ?? []) as Array<{ id: string; item_type: string; item_id: string; unit_price: number; quantity: number; total_price: number }>,
        transactions: (txRes.data ?? []) as Transaction[],
      };
    },
    enabled: !!orderId,
  });
}

// ── Create order with items ──

export function useCreateOrder() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      items: OrderItemInput[];
      currency?: string;
    }) => {
      if (!user) throw new Error("Authentication required");

      const currency = input.currency ?? "USD";
      const totalAmount = input.items.reduce(
        (sum, i) => sum + i.unit_price * i.quantity,
        0
      );

      // 1. Create order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          buyer_user_id: user.id,
          status: "pending",
          currency,
          total_amount: totalAmount,
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      // 2. Insert order items
      const orderItems = input.items.map((i) => ({
        order_id: order.id,
        item_type: i.item_type,
        item_id: i.item_id,
        unit_price: i.unit_price,
        quantity: i.quantity,
        total_price: i.unit_price * i.quantity,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(orderItems);
      if (itemsErr) throw itemsErr;

      // 3. Transition to payment_pending and create initiated transaction
      const { error: statusErr } = await supabase
        .from("orders")
        .update({ status: "payment_pending" })
        .eq("id", order.id);
      if (statusErr) throw statusErr;

      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .insert({
          order_id: order.id,
          amount: totalAmount,
          currency,
          status: "initiated",
        })
        .select()
        .single();
      if (txErr) throw txErr;

      return { orderId: order.id, transactionId: tx.id };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order created successfully");
    },
    onError: (err: Error) => {
      toast.error(`Order failed: ${err.message}`);
    },
  });
}

// ── Cancel order ──

export function useCancelOrder() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
    },
    onError: (err: Error) => {
      toast.error(`Cancel failed: ${err.message}`);
    },
  });
}
