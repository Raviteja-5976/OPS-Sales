import type { SalesPlanInputs } from "./types";

export const DEFAULT_PLAN_INPUTS: SalesPlanInputs = {
  revenue_target: 300000,
  period_months: 6,
  acv: 15000,
  win_rate: 20,
  meeting_to_opp: 40,
  account_to_meeting: 10,
  sales_cycle_days: 60,
  sellers: 1,
  touches_per_account: 6,
};

export type FunnelResult = {
  deals: number;
  opportunities: number;
  meetings: number;
  accounts: number;
  weeks: number;
  sellingWeeks: number;
  accountsPerWeek: number;
  meetingsPerWeek: number;
  touchesPerWeek: number;
  touchesPerSellerPerWeek: number;
  pipelineCoverage: number;
  pipelineValue: number;
  warnings: string[];
};

/** Backwards funnel math: revenue → deals → opps → meetings → target accounts → weekly activity. */
export function computeFunnel(i: SalesPlanInputs): FunnelResult {
  const safe = (n: number, min = 0.0001) => (Number.isFinite(n) && n > min ? n : min);
  const deals = Math.ceil(i.revenue_target / safe(i.acv, 1));
  const opportunities = Math.ceil(deals / (safe(i.win_rate) / 100));
  const meetings = Math.ceil(opportunities / (safe(i.meeting_to_opp) / 100));
  const accounts = Math.ceil(meetings / (safe(i.account_to_meeting) / 100));
  const weeks = Math.max(1, Math.round((i.period_months * 52) / 12));
  // Deals must be sourced early enough to close inside the period.
  const cycleWeeks = Math.round(i.sales_cycle_days / 7);
  const sellingWeeks = Math.max(1, weeks - cycleWeeks);
  const accountsPerWeek = accounts / sellingWeeks;
  const meetingsPerWeek = meetings / sellingWeeks;
  const touchesPerWeek = accountsPerWeek * i.touches_per_account;
  const touchesPerSellerPerWeek = touchesPerWeek / Math.max(1, i.sellers);
  const pipelineValue = opportunities * i.acv;
  const pipelineCoverage = pipelineValue / safe(i.revenue_target, 1);

  const warnings: string[] = [];
  if (cycleWeeks >= weeks) warnings.push("Sales cycle is as long as the plan period — deals sourced now won't close in time.");
  if (sellingWeeks < weeks / 2) warnings.push("Over half the period is consumed by the sales cycle; front-load pipeline creation.");
  if (touchesPerSellerPerWeek > 250) warnings.push("Over 250 touches per seller per week — quality and deliverability will suffer. Add sellers, raise conversion, or extend the period.");
  if (i.win_rate > 40) warnings.push("Win rate above 40% is optimistic for new outbound; validate with your own data.");
  if (i.account_to_meeting > 20) warnings.push("More than 20% of cold accounts booking a meeting is optimistic; validate with a pilot campaign.");

  return {
    deals,
    opportunities,
    meetings,
    accounts,
    weeks,
    sellingWeeks,
    accountsPerWeek,
    meetingsPerWeek,
    touchesPerWeek,
    touchesPerSellerPerWeek,
    pipelineCoverage,
    pipelineValue,
    warnings,
  };
}
