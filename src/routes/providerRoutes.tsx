import { Route } from "react-router-dom";
import ProviderDashboard from "@/pages/provider/ProviderDashboard";
import ProviderOrganization from "@/pages/provider/ProviderOrganization";
import ProviderCatalog from "@/pages/provider/ProviderCatalog";
import ProviderCatalogEditor from "@/pages/provider/ProviderCatalogEditor";
import ProviderTeam from "@/pages/provider/ProviderTeam";
import ProviderStart from "@/pages/provider/ProviderStart";

/** Setup routes — accessible to provider members before full readiness */
export const providerSetupRoutes = (
  <>
    <Route path="/app/provider/start" element={<ProviderStart />} />
    <Route path="/app/provider/organization" element={<ProviderOrganization />} />
  </>
);

/** Operational workspace routes — require active provider + entitlement */
export const providerRoutes = (
  <>
    <Route path="/app/provider/dashboard" element={<ProviderDashboard />} />
    <Route path="/app/provider/catalog" element={<ProviderCatalog />} />
    <Route path="/app/provider/catalog/new/:type" element={<ProviderCatalogEditor />} />
    <Route path="/app/provider/catalog/:id/edit" element={<ProviderCatalogEditor />} />
    <Route path="/app/provider/team" element={<ProviderTeam />} />
  </>
);
