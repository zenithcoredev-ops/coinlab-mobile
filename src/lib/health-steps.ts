/** Mirrors Health Connect's `RecordingMethod.RECORDING_METHOD_MANUAL_ENTRY`. */
const RECORDING_METHOD_MANUAL_ENTRY = 3;

export type StepRecord = { count: number; metadata?: { recordingMethod?: number } };

/**
 * Steps that count towards rewards: the de-duplicated Health Connect total minus anything the
 * user typed in by hand. The aggregate already merges overlapping sources (phone + watch), so
 * we subtract manual entries instead of summing raw records, which would double count.
 */
export function verifiedSteps(aggregateTotal: number, records: StepRecord[]): number {
  const manual = records.reduce(
    (sum, r) => (r.metadata?.recordingMethod === RECORDING_METHOD_MANUAL_ENTRY ? sum + r.count : sum),
    0
  );
  return Math.max(0, Math.floor(aggregateTotal) - manual);
}

/** Fraction (0..1) of the daily step cap reached. */
export function stepsProgress(steps: number, capSteps: number): number {
  return capSteps > 0 ? Math.min(1, Math.max(0, steps / capSteps)) : 0;
}
