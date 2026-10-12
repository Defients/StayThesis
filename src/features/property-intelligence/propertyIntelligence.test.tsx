import { describe, expect, it } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreProvider, useActingPartner } from '@/app/store/StoreContext';
import PropertyIntelligencePage from './PropertyIntelligencePage';

function renderAt(route: string, extra?: ReactNode) {
  return render(
    <StoreProvider>
      {extra}
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route
            path="property/:propertyId/:tab?"
            element={<PropertyIntelligencePage />}
          />
          <Route path="property" element={<PropertyIntelligencePage />} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
}

function ActAsPartnerB() {
  const { setActingPartner } = useActingPartner();
  useEffect(() => setActingPartner('partner-b'), [setActingPartner]);
  return null;
}

const row = (name: RegExp | string) =>
  screen.getByRole('row', { name: typeof name === 'string' ? name : name });

const cells = (r: HTMLElement) => within(r).getAllByRole('cell');

describe('Property Intelligence — underwriting', () => {
  it('editing Base ADR changes base after-financing but not conservative', async () => {
    const user = userEvent.setup();
    renderAt('/property/st-finalist/underwriting');
    const afRow = () => row(/after-financing cash flow/i);
    const before = cells(afRow()).map((c) => c.textContent);

    const adr = screen.getByLabelText('ADR');
    await user.clear(adr);
    await user.type(adr, '300');

    const after = cells(afRow()).map((c) => c.textContent);
    expect(after[1]).not.toBe(before[1]); // base column (order: upside, base, …)
    expect(after[2]).toBe(before[2]); // conservative unchanged
  });

  it('zero occupancy renders the operating margin as unavailable', async () => {
    const user = userEvent.setup();
    renderAt('/property/st-finalist/underwriting');
    const occ = screen.getByLabelText('Occupancy');
    await user.clear(occ);
    await user.type(occ, '0');

    const marginCells = cells(row(/operating margin/i));
    expect(marginCells[1]).toHaveTextContent(/unavailable/i); // base column
  });

  it('planned repayment beyond the promo warns about promo-expiry balance', async () => {
    const user = userEvent.setup();
    renderAt('/property/st-finalist/underwriting');
    const planned = screen.getByLabelText(/planned repayment/i);
    await user.clear(planned);
    await user.type(planned, '18');

    expect(
      await screen.findByText(/remains when the promotional period ends/i),
    ).toBeInTheDocument();
  });
});

describe('Property Intelligence — compliance', () => {
  it('conservative occupancy of zero flips the calculated gate and blocks the deal', async () => {
    const user = userEvent.setup();
    renderAt('/property/st-finalist/underwriting');
    await user.click(screen.getByRole('radio', { name: /conservative/i }));
    const occ = screen.getByLabelText('Occupancy');
    await user.clear(occ);
    await user.type(occ, '0');

    await user.click(screen.getByRole('tab', { name: /compliance/i }));

    const gateGroup = screen.getByRole('radiogroup', {
      name: /conservative-case performance/i,
    });
    expect(
      within(gateGroup).getByRole('radio', { name: /fail/i }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(
      screen.getByText('Blocked by a failed critical gate'),
    ).toBeInTheDocument();
  });

  it('calculated gate controls are disabled', () => {
    renderAt('/property/st-finalist/compliance');
    for (const name of [/capital feasibility/i, /conservative-case performance/i]) {
      const group = screen.getByRole('radiogroup', { name });
      for (const radio of within(group).getAllByRole('radio'))
        expect(radio).toBeDisabled();
    }
  });

  it('finalist: insurance FAIL blocks, PASS restores QUALIFIED', async () => {
    const user = userEvent.setup();
    renderAt('/property/st-finalist/compliance');
    const group = screen.getByRole('radiogroup', {
      name: /str-appropriate insurance/i,
    });

    await user.click(within(group).getByRole('radio', { name: /^fail$/i }));
    expect(
      screen.getByText('Blocked by a failed critical gate'),
    ).toBeInTheDocument();

    await user.click(within(group).getByRole('radio', { name: /^pass$/i }));
    expect(
      screen.getByText(/eligible for acquisition approval/i),
    ).toBeInTheDocument();
  });

  it('awaiting-consent: clearing both landlord gates qualifies the deal', async () => {
    const user = userEvent.setup();
    renderAt('/property/st-consent-dayton/compliance');
    for (const name of [
      /landlord authorization/i,
      /lease permission/i,
    ]) {
      const group = screen.getByRole('radiogroup', { name });
      await user.click(within(group).getByRole('radio', { name: /^pass$/i }));
    }
    expect(
      screen.getByText(/eligible for acquisition approval/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Can be moved to Qualified.')).toBeInTheDocument();
  });
});

describe('Property Intelligence — evidence', () => {
  it('mark reviewed assigns the acting partner, writes audit, keeps classification', async () => {
    const user = userEvent.setup();
    renderAt('/property/st-finalist/evidence');
    const button = screen.getAllByRole('button', { name: /mark reviewed/i })[0]!;
    const card = button.closest('li')!;
    const classSelect = within(card).getByLabelText('Classification');
    const before = (classSelect as HTMLSelectElement).value;

    await user.click(button);

    expect(
      within(card).getByText(/reviewed by alex morgan/i),
    ).toBeInTheDocument();
    expect(within(card).getByText(/marked reviewed/i)).toBeInTheDocument();
    expect((classSelect as HTMLSelectElement).value).toBe(before);
  });
});

describe('Property Intelligence — decision', () => {
  it('partner-b approval + qualified stage shows Ready to acquire', async () => {
    const user = userEvent.setup();
    renderAt('/property/st-finalist/decision', <ActAsPartnerB />);

    await user.click(screen.getByRole('button', { name: /^approve$/i }));
    expect(screen.getAllByText('Approved')).toHaveLength(2);

    await user.selectOptions(screen.getByLabelText('Stage'), 'qualified');
    expect(
      await screen.findByText(/ready to acquire/i),
    ).toBeInTheDocument();
  });
});
