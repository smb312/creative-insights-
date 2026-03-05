/**
 * Pacing calculation utility — compares month-to-date actuals vs monthly targets.
 */

export interface MonthlyTargets {
  revenueGoal: number | null;
  adSpendBudget: number | null;
  targetRoas: number | null;
  targetCpa: number | null;
  targetOrders: number | null;
  targetNewCac: number | null;
}

export interface MtdActuals {
  spend: number;
  conversions: number;
  conversionValue: number; // revenue
}

export interface SpendPacing {
  budget: number;
  spent: number;
  percentSpent: number;
  expectedSpend: number;
  isOverpacing: boolean;
  projectedMonthEnd: number;
  remainingBudget: number;
  remainingDailyBudget: number;
}

export interface RevenuePacing {
  goal: number;
  actual: number;
  percentAchieved: number;
  expectedRevenue: number;
  isOnTrack: boolean;
  projectedMonthEnd: number;
  remainingNeeded: number;
  requiredDailyRevenue: number;
}

export interface OrderPacing {
  goal: number;
  actual: number;
  percentAchieved: number;
  projectedMonthEnd: number;
}

export interface EfficiencyPacing {
  targetRoas: number;
  actualRoas: number;
  roasVsTarget: number;
  targetCpa: number;
  actualCpa: number;
  cpaVsTarget: number;
}

export type OverallStatus = "ahead" | "on_track" | "at_risk" | "behind";

