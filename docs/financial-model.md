# StayThesis Financial Model — Specification (Phase 1)

Authoritative spec for `src/domain/finance/`. Types live in `src/domain/types.ts`.
All functions are pure and deterministic. The engine never rounds; rounding happens only at display.

## 1. Input sanitation

`sanitizeScenario`, `sanitizeStartup`, `sanitizeFinancing`, `sanitizeModel`:

- Non-finite numbers (`NaN`, `±Infinity`) → `0`; negative money/rates/counts → `0`. Emit `invalid-input-sanitized` when any value changed.
- `occupancyRate`, `discountRate`, `platformFeeRate`, `paymentProcessingRate`, `occupancyTaxRate` clamp to `[0, 1]`.
- `averageLengthOfStay < 1` (including 0) → `1` and emit `invalid-length-of-stay` (a stay is at least one night; we never divide by zero).
- `plannedRepaymentMonths < 1` → `1`. `promoMonths` floored to integer ≥ 0. `launchMonth` → integer modulo 12.
- `blockedNightsPerMonth` clamps to `[0, availableNights of that month]`.
- Missing/short seasonality → index `{occupancyIndex: 1, adrIndex: 1}` for missing months.

## 2. Calendar

Non-leap year: `[31,28,31,30,31,30,31,31,30,31,30,31]` (365 nights).
Projection month `p` (1..12) maps to calendar month `(launchMonth + p − 1) mod 12`.
`availableNights_m = daysInMonth_m − blockedNightsPerMonth` (≥ 0).

## 3. Monthly revenue and expenses (per projection month)

```
occ_m          = clamp(occupancyRate × occupancyIndex_m, 0, 1)
adr_m          = adr × adrIndex_m
bookedNights   = availableNights × occ_m
turnovers      = bookedNights / averageLengthOfStay        (fractional, not rounded)
accommodation  = bookedNights × adr_m
discounts      = accommodation × discountRate
cleaningFees   = turnovers × cleaningFeePerStay            (income)
ancillary      = turnovers × ancillaryRevenuePerStay
GBR            = accommodation + cleaningFees + ancillary − discounts
platformFees   = platformFeeRate × (accommodation − discounts + cleaningFees)
processingFees = paymentProcessingRate × ancillary         (platform fee already covers platform processing → no double count)
taxesPassThru  = occupancyTaxRate × (accommodation − discounts + cleaningFees)   (display only; NOT in GBR, NOT an expense)
cleaningExp    = turnovers × cleaningCostPerTurnover       (expense, never netted against cleaningFees)
laundryExp     = turnovers × laundryCostPerTurnover
suppliesExp    = turnovers × suppliesPerTurnover
fixed          = rent + utilities + internet + insurance + software + maintenance
                 + furnitureReplacement + permitLicense + otherFixed
operatingExp   = fixed + cleaningExp + laundryExp + suppliesExp
OCF            = GBR − platformFees − processingFees − operatingExp
debtPayment    = financing schedule payment for payment month p (0 if none)
afterFinCF     = OCF − debtPayment
```

Annual totals are the sum over the 12 projection months. `monthlyAverage.* = annual / 12`;
`recurringExpenses = (operatingExpenses + platformFees + processingFees) / 12`.

## 4. Capital

```
startupExpenses       = furnishing + equipment + locks + supplies + photography + permitSetup + contingency
creditEligibleStartup = startupExpenses           (rent, deposits and reserves must be cash)
nonRefundableStartup  = startupExpenses + firstMonthRent   (firstMonthRent = pre-launch setup month)
refundableDeposit     = securityDeposit           (cash requirement, never a P&L expense)
startupCashRequirement= nonRefundableStartup + refundableDeposit
operatingReserve      = reserveMonths × fixed     (fixed recurring obligations of that scenario; allocated liquidity, not a cost)
totalCommittedCapital = startupCashRequirement + operatingReserve
creditFunded          = min(creditFundedAmount, creditEligibleStartup)   → warn `credit-exceeds-eligible` if capped
cashFunded            = totalCommittedCapital − creditFunded
```

Reserve rationale: in the zero-booking case the obligations that continue are the fixed ones; variable
costs and platform fees only occur alongside the bookings that fund them.

## 5. Promotional credit schedule (`computeFinancing`)

