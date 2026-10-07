export const PHASE_COUNT = 4;
export const MAX_STAGE = 20 * PHASE_COUNT - 1;
export const IMMORTAL_STAGE = 9 * PHASE_COUNT;
export const DIVINE_STAGE = 16 * PHASE_COUNT;
export const legacyStage = (stage: number) =>
  Math.floor(stage / 3) * PHASE_COUNT + (stage % 3 === 2 ? 3 : stage % 3);
// Preserve existing costs and combat strength at Sơ/Trung/Đỉnh; Hậu lies between Trung and Đỉnh.
export const stagePower = (stage: number) =>
  Math.floor(stage / PHASE_COUNT) * 3 + [0, 1, 1.5, 2][stage % PHASE_COUNT];
