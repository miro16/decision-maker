export interface RankingOption {
  id: string;
}

export interface RankingCriterion {
  id: string;
  weight: number;
}

export interface RankingScore {
  optionId: string;
  criterionId: string;
  value: number;
}

export interface RankedOption {
  optionId: string;
  /** Sum of weight * value over the criteria that have a score. */
  total: number;
  scored: number;
  missing: number;
  /** True only when no criterion is missing a score. */
  complete: boolean;
  /** Equal totals share a rank; the next distinct total skips the tied group (1, 1, 3). */
  rank: number;
}

/**
 * Totals and ranks options from the scores that exist.
 *
 * A missing score adds nothing to the total and is counted as missing (it is not treated as 0).
 * Scores that reference an unknown option or criterion are ignored; for duplicate pairs the last one wins.
 * Options come back with the highest total first; ties keep their input order.
 *
 * Returns `null` when there are no scores at all ("no ranking").
 */
export function rankOptions(
  options: readonly RankingOption[],
  criteria: readonly RankingCriterion[],
  scores: readonly RankingScore[],
): RankedOption[] | null {
  const weights = new Map<string, number>();
  for (const criterion of criteria) {
    weights.set(criterion.id, criterion.weight);
  }

  const optionIds = new Set<string>();
  for (const option of options) {
    optionIds.add(option.id);
  }

  // optionId -> (criterionId -> value); the last score for a pair wins.
  const valuesByOption = new Map<string, Map<string, number>>();
  let scoreCount = 0;
  for (const score of scores) {
    if (!optionIds.has(score.optionId) || !weights.has(score.criterionId)) continue;

    let values = valuesByOption.get(score.optionId);
    if (!values) {
      values = new Map<string, number>();
      valuesByOption.set(score.optionId, values);
    }
    if (!values.has(score.criterionId)) scoreCount += 1;
    values.set(score.criterionId, score.value);
  }

  if (scoreCount === 0) return null;

  const totals = options.map((option) => {
    const values = valuesByOption.get(option.id);
    let total = 0;
    let scored = 0;
    if (values) {
      for (const [criterionId, value] of values) {
        total += (weights.get(criterionId) ?? 0) * value;
        scored += 1;
      }
    }
    const missing = weights.size - scored;
    return { optionId: option.id, total, scored, missing, complete: missing === 0 };
  });

  // Array.prototype.sort is stable, so ties keep their input order.
  totals.sort((a, b) => b.total - a.total);

  let rank = 0;
  return totals.map((entry, index) => {
    if (index === 0 || entry.total !== totals[index - 1].total) rank = index + 1;
    return { ...entry, rank };
  });
}
