// Real roommate compatibility from the answers two tenants gave (0-100).
const closeness = (a, b, span) => 1 - Math.min(Math.abs(a - b), span) / span;

export function compatibility(me, other) {
  if ((me.sameGenderOnly || other.sameGenderOnly) && me.gender !== other.gender) return null;
  if (me.city !== other.city) return null;

  const budget = closeness(me.budget, other.budget, Math.max(me.budget, other.budget));
  const sleep = me.sleep === other.sleep ? 1 : me.sleep === 'flexible' || other.sleep === 'flexible' ? 0.65 : 0.1;
  const clean = closeness(me.clean, other.clean, 4);
  const social = closeness(me.social, other.social, 4);
  const smoke = me.smoker === other.smoker ? 1 : 0.15;
  const diet = me.diet === other.diet || me.diet === 'any' || other.diet === 'any' ? 1 : 0.4;

  const parts = [
    ['Similar budget', budget, 0.25],
    ['Matching sleep schedule', sleep, 0.2],
    ['Same cleanliness standard', clean, 0.2],
    ['Same smoking preference', smoke, 0.15],
    ['Compatible food habits', diet, 0.1],
    ['Similar social energy', social, 0.1],
  ];
  const score = Math.round(parts.reduce((s, [, v, w]) => s + v * w, 0) * 100);
  const reasons = parts.filter(([, v]) => v >= 0.85).map(([label]) => label);
  return { score, reasons };
}
