import type { Market, Partner, Property } from '../types';

export interface OutreachDraftContent {
  subject: string;
  body: string;
}

/**
 * First-contact letter to a prospective landlord (demo generator).
 *
 * The copy is deliberately transparent: it presents the team as a furnished-
 * rental operator and explicitly discloses the intended use — short-term stays
 * under 30 nights and mid-term furnished stays of 30–90 nights — i.e. the
 * tenant operating and subletting the unit to guests, proceeding only with the
 * landlord's written authorization in the lease and in compliance with local
 * registration/permit rules.
 *
 * Demo rules: fictional property names only — never real addresses, never
 * landlord names, never claims of approvals.
 */
export function generateOutreachDraft(
  property: Property,
  market: Market,
  partner: Partner,
): OutreachDraftContent {
  const subject = `Proposal — furnished rental with written authorization: ${property.name}`;

  const body = [
    'Hello,',
    '',
    `I'm reaching out on behalf of a two-partner business establishing professionally managed furnished rentals in ${market.city}. We're interested in leasing ${property.name} (${property.bedrooms} bed / ${property.bathrooms} bath) on a standard lease, and I'd like to be fully transparent about how we intend to use the property.`,
    '',
    'Our intended use is guest accommodation: short-term stays (under 30 nights) and mid-term furnished stays (30–90 nights), primarily serving visiting professionals, medical staff, and families relocating to the area. In plain terms, this means our company — as the tenant — would operate the unit and sublet it to screened guests.',
    '',
    'We would proceed only with your written authorization in the lease (a sublet / short-term-rental clause you are comfortable with), and only in compliance with local registration and permit requirements. In return, we offer:',
    '',
    '• Professional cleaning between every stay',
    '• Guest screening and verified profiles on every booking',
    '• STR-appropriate liability insurance, naming you as an additional interest where the insurer allows',
    '• House rules enforced on every reservation (quiet hours, occupancy caps, no parties)',
    '• A single, responsive point of contact — no chasing multiple occupants',
    '',
    "We're happy to discuss rent, term, deposit, and any conditions that would make you comfortable with this arrangement. If the use doesn't fit your plans for the property, no hard feelings, and thank you for reading.",
    '',
    `Best,`,
    `${partner.name}`,
    `Furnished rental operations — ${market.city}, ${market.stateCode}`,
    '',
    '(Demo draft — fictional property; not sent. Simulated workflow only.)',
  ].join('\n');

  return { subject, body };
}
