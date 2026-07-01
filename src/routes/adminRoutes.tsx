import { Route } from "react-router-dom";
import Taxonomy from "@/pages/admin/Taxonomy";
import TrainingItems from "@/pages/admin/TrainingItems";
import TrainingItemEditor from "@/pages/admin/TrainingItemEditor";
import ProviderList from "@/pages/admin/ProviderList";
import ProviderDetail from "@/pages/admin/ProviderDetail";
import ProviderContent from "@/pages/admin/ProviderContent";
import AdminMentorReviews from "@/pages/admin/MentorReviews";
import IntelligenceBackfill from "@/pages/admin/IntelligenceBackfill";
import RecommendationDebug from "@/pages/admin/RecommendationDebug";

export const adminRoutes = (
  <>
    <Route path="/admin/taxonomy" element={<Taxonomy />} />
    <Route path="/admin/training" element={<TrainingItems />} />
    <Route path="/admin/training/new/:type" element={<TrainingItemEditor />} />
    <Route path="/admin/training/:id/edit" element={<TrainingItemEditor />} />
    <Route path="/admin/providers" element={<ProviderList />} />
    <Route path="/admin/providers/:id" element={<ProviderDetail />} />
    <Route path="/admin/provider-content" element={<ProviderContent />} />
    <Route path="/admin/mentor-reviews" element={<AdminMentorReviews />} />
    <Route path="/admin/intelligence-backfill" element={<IntelligenceBackfill />} />
    <Route path="/admin/debug/recommendations" element={<RecommendationDebug />} />
  </>
);
