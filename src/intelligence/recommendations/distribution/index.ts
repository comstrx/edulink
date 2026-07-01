export { SURFACE_CONTRACTS } from "./surface-contracts";
export type { SurfaceType, SurfaceContract, SurfaceOwnershipMode, SurfaceRecommendations } from "./surface-contracts";
export { distributeForSurface } from "./surface-distributor";
export { useSurfaceRecommendations } from "./useSurfaceRecommendations";
export type { SurfaceRecommendationsResult } from "./useSurfaceRecommendations";

// Per-surface typed distributions
export { distributeDashboard } from "./dashboard-distribution";
export type { DashboardDistribution } from "./dashboard-distribution";
export { distributeSkills } from "./skills-distribution";
export type { SkillsDistribution } from "./skills-distribution";
export { distributeContextBar } from "./contextbar-distribution";
export type { ContextBarDistribution } from "./contextbar-distribution";
export { distributeRecommendationsPage } from "./recommendations-page-distribution";
export type { RecommendationsPageDistribution } from "./recommendations-page-distribution";
