/**
 * Personalization Module — Public API
 *
 * Sprint 9: Personalization Layer
 */

export { classifyUserSegment, type UserSegment, type SegmentClassification } from "./user-segmentation";
export {
  getSegmentProfile,
  resolveSegmentConfig,
  getSegmentMessaging,
  type SegmentProfile,
  type SegmentMessaging,
  type SegmentConfigOverride,
} from "./segment-config-profiles";