```
upfrontFee       = creditFunded × upfrontFeeRate
openingBalance   = creditFunded + upfrontFee
scheduledPayment = openingBalance / plannedRepaymentMonths
for month m = 1..120 while balance > 1e-9:
  apr       = m ≤ promoMonths ? promoApr : postPromoApr
  interest  = balance × apr / 12           (accrues on opening balance of the month)
  payment   = min(scheduledPayment, balance + interest)
  closing   = balance + interest − payment
```
- `balanceAtPromoExpiry` = closing balance after month `promoMonths` (opening balance if promoMonths = 0); warn `promo-balance-remaining` if > 0.005.
- `postPromoInterest` = interest in months > promoMonths. `totalInterest` = all interest.
- `payoffMonth` = last month with a payment; `0` when openingBalance = 0 (empty schedule); `null` + `payoff-not-reached` if not cleared in 120 months.
- `requiredMonthlyToClearByPromo = openingBalance / promoMonths` (null if promoMonths = 0 or openingBalance = 0).
- Year-1 debt payments = payments for months 1..12. `yearOneFinancingCost = upfrontFee + interest(months 1..12)`.

A 0% promotional card is not free capital: the fee, the payoff obligation and post-promo exposure are always shown.

## 6. Returns, break-even and payback

- `operatingMargin = annual.OCF / annual.GBR` (null if GBR = 0).
- `revenueToRent = annual.GBR / (12 × rent)` (null if rent = 0).
- `cashOnCash = (annual.OCF − yearOneFinancingCost) / totalCommittedCapital` (null if denominator ≤ 0).
  Denominator includes credit-funded capital and the reserve, so leverage never inflates the return.
  Principal repayment is a return *of* capital, so it is not deducted from the numerator.
- `cashOnCashExReserve` = same numerator / `startupCashRequirement` (null if ≤ 0). Shown as secondary.
- **Operating break-even occupancy**: base `occupancyRate` (all else fixed, same seasonality and clamping)
  at which annual OCF = 0. Solve by bisection on the real annual function over [0, 1], 80 iterations.
  If OCF(0) ≥ 0 → `{occupancy: 0, status: 'always'}`; if OCF(1) < 0 → `{occupancy: null, status: 'not-achievable'}`.
- **After-financing break-even**: same, target annual OCF − year-1 debt payments = 0.
- **Startup investment recovery (payback)**: target = `nonRefundableStartup + upfrontFee`. Monthly net =
  `OCF_p − interest_p` where projection months repeat cyclically (month 13 = projection month 1) and interest
  comes from the financing schedule by payment month. `paybackMonths` = first month where cumulative net ≥ target
  (0 if target = 0). `null` if not reached within 60 months. The refundable deposit is not part of the target.

## 7. Test vectors (hand-computed independently of the implementation)

### Fixture F (flat seasonality: every index = 1; launchMonth 0; blocked 0; reserveMonths 3)

Scenario: adr 150, occupancy 0.60, ALOS 3, cleaningFee 100, ancillary 0, discount 0, platformFee 0.03,
processing 0, tax 0. Rent 1500, utilities 250, internet 70, insurance 80, software 50, maintenance 100,
furnitureReplacement 75, permitLicense 25, otherFixed 0 (fixed = 2,150). Cleaning 90, laundry 20, supplies 15 per turnover.
Startup: firstMonthRent 1500, deposit 1500, furnishing 3000, equipment 400, locks 250, supplies 300,
photography 250, permitSetup 200, contingency 300.
Financing: credit 3000, fee 0.03, promoApr 0, promoMonths 12, postPromoApr 0.24, planned 10.

