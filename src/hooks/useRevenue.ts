/**
 * useRevenue — Revenue Distribution Hooks
 *
 * Sprint B3-B: Commission lookup, revenue recording, earnings/payout queries.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ── Commission Rules ──

export function useCommissionRules() {
  return useQuery({
    queryKey: ["commission-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });
}

// ── Mentor Earnings ──

export function useMyMentorEarnings(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-earnings", mentorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_earnings")
        .select("*")
        .eq("mentor_id", mentorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!mentorId,
  });
}

// ── Provider Earnings ──

export function useProviderEarnings(providerId: string | undefined) {
  return useQuery({
    queryKey: ["provider-earnings", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_earnings")
        .select("*")
        .eq("provider_id", providerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });
}

// ── Mentor Payouts ──

export function useMyMentorPayouts(mentorId: string | undefined) {
  return useQuery({
    queryKey: ["mentor-payouts", mentorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentor_payouts")
        .select("*")
        .eq("mentor_id", mentorId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!mentorId,
  });
}

// ── Provider Payouts ──

export function useProviderPayouts(providerId: string | undefined) {
  return useQuery({
    queryKey: ["provider-payouts", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_payouts")
        .select("*")
        .eq("provider_id", providerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });
}

// ── Revenue Ledger (admin) ──

export function useRevenueLedger(transactionId?: string) {
  return useQuery({
    queryKey: ["revenue-ledger", transactionId],
    queryFn: async () => {
      let query = supabase
        .from("revenue_ledger")
        .select("*")
        .order("created_at", { ascending: false });
      if (transactionId) {
        query = query.eq("transaction_id", transactionId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ── Distribute Revenue (admin action after payment completion) ──

export function useDistributeRevenue() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      transactionId: string;
      orderId: string;
    }) => {
      // 1. Fetch order items for this order
      const { data: items, error: itemsErr } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", input.orderId);
      if (itemsErr) throw itemsErr;
      if (!items?.length) throw new Error("No order items found");

      // 2. Fetch commission rules
      const { data: rules, error: rulesErr } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("is_active", true);
      if (rulesErr) throw rulesErr;

      const ruleMap = new Map(
        (rules ?? []).map((r: any) => [r.product_type, r])
      );

      // 3. Create ledger entries + earnings for each item
      for (const item of items) {
        const rule = ruleMap.get(item.item_type) as any;
        if (!rule) continue;

        const gross = Number(item.total_price);
        const platformFee = (gross * Number(rule.platform_percentage)) / 100;
        const mentorShare = (gross * Number(rule.mentor_percentage)) / 100;
        const providerShare = (gross * Number(rule.provider_percentage)) / 100;

        // Platform ledger entry
        if (platformFee > 0) {
          const { error: ledgerErr } = await supabase.from("revenue_ledger").insert({
            transaction_id: input.transactionId,
            order_item_id: item.id,
            recipient_type: "platform",
            recipient_id: null,
            gross_amount: gross,
            platform_fee: platformFee,
            net_amount: platformFee,
            currency: "USD",
          });
          if (ledgerErr) throw new Error(`Revenue ledger insert failed: ${ledgerErr.message}`);
        }

        // Mentor ledger entry + earnings
        if (mentorShare > 0 && item.item_type === "mentor_session") {
          // Look up mentor from session
          const { data: session } = await supabase
            .from("mentor_sessions")
            .select("mentor_id")
            .eq("id", item.item_id)
            .single();

          if (session?.mentor_id) {
            const { data: ledgerEntry, error: mentorLedgerErr } = await supabase
              .from("revenue_ledger")
              .insert({
                transaction_id: input.transactionId,
                order_item_id: item.id,
                recipient_type: "mentor",
                recipient_id: session.mentor_id,
                gross_amount: gross,
                platform_fee: platformFee,
                net_amount: mentorShare,
                currency: "USD",
              })
              .select()
              .single();
            if (mentorLedgerErr) throw new Error(`Mentor ledger insert failed: ${mentorLedgerErr.message}`);

            if (ledgerEntry) {
              const { error: earningsErr } = await supabase.from("mentor_earnings").insert({
                mentor_id: session.mentor_id,
                ledger_id: ledgerEntry.id,
                amount: mentorShare,
                currency: "USD",
                status: "pending",
              });
              if (earningsErr) throw new Error(`Mentor earnings insert failed: ${earningsErr.message}`);
            }
          }
        }

        // Provider ledger entry + earnings
        if (providerShare > 0) {
          // Look up provider from training item
          const { data: ti } = await supabase
            .from("training_items")
            .select("provider_id")
            .eq("id", item.item_id)
            .single();

          if (ti?.provider_id) {
            const { data: ledgerEntry, error: provLedgerErr } = await supabase
              .from("revenue_ledger")
              .insert({
                transaction_id: input.transactionId,
                order_item_id: item.id,
                recipient_type: "provider",
                recipient_id: ti.provider_id,
                gross_amount: gross,
                platform_fee: platformFee,
                net_amount: providerShare,
                currency: "USD",
              })
              .select()
              .single();
            if (provLedgerErr) throw new Error(`Provider ledger insert failed: ${provLedgerErr.message}`);

            if (ledgerEntry) {
              const { error: provEarningsErr } = await supabase.from("provider_earnings").insert({
                provider_id: ti.provider_id,
                ledger_id: ledgerEntry.id,
                amount: providerShare,
                currency: "USD",
                status: "pending",
              });
              if (provEarningsErr) throw new Error(`Provider earnings insert failed: ${provEarningsErr.message}`);
            }
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["revenue-ledger"] });
      qc.invalidateQueries({ queryKey: ["mentor-earnings"] });
      qc.invalidateQueries({ queryKey: ["provider-earnings"] });
      toast.success("Revenue distributed successfully");
    },
    onError: (err: Error) => {
      toast.error(`Revenue distribution failed: ${err.message}`);
    },
  });
}