export interface PacingResult {
  monthName: string;
  daysInMonth: number;
  daysElapsed: number;
  percentMonthElapsed: number;
  spendPacing: SpendPacing | null;
  revenuePacing: RevenuePacing | null;
  orderPacing: OrderPacing | null;
  efficiencyPacing: Partial<EfficiencyPacing>;
  overallStatus: OverallStatus;
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getDaysElapsed(date: Date): number {
  return date.getDate();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function calculatePacing(
  targets: MonthlyTargets,
  actuals: MtdActuals,
  now: Date = new Date()
): PacingResult {
  const daysInMonth = getDaysInMonth(now);
  const daysElapsed = getDaysElapsed(now);
  const percentMonthElapsed = daysElapsed / daysInMonth;
  const remainingDays = daysInMonth - daysElapsed;
  const monthName = MONTH_NAMES[now.getMonth()];

  // Spend pacing
  let spendPacing: SpendPacing | null = null;
  if (targets.adSpendBudget != null && targets.adSpendBudget > 0) {
    const budget = targets.adSpendBudget;
    spendPacing = {
      budget,
      spent: actuals.spend,
      percentSpent: actuals.spend / budget,
      expectedSpend: budget * percentMonthElapsed,
      isOverpacing: actuals.spend > budget * percentMonthElapsed,
      projectedMonthEnd: daysElapsed > 0 ? (actuals.spend / daysElapsed) * daysInMonth : 0,
      remainingBudget: budget - actuals.spend,
      remainingDailyBudget: remainingDays > 0 ? (budget - actuals.spend) / remainingDays : 0,
    };
  }

  // Revenue pacing
  let revenuePacing: RevenuePacing | null = null;
  if (targets.revenueGoal != null && targets.revenueGoal > 0) {
    const goal = targets.revenueGoal;
    const percentAchieved = actuals.conversionValue / goal;
    revenuePacing = {
      goal,
      actual: actuals.conversionValue,
      percentAchieved,
      expectedRevenue: goal * percentMonthElapsed,
      isOnTrack: percentAchieved >= percentMonthElapsed - 0.05,
      projectedMonthEnd: daysElapsed > 0 ? (actuals.conversionValue / daysElapsed) * daysInMonth : 0,
      remainingNeeded: goal - actuals.conversionValue,
      requiredDailyRevenue: remainingDays > 0 ? (goal - actuals.conversionValue) / remainingDays : 0,
    };
  }

  // Order pacing
  let orderPacing: OrderPacing | null = null;
  if (targets.targetOrders != null && targets.targetOrders > 0) {
    const goal = targets.targetOrders;
    orderPacing = {
      goal,
      actual: actuals.conversions,
      percentAchieved: actuals.conversions / goal,
      projectedMonthEnd: daysElapsed > 0 ? (actuals.conversions / daysElapsed) * daysInMonth : 0,
    };
  }

  // Efficiency pacing
  const efficiencyPacing: Partial<EfficiencyPacing> = {};
  const actualRoas = actuals.spend > 0 ? actuals.conversionValue / actuals.spend : 0;
  const actualCpa = actuals.conversions > 0 ? actuals.spend / actuals.conversions : 0;

  if (targets.targetRoas != null && targets.targetRoas > 0) {
    efficiencyPacing.targetRoas = targets.targetRoas;
    efficiencyPacing.actualRoas = actualRoas;
    efficiencyPacing.roasVsTarget = actualRoas - targets.targetRoas;
  }

  if (targets.targetCpa != null && targets.targetCpa > 0) {
    efficiencyPacing.targetCpa = targets.targetCpa;
    efficiencyPacing.actualCpa = actualCpa;
    efficiencyPacing.cpaVsTarget = targets.targetCpa - actualCpa; // positive = beating target
  }

  // Overall status
  const overallStatus = determineOverallStatus(
    revenuePacing,
    efficiencyPacing,
    percentMonthElapsed
  );

  return {
    monthName,
    daysInMonth,
    daysElapsed,
    percentMonthElapsed,
    spendPacing,
    revenuePacing,
    orderPacing,
    efficiencyPacing,
    overallStatus,
  };
}

function determineOverallStatus(
  revenuePacing: RevenuePacing | null,
  efficiencyPacing: Partial<EfficiencyPacing>,
  percentMonthElapsed: number
): OverallStatus {
  // If no revenue target, fall back to efficiency
  const revenuePacingRatio = revenuePacing
    ? revenuePacing.percentAchieved / percentMonthElapsed
    : 1;

  const cpaSeverityBad =
    efficiencyPacing.cpaVsTarget != null &&
    efficiencyPacing.targetCpa != null &&
    efficiencyPacing.targetCpa > 0
      ? -efficiencyPacing.cpaVsTarget / efficiencyPacing.targetCpa
      : 0;

  // "behind" — revenue < 80% of expected OR CPA 20%+ above target
  if (revenuePacingRatio < 0.8 || cpaSeverityBad > 0.2) {
    return "behind";
  }
  // "at_risk" — revenue 80-95% of expected OR CPA 10%+ above target
  if (revenuePacingRatio < 0.95 || cpaSeverityBad > 0.1) {
    return "at_risk";
  }
  // "ahead" — revenue > 105% AND efficiency on target
  if (revenuePacingRatio > 1.05 && cpaSeverityBad <= 0) {
    return "ahead";
  }
  // "on_track"
  return "on_track";
}

export function formatPacingForBrief(pacing: PacingResult, targets: MonthlyTargets): string {
  const lines: string[] = [];

  lines.push(
    `MONTHLY PACING (${pacing.monthName} — Day ${pacing.daysElapsed} of ${pacing.daysInMonth}):`
  );
  lines.push("");
  lines.push("Targets:");
  if (targets.revenueGoal) lines.push(`- Revenue goal: $${targets.revenueGoal.toLocaleString()}`);
  if (targets.adSpendBudget) lines.push(`- Ad spend budget: $${targets.adSpendBudget.toLocaleString()}`);
  if (targets.targetRoas) lines.push(`- Target ROAS: ${targets.targetRoas}x`);
  if (targets.targetCpa) lines.push(`- Target CPA: $${targets.targetCpa}`);
  if (targets.targetOrders) lines.push(`- Target orders: ${targets.targetOrders}`);
  lines.push("");

  lines.push("Month-to-Date Actuals:");
  if (pacing.revenuePacing) {
    lines.push(
      `- Revenue: $${pacing.revenuePacing.actual.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${(pacing.revenuePacing.percentAchieved * 100).toFixed(1)}% of goal)`
    );
  }
  if (pacing.spendPacing) {
    lines.push(
      `- Ad spend: $${pacing.spendPacing.spent.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${(pacing.spendPacing.percentSpent * 100).toFixed(1)}% of budget)`
    );
  }
  if (pacing.efficiencyPacing.actualRoas != null && targets.targetRoas) {
    lines.push(
      `- ROAS: ${pacing.efficiencyPacing.actualRoas.toFixed(2)}x (target: ${targets.targetRoas}x)`
    );
  }
  if (pacing.efficiencyPacing.actualCpa != null && targets.targetCpa) {
    lines.push(
      `- CPA: $${pacing.efficiencyPacing.actualCpa.toFixed(2)} (target: $${targets.targetCpa})`
    );
  }
  if (pacing.orderPacing) {
    lines.push(
      `- Orders: ${pacing.orderPacing.actual} (${(pacing.orderPacing.percentAchieved * 100).toFixed(1)}% of target)`
    );
  }
  lines.push("");

  lines.push("Projections (at current run rate):");
  if (pacing.revenuePacing) {
    lines.push(
      `- Projected month-end revenue: $${pacing.revenuePacing.projectedMonthEnd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    );
  }
  if (pacing.spendPacing) {
    lines.push(
      `- Projected month-end spend: $${pacing.spendPacing.projectedMonthEnd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    );
  }
  if (pacing.revenuePacing) {
    const remainingDays = pacing.daysInMonth - pacing.daysElapsed;
    lines.push(
      `- Revenue gap: $${pacing.revenuePacing.remainingNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })} needed in ${remainingDays} days`
    );
    lines.push(
      `- Required daily revenue: $${pacing.revenuePacing.requiredDailyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} to hit goal`
    );
  }
  if (pacing.spendPacing) {
    lines.push(
      `- Remaining daily budget: $${pacing.spendPacing.remainingDailyBudget.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    );
  }
  lines.push("");

  const statusLabel = {
    ahead: "AHEAD",
    on_track: "ON TRACK",
    at_risk: "AT RISK",
    behind: "BEHIND",
  }[pacing.overallStatus];

  lines.push(`Status: ${statusLabel}`);

  return lines.join("\n");
}
