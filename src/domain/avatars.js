export const AVATAR_STAGES = ['start', 'current', 'target'];
export const DEFAULT_AVATAR_STAGES = Object.freeze({
  start: 1,
  current: 2,
  target: 3,
});
export const AVATAR_LEVELS = [1, 2, 3, 4, 5, 6];

export function validateAppearance(value) {
  if (!value || !['male', 'female', 'neutral'].includes(value.avatar))
    throw new Error('Elige un personaje ilustrativo válido.');
  const stages = value.avatarStages === undefined ? DEFAULT_AVATAR_STAGES : value.avatarStages;
  if (
    !stages ||
    typeof stages !== 'object' ||
    Array.isArray(stages) ||
    Object.keys(stages).length !== 3 ||
    !AVATAR_STAGES.every(
      (key) => Number.isInteger(stages[key]) && AVATAR_LEVELS.includes(stages[key]),
    )
  )
    throw new Error('Elige una de las seis complexiones para cada etapa.');
  return {
    avatar: value.avatar,
    avatarStages: Object.fromEntries(AVATAR_STAGES.map((key) => [key, stages[key]])),
  };
}

// Appearance is chosen by the user, independently of weight, height or sex.
export function avatarSprite(avatar, level) {
  if (avatar === 'neutral') return null;
  const female = avatar === 'female';
  return {
    file:
      level > 3
        ? `forja-stages-${female ? 'female' : 'male'}-light.webp`
        : female
          ? 'forja-stages-female.webp'
          : 'forja-stages.webp',
    position: `${((level - 1) % 3) * 50}% center`,
  };
}
