import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreProvider, useStore } from '@/app/store/StoreContext';
import CrmPage from './CrmPage';
import PropertyIntelligencePage from '@/features/property-intelligence/PropertyIntelligencePage';

/** Surfaces the store notice (normally rendered by AppLayout's toast). */
function NoticeProbe() {
  const { notice } = useStore();
  return notice ? <div data-testid="notice">{notice.message}</div> : null;
}

function renderAt(route = '/crm') {
  return render(
    <StoreProvider>
      <NoticeProbe />
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="crm" element={<CrmPage />} />
          <Route
            path="property/:propertyId/:tab?"
            element={<PropertyIntelligencePage />}
          />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
}

describe('Acquisition CRM — board', () => {
  it('moves a card via the Move to… control and column counts update', async () => {
    const user = userEvent.setup();
    renderAt();
    expect(
      screen.getByRole('region', { name: /discovered — 1 propert/i }),
    ).toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: /move fountain square flat to stage/i,
      }),
      'researching',
    );

    expect(
      screen.getByRole('region', { name: /discovered — 0 propert/i }),
    ).toBeInTheDocument();
    const researching = screen.getByRole('region', {
      name: /researching — 2 propert/i,
    });
    expect(
      within(researching).getByText('Fountain Square Flat'),
    ).toBeInTheDocument();
  });

  it('refuses to move a blocked property to Qualified and shows a notice', async () => {
    const user = userEvent.setup();
    renderAt();

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: /move uptown brick flat to stage/i,
      }),
      'qualified',
    );

    expect(screen.getByTestId('notice')).toHaveTextContent(/cannot qualify/i);
    // Card stays in Underwriting; Qualified remains empty.
    expect(
      screen.getByRole('region', { name: /qualified — 0 propert/i }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole('region', { name: /underwriting/i }),
      ).getByText('Uptown Brick Flat'),
    ).toBeInTheDocument();
  });

  it('hides the rejected column when Hide rejected is on', async () => {
    const user = userEvent.setup();
    renderAt();
    expect(
      screen.getByRole('region', { name: /rejected — 1 propert/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: /hide rejected/i }));
    expect(
      screen.queryByRole('region', { name: /rejected/i }),
    ).not.toBeInTheDocument();
  });
});

describe('Acquisition CRM — drawer', () => {
  it('opens the drawer from ?property= and supports notes, assignee, tasks and own-slot approval', async () => {
    const user = userEvent.setup();
    renderAt('/crm?property=st-consent-cbus');

    const drawer = await screen.findByRole('dialog', {
      name: /short north carriage flat details/i,
    });

    // Note
    await user.type(
      within(drawer).getByLabelText('Note text'),
      'Landlord open to a 12-month term',
    );
    await user.click(within(drawer).getByRole('button', { name: 'Add' }));
    expect(
      within(drawer).getByText('Landlord open to a 12-month term'),
    ).toBeInTheDocument();

    // Assignee — the first Assignee select is the workflow control.
    await user.selectOptions(
      within(drawer).getAllByLabelText('Assignee')[0]!,
      'partner-b',
    );
    expect(within(drawer).getAllByLabelText('Assignee')[0]).toHaveValue(
      'partner-b',
    );

    // Task
    await user.type(
      within(drawer).getByLabelText('New task'),
      'Call landlord about clause 8.2',
    );
    await user.type(within(drawer).getByLabelText('Due date'), '2026-10-20');
    await user.click(
      within(drawer).getByRole('button', { name: /add task/i }),
    );
    expect(
      within(drawer).getByRole('checkbox', {
        name: /call landlord about clause 8\.2/i,
      }),
    ).toBeInTheDocument();

    // Approval — acting partner (Alex) decides only their own slot; Sam's
    // slot stays read-only.
    const approveButtons = within(drawer).getAllByRole('button', {
      name: 'Approve',
    });
    expect(approveButtons.length).toBeGreaterThan(0);
    await user.click(approveButtons[0]!);
    expect(within(drawer).getByText(/pending/i)).toBeInTheDocument(); // Sam's slot
    expect(
      within(drawer).getAllByRole('button', { name: 'Approve' }).length,
    ).toBe(approveButtons.length); // no buttons appear for the other partner
  });

  it('generates an outreach draft with Phase 1 disclosure and a disabled Send', async () => {
    const user = userEvent.setup();
    renderAt('/crm?property=st-consent-dayton');
    const drawer = await screen.findByRole('dialog', {
      name: /oregon district flat details/i,
    });

    await user.click(
      within(drawer).getByRole('button', { name: /generate outreach draft/i }),
    );

    const draft = await screen.findByRole('dialog', {
      name: /outreach draft/i,
    });
    expect(
      within(draft).getByText(/no messages are sent in phase 1/i),
    ).toBeInTheDocument();
    expect(
      within(draft).getByRole('button', {
        name: /send — planned for phase 2/i,
      }),
    ).toBeDisabled();
    expect(
      within(draft).getByText(/sublet|short-term/i),
    ).toBeInTheDocument();
  });
});
