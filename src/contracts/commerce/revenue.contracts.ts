/**
 * Revenue Distribution Contracts — Sprint B3-B
 *
 * Types and event payloads for the revenue accounting layer.
 * Covers ledger entries, earnings, and payouts.
 */

import type { DomainEvent } from "../core/domain-event";

// ── Enums ──

export type RecipientType = "platform" | "mentor" | "provider";
export type EarningsStatus = "pending" | "available" | "paid";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";

// ── Event Payloads ──

export interface RevenueRecordedPayload {
  transactionId: string;
  orderId: string;
  ledgerEntryCount: number;
  totalGross: number;
  totalPlatformFee: number;
  currency: string;
  recordedAt: string;
}

export interface EarningsCreatedPayload {
  earningsId: string;
  recipientType: RecipientType;
  recipientId: string;
  amount: number;
  currency: string;
  ledgerId: string;
}

export interface PayoutInitiatedPayload {
  payoutId: string;
  recipientType: RecipientType;
  recipientId: string;
  amount: number;
  currency: string;
}

export interface PayoutCompletedPayload {
  payoutId: string;
  recipientType: RecipientType;
  recipientId: string;
  amount: number;
  currency: string;
  completedAt: string;
}

// ── Typed Events ──

export type RevenueRecordedEvent = DomainEvent<RevenueRecordedPayload>;
export type EarningsCreatedEvent = DomainEvent<EarningsCreatedPayload>;
export type PayoutInitiatedEvent = DomainEvent<PayoutInitiatedPayload>;
export type PayoutCompletedEvent = DomainEvent<PayoutCompletedPayload>;
