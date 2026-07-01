/**
 * domain-event.ts — Base Domain Event Shape
 *
 * Every domain event flowing through the EduLink event bus
 * MUST satisfy this interface.
 *
 * Phase 1 — Smart Domain Contracts Foundation
 */

export type DomainName =
  | "identity"
  | "hiring"
  | "training"
  | "trust"
  | "intelligence"
  | "admin";

export interface DomainEvent<TPayload = unknown> {
  event: string;
  domain: DomainName;
  version: 1;
  timestamp: string;
  payload: TPayload;
}

/** Factory helper to create a domain event with defaults */
export function createDomainEvent<TPayload>(
  domain: DomainName,
  event: string,
  payload: TPayload,
): DomainEvent<TPayload> {
  return {
    domain,
    event,
    version: 1,
    timestamp: new Date().toISOString(),
    payload,
  };
}
