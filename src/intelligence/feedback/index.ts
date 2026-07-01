/**
 * Feedback module — public API
 */
export { recordFeedbackSignal } from "./feedback-signal.service";
export type { FeedbackSignalType, FeedbackSignalInput } from "./feedback-signal.service";
export { buildTeacherFeedbackSummary } from "./feedback-aggregation.service";
export type { TeacherFeedbackSummary } from "./feedback-aggregation.service";
