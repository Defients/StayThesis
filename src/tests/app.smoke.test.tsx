import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from '@/app/App';

describe('App shell', () => {
  it('renders the sidebar with five destinations and navigates to Market Intelligence', async () => {
    const user = userEvent.setup();
    render(<App />);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(links.map((l) => l.textContent)).toEqual([
      '01Command Center',
      '02Market Intelligence',
      '03Property Explorer',
      '04Property Intelligence',
      '05Acquisition CRM',
    ]);

    await user.click(
      within(nav).getByRole('link', { name: /Market Intelligence/ }),
    );

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Market Intelligence',
      }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Market Intelligence — StayThesis');
  });
});
