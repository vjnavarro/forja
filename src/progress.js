import { weights, sessions } from './demo.js';

export const initialWeight = weights[0].kg;
export const targetWeight = 78;
export const milestoneWeights = [84, 82, 80, targetWeight];
export const formatNumber = (value) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
    value,
  );
export const formatWeight = (value) => `${formatNumber(value)} kg`;

export function isValidWeight(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 30 && value <= 250;
}

export function normalizeDemo(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized = {};
  if (Array.isArray(value.weights)) {
    const records = value.weights
      .filter((record) => record && isValidWeight(record.kg))
      .map((record, index) => ({
        week:
          typeof record.week === 'string' && record.week.length <= 30
            ? record.week
            : `Sem ${index + 1}`,
        kg: record.kg,
      }));
    if (records.length) normalized.weights = records;
  }
  if (Array.isArray(value.completed)) {
    normalized.completed = [
      ...new Set(value.completed.filter((id) => sessions.some((session) => session.id === id))),
    ];
  }
  return normalized;
}

export function getProgress(records) {
  const current = records.at(-1).kg;
  const lost = +(initialWeight - current).toFixed(1);
  const total = +(initialWeight - targetWeight).toFixed(1);
  const remaining = +Math.max(0, current - targetWeight).toFixed(1);
  const progress = Math.max(0, Math.min(100, (lost / total) * 100));
  const milestones = milestoneWeights.map((kg) => ({ kg, reached: current <= kg }));
  const nextMilestone = milestones.find((milestone) => !milestone.reached);
  return {
    current,
    lost,
    total,
    remaining,
    progress,
    milestones,
    nextMilestone,
    percentChange: (lost / initialWeight) * 100,
  };
}