| Output | Expected |
|---|---|
| annual bookedNights | 219 |
| annual turnovers | 73 |
| annual accommodation | 32,850 |
| annual cleaningFeesCollected | 7,300 |
| annual GBR | 40,150 |
| annual platformFees | 1,204.50 |
| annual cleaningExpense / laundry / supplies | 6,570 / 1,460 / 1,095 |
| annual fixedExpenses | 25,800 |
| annual operatingExpenses | 34,925 |
| annual OCF | 4,020.50 |
| January: booked / GBR / platform / OCF | 18.6 / 3,410 / 102.30 / 382.70 |
| February: booked / GBR / OCF | 16.8 / 3,080 / 137.60 |
| nonRefundableStartup / startupCashRequirement | 6,200 / 7,700 |
| operatingReserve / totalCommittedCapital | 6,450 / 14,150 |
| creditFunded / cashFunded | 3,000 / 11,150 |
| upfrontFee / openingBalance / scheduledPayment | 90 / 3,090 / 309 |
| payoffMonth / totalInterest / balanceAtPromoExpiry | 10 / 0 / 0 |
| annual debtPayments / afterFinancingCF | 3,090 / 930.50 |
| operating break-even occupancy | 0.519106 (= 25,800 / 49,700.8333) |
| after-financing break-even occupancy | 0.581278 (= 28,890 / 49,700.8333) |
| cashOnCash | 0.277774 (= 3,930.5 / 14,150) |
| cashOnCashExReserve | 0.510455 (= 3,930.5 / 7,700) |
| revenueToRent | 2.230556 (= 40,150 / 18,000) |
| operatingMargin | 0.100137 (= 4,020.5 / 40,150) |
| paybackMonths | 19 (cumulative OCF reaches 6,290.90 ≥ 6,290 in month 19) |

### Variants of F (one change each)

1. **Zero bookings** (occupancy 0): GBR 0, platformFees 0, annual OCF −25,800, operatingMargin null,
   revenueToRent 0, cashOnCash −1.829682 (= −25,890 / 14,150), paybackMonths null,
   operating break-even still 0.519106 (achievable).
2. **Full occupancy** (occupancy 1): booked 365, turnovers 121.6667, GBR 66,916.67, platformFees 2,007.50,
   operatingExpenses 41,008.33, OCF 23,900.83.
3. **Revenue below rent** (occupancy 0.2, rent 4000): GBR 13,383.33, revenueToRent 0.278819,
   annual OCF negative, operating break-even `{occupancy: null, status: 'not-achievable'}`.
4. **Seasonality** (Jan occupancyIndex 0.5; Jul occupancyIndex 1.5 and adrIndex 1.2; others 1):
   Jan OCF −883.65; Jul occupancy 0.9, ADR 180, GBR 5,952, platformFees 178.56, OCF 2,460.94; annual OCF 4,832.39.
5. **Clamping**: occupancy 0.8 with an index of 1.5 → effective monthly occupancy 1.0.
6. **Taxes pass-through** (occupancyTaxRate 0.10): taxesCollectedPassThrough 4,015; GBR still 40,150; OCF still 4,020.50.
7. **Discounts** (discountRate 0.10): discounts 3,285; GBR 36,865; platformFees 1,105.95.
8. **Ancillary + processing** (ancillary 30/stay, processing 0.03): ancillary 2,190; processingFees 65.70;
   platformFees unchanged at 1,204.50 (no double count).
9. **Deposit classification**: changing deposit 1500 → 2500 raises startupCashRequirement and totalCommittedCapital
   by 1,000; nonRefundableStartup, annual operatingExpenses, OCF and paybackMonths unchanged.
10. **Reserve**: reserveMonths 0 → operatingReserve 0, totalCommittedCapital 7,700; operatingExpenses unchanged.
11. **Credit cap**: creditFundedAmount 6000 → creditFunded 4,700 with `credit-exceeds-eligible`.
12. **Invalid denominators**: rent 0 → revenueToRent null; ALOS 0 → treated as 1 with `invalid-length-of-stay`;
    `NaN` adr → 0 with `invalid-input-sanitized`; all startup 0 + reserve 0 → cashOnCash null.

### Financing vector G (promo ends with balance remaining)

credit 6000, fee 0, promoApr 0, promoMonths 6, postPromoApr 0.24, planned 12 → scheduledPayment 500.

| Month | Interest | Closing balance |
|---|---|---|
| 6 | 0 | 3,000 |
| 7 | 60 | 2,560 |
| 8 | 51.20 | 2,111.20 |
| 12 | 14.204447 | 224.426776 |
| 13 | 4.488536 (payment 228.915312) | 0 |

balanceAtPromoExpiry 3,000 (`promo-balance-remaining`), requiredMonthlyToClearByPromo 1,000,
postPromoInterest = totalInterest = 228.915312, payoffMonth 13, year-1 interest 224.426776.

### Scenario independence

`computeAllScenarios(model)` returns four results; changing one scenario's input (via the pure
`updateScenarioField(model, key, field, value)`, which returns a new model and leaves the other three
scenario objects reference-equal) changes only that scenario's result.
