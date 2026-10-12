import { describe, expect, it } from 'vitest';
import {
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreProvider } from '@/app/store/StoreContext';
import CommandCenterPage from './CommandCenterPage';
import CrmPage from '@/features/crm/CrmPage';
import PropertiesPage from '@/features/properties/PropertiesPage';
import PropertyIntelligencePage from '@/features/property-intelligence/PropertyIntelligencePage';

/** Test navigation controls — one App-level render, router-driven. */
function Nav() {
  const nav = useNavigate();
  return (
    <div>
      <button onClick={() => nav('/')}>nav: home</button>
      <button onClick={() => nav('/crm')}>nav: crm</button>
      <button onClick={() => nav('/properties')}>nav: explorer</button>
      <button onClick={() => nav('/property/st-std-indy')}>nav: property</button>
    </div>
  );
}

function renderApp() {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={['/crm']}>
        <Nav />
        <Routes>
          <Route index element={<CommandCenterPage />} />
          <Route path="crm" element={<CrmPage />} />
          <Route path="properties" element={<PropertiesPage />} />
          <Route
            path="property/:propertyId/:tab?"
            element={<PropertyIntelligencePage />}
          />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
}

describe('Cross-screen consistency', () => {
  it('moving a stage in the CRM updates the Command Center funnel and the property header stage', async () => {
    const user = userEvent.setup();
    renderApp();

    // CRM: move Fountain Square Flat from Discovered to Contacted.
    await user.selectOptions(
      screen.getByRole('combobox', {
        name: /move fountain square flat to stage/i,
      }),
      'contacted',
    );

    // Command Center: Discovery 4 → 3, Outreach 4 → 5.
    await user.click(screen.getByRole('button', { name: 'nav: home' }));
    const discovery = screen.getByRole('link', { name: /discovery:/i });
    expect(discovery).toHaveTextContent('3');
    const outreach = screen.getByRole('link', { name: /outreach:/i });
    expect(outreach).toHaveTextContent('5');

    // Property header: stage control reflects the move.
    await user.click(screen.getByRole('button', { name: 'nav: property' }));
    expect(await screen.findByLabelText('Stage')).toHaveValue('contacted');
  });

  it('saving a property in the Explorer increments the Command Center saved count', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: 'nav: explorer' }));
    await user.click(
      await screen.findByRole('button', { name: /save fountain square flat/i }),
    );

    await user.click(screen.getByRole('button', { name: 'nav: home' }));
    const saved = screen.getByRole('link', { name: /saved candidates/i });
    expect(within(saved).getByText('4')).toBeInTheDocument();
  });
});
