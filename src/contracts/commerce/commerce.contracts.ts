/**
 * Commerce Domain Contracts — Sprint B3-A
 *
 * Canonical types and event payloads for the Commerce Foundation.
 * Commerce is domain-neutral: supports training products and mentor sessions.
 */

import type { DomainEvent } from "../core/domain-event";

// ── Enums ──

export type OrderStatus = "pending" | "payment_pending" | "paid" | "cancelled" | "refunded";
export type TransactionStatus = "initiated" | "authorized" | "completed" | "failed" | "refunded";
export type OrderItemType = "training_course" | "training_package" | "training_pathway" | "mentor_session";

// ── Event Payloads ──

export interface OrderCreatedPayload {
  orderId: string;
  buyerUserId: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  createdAt: string;
}

export interface PaymentInitiatedPayload {
  orderId: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentProvider: string | null;
}

export interface PaymentCompletedPayload {
  orderId: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentProvider: string | null;
  completedAt: string;
}

export interface PaymentFailedPayload {
  orderId: string;
  transactionId: string;
  amount: number;
  currency: string;
  failureReason: string | null;
}

// ── Typed Events ──

export type OrderCreatedEvent = DomainEvent<OrderCreatedPayload>;
export type PaymentInitiatedEvent = DomainEvent<PaymentInitiatedPayload>;
export type PaymentCompletedEvent = DomainEvent<PaymentCompletedPayload>;
export type PaymentFailedEvent = DomainEvent<PaymentFailedPayload>;
