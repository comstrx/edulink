/**
 * Explanation Item Builder — Shared Utility
 * Sprint 8H-B
 */

import type { ExplanationItem, ExplanationLevel } from "./explainabilityTypes";

export function resolveLevel(value: number, max: number): ExplanationLevel {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.7) return "positive";
  if (ratio >= 0.4) return "neutral";
  return "warning";
}

export function buildItem(opts: {
  key: string;
  label: string;
  value: number;
  maxValue: number;
  positiveMessage: string;
  neutralMessage: string;
  warningMessage: string;
  improvementHint?: string;
}): ExplanationItem {
  const level = resolveLevel(opts.value, opts.maxValue);
  const message =
    level === "positive"
      ? opts.positiveMessage
      : level === "neutral"
        ? opts.neutralMessage
        : opts.warningMessage;

  return {
    key: opts.key,
    label: opts.label,
    value: opts.value,
    maxValue: opts.maxValue,
    level,
    message,
    ...(level === "warning" && opts.improvementHint
      ? { improvementHint: opts.improvementHint }
      : {}),
  };
}

/** Pick top N items by value (descending) */
export function topItems(items: ExplanationItem[], n: number): ExplanationItem[] {
  return [...items].sort((a, b) => b.value - a.value).slice(0, n);
}

/** Pick bottom N items by value (ascending), only those with maxValue defined */
export function weakItems(items: ExplanationItem[], n: number): ExplanationItem[] {
  return [...items]
    .filter((i) => i.maxValue != null && i.maxValue > 0)
    .sort((a, b) => a.value / (a.maxValue ?? 1) - b.value / (b.maxValue ?? 1))
    .slice(0, n);
}

/** Build a deterministic summary from strongest/weakest dimensions */
export function buildSummary(items: ExplanationItem[]): string {
  const strong = topItems(items, 2).filter((i) => resolveLevel(i.value, i.maxValue ?? 1) === "positive");
  const weak = weakItems(items, 2).filter((i) => resolveLevel(i.value, i.maxValue ?? 1) === "warning");

  const strongStr = strong.map((i) => i.label.toLowerCase()).join(" and ");
  const weakStr = weak.map((i) => i.label.toLowerCase()).join(" and ");

  if (strong.length > 0 && weak.length > 0) {
    return `Strongest in ${strongStr}, but ${weakStr} ${weak.length === 1 ? "remains" : "remain"} a growth area.`;
  }
  if (strong.length > 0) {
    return `Strong performance across ${strongStr}.`;
  }
  if (weak.length > 0) {
    return `Improvement needed in ${weakStr}.`;
  }
  return "Score reflects moderate standing across all dimensions.";
}
