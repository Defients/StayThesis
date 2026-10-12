import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreProvider } from '@/app/store/StoreContext';
import CommandCenterPage from './CommandCenterPage';
import PropertyIntelligencePage from '@/features/property-intelligence/PropertyIntelligencePage';

function renderAt(route = '/') {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route index element={<CommandCenterPage />} />
          <Route
            path="property/:propertyId/:tab?"
            element={<PropertyIntelligencePage />}
          />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
}

describe('Command Center', () => {
  it('renders seed KPIs and the derived top priority', () => {
    renderAt();
    expect(
      screen.getByRole('heading', { name: /good (morning|afternoon|evening),? joe/i }),
    ).toBeInTheDocument();
    // Seed: 5 active markets, 2 watchlist.
    expect(screen.getByText(/5 active · 2 watchlist/i)).toBeInTheDocument();
    // Seed: 3 saved properties, 13 non-rejected candidates.
    const saved = screen.getByRole('link', { name: /saved candidates/i });
    expect(within(saved).getByText('3')).toBeInTheDocument();
    const pipeline = screen.getByRole('link', {
      name: /pipeline candidates/i,
    });
    expect(within(pipeline).getByText('13')).toBeInTheDocument();
    // Top priority: finalist is gate-clean with Deffy's approval pending.
    expect(
      screen.getByText(/meets every gate — awaiting deffy's approval/i),
    ).toBeInTheDocument();
  });

  it('toggling a task updates the open-task list', async () => {
    const user = userEvent.setup();
    renderAt();
    const task = screen.getByRole('checkbox', {
      name: /weekly pipeline review/i,
    });
    await user.click(task);
    expect(
      screen.queryByRole('checkbox', { name: /weekly pipeline review/i }),
    ).not.toBeInTheDocument();
    // 7 open seed tasks → 6 after the toggle.
    expect(screen.getAllByRole('checkbox')).toHaveLength(6);
  });

  it('alert links navigate to the resolving property tab', async () => {
    const user = userEvent.setup();
    renderAt();
    const alert = screen.getByRole('link', {
      name: /hoa \/ building restrictions failed/i,
    });
    await user.click(alert);
    // Lands on the property's compliance tab.
    expect(
      await screen.findByRole('heading', { name: /uptown brick flat/i }),
    ).toBeInTheDocument();
  });
});
