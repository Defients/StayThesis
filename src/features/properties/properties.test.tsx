import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreProvider } from '@/app/store/StoreContext';
import PropertiesPage from './PropertiesPage';
import ComparePage from './ComparePage';

function renderAt(route: string) {
  return render(
    <StoreProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="properties" element={<PropertiesPage />} />
          <Route path="properties/compare" element={<ComparePage />} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
}

describe('Property Explorer', () => {
  it('filters by market and bedrooms, and reset restores the full list', async () => {
    const user = userEvent.setup();
    renderAt('/properties');
    expect(screen.getByText(/14 of 14 properties/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Market'), 'cleveland-oh');
    expect(screen.getByText(/3 of 14 properties/i)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Bedrooms'), '3');
    const filtered = screen.getByText(/of 14 properties/i).textContent ?? '';
    expect(filtered).not.toMatch(/3 of 14/);

    await user.click(
      screen.getAllByRole('button', { name: /reset filters/i })[0]!,
    );
    expect(screen.getByText(/14 of 14 properties/i)).toBeInTheDocument();
  });

  it('shows the empty state for an impossible filter', async () => {
    const user = userEvent.setup();
    renderAt('/properties');
    await user.type(screen.getByLabelText('Search'), 'zzz-no-such-place');
    expect(
      await screen.findByRole('heading', { name: /no properties match/i }),
    ).toBeInTheDocument();
  });

  it('toggles saved on a card', async () => {
    const user = userEvent.setup();
    renderAt('/properties');
    const save = screen.getAllByRole('button', { name: /^save /i })[0]!;
    expect(save).toHaveAttribute('aria-pressed', 'false');
    await user.click(save);
    expect(
      screen.getAllByRole('button', { name: /^unsave /i })[0]!,
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('compares two properties and the compare page shows both names', async () => {
    const user = userEvent.setup();
    renderAt('/properties');
    const cardHeadings = screen.getAllByRole('heading', { level: 3 });
    const names = [
      cardHeadings[0]!.textContent!,
      cardHeadings[1]!.textContent!,
    ];
    const compareButtons = screen.getAllByRole('button', {
      name: /^compare$/i,
    });
    await user.click(compareButtons[0]!);
    await user.click(compareButtons[1]!);

    expect(
      await screen.findByRole('region', { name: /compare selection/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /compare 2/i }));

    expect(
      await screen.findByRole('heading', { name: /compare properties/i }),
    ).toBeInTheDocument();
    for (const name of names) {
      expect(
        screen.getByRole('link', { name }),
      ).toBeInTheDocument();
    }
  });
});
