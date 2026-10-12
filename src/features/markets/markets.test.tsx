import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreProvider } from '@/app/store/StoreContext';
import MarketsPage from './MarketsPage';
import PropertiesPage from '@/features/properties/PropertiesPage';

function renderAt(route: string) {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="markets" element={<MarketsPage />} />
          <Route path="properties" element={<PropertiesPage />} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
}

const bodyRows = () =>
  within(screen.getByRole('table')).getAllByRole('row').slice(1);

describe('Market Intelligence', () => {
  it('search filters the market rows', async () => {
    const user = userEvent.setup();
    renderAt('/markets');
    expect(bodyRows()).toHaveLength(7);

    await user.type(screen.getByRole('searchbox', { name: /search markets/i }), 'columbus');
    expect(bodyRows()).toHaveLength(2);

    await user.clear(screen.getByRole('searchbox', { name: /search markets/i }));
    await user.type(screen.getByRole('searchbox', { name: /search markets/i }), 'zzz');
    // Mobile cards + desktop table both render the empty state in jsdom.
    expect(screen.getAllByText(/no markets match/i).length).toBeGreaterThan(0);
  });

  it('clicking the City header sorts ascending', async () => {
    const user = userEvent.setup();
    renderAt('/markets');
    await user.click(screen.getByRole('button', { name: /^city$/i }));
    const first = bodyRows()[0]!;
    expect(within(first).getByText('Cincinnati')).toBeInTheDocument();
  });

  it('selecting a market row opens its detail panel', async () => {
    const user = userEvent.setup();
    renderAt('/markets');
    await user.click(
      within(screen.getByRole('table')).getByText('Dayton'),
    );
    expect(
      await screen.findByRole('heading', { name: /dayton, ohio/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /regulatory posture/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /view \d+ propert/i }),
    ).toBeInTheDocument();
  });

  it('"View properties" lands on the Explorer pre-filtered to that market', async () => {
    const user = userEvent.setup();
    renderAt('/markets?market=columbus-oh');
    await user.click(
      await screen.findByRole('link', { name: /view 3 properties in explorer/i }),
    );
    expect(
      await screen.findByText(/3 of 14 properties/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /property explorer/i }),
    ).toBeInTheDocument();
  });
});
