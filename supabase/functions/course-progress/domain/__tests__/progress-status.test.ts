// Run: deno test supabase/functions/course-progress/
import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { applyAction, canApply } from "../progress-status.ts";
import { DomainError } from "../errors.ts";

Deno.test("start is only legal from not_started", () => {
  assertEquals(applyAction("start", "not_started"), "in_progress");
  assertThrows(() => applyAction("start", "in_progress"), DomainError);
  assertThrows(() => applyAction("start", "completed"), DomainError);
});

Deno.test("continue is only legal from in_progress", () => {
  assertEquals(applyAction("continue", "in_progress"), "in_progress");
  assertThrows(() => applyAction("continue", "not_started"), DomainError);
});

Deno.test("complete maps illegal transitions to specific error codes", () => {
  assertEquals(applyAction("complete", "in_progress"), "completed");

  const already = assertThrows(() => applyAction("complete", "completed"), DomainError) as DomainError;
  assertEquals(already.code, "conflict");

  const notStarted = assertThrows(() => applyAction("complete", "not_started"), DomainError) as DomainError;
  assertEquals(notStarted.code, "invalid_state");
});

Deno.test("canApply mirrors applyAction legality", () => {
  assertEquals(canApply("start", "not_started"), true);
  assertEquals(canApply("complete", "not_started"), false);
  assertEquals(canApply("complete", "in_progress"), true);
});
