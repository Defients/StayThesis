import { lazy } from 'react';
import { HashRouter, Route, Routes } from 'react-router';
import { AppProvider } from './providers';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotFoundPage } from './NotFoundPage';

const CommandCenterPage = lazy(
  () => import('@/features/command-center/CommandCenterPage'),
);
const MarketsPage = lazy(() => import('@/features/markets/MarketsPage'));
const PropertiesPage = lazy(
  () => import('@/features/properties/PropertiesPage'),
);
const PropertyIntelligencePage = lazy(
  () => import('@/features/property-intelligence/PropertyIntelligencePage'),
);
const CrmPage = lazy(() => import('@/features/crm/CrmPage'));

/**
 * HashRouter: the app is static-hosted, so routing lives in the URL fragment
 * and never requires server rewrites.
 */
export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<CommandCenterPage />} />
            <Route path="markets" element={<MarketsPage />} />
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="property" element={<PropertyIntelligencePage />} />
            <Route
              path="property/:propertyId/:tab?"
              element={<PropertyIntelligencePage />}
            />
            <Route path="crm" element={<CrmPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
