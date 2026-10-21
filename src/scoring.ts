import type { Ability, DeckAbilityScore, EventUnit, FielderStatus, PitcherStatus, Player, ScoreLine } from './types';

export const fielderLabels: [keyof FielderStatus, string][] = [
  ['meet', 'ミート'], ['power', 'パワー'], ['runPower', '走力'],
  ['shoulderPower', '肩力'], ['fielding', '守備力'], ['catching', '捕球'],
];
export const pitcherLabels: [keyof PitcherStatus, string][] = [
  ['ballControl', 'コントロール'], ['stamina', 'スタミナ'],
];

export const atLevel = (level: number, value: number) => {
  const raw = value * (0.5 + 0.01 * level);
  const lower = Math.floor(raw);
  const fraction = raw - lower;
  if (Math.abs(fraction - 0.5) < 1e-9) return lower % 2 === 0 ? lower : lower + 1;
  return Math.round(raw);
};

function fieldScore(value: number, mult = 1, label = ''): ScoreLine {
  let score = 5 * value - 5 + 5;
  for (const [threshold, points] of [[101, 105], [90, 55], [80, 55], [70, 30], [60, 15], [50, 15], [40, 10]]) {
    if (value >= threshold) score += points - 5;
  }
  return { label: `${label}(${value})`, score: Math.floor(score * mult) };
}

function roundDownToFive(value: number): number {
  return Math.floor(value / 5) * 5;
}

function pitcherScore(value: number, mult = 1, label = ''): ScoreLine {
  let score = 6 * value;
  for (const [threshold, points] of [[101, 126], [90, 66], [80, 66], [70, 36], [60, 18], [50, 18], [40, 12]]) {
    if (value >= threshold) score += points - 6;
  }
  return { label: `${label}(${value})`, score: Math.floor(score * mult) };
}

function speedScore(value: number, mult = 1): ScoreLine {
  const input = Math.min(value, 190);
  let score = 12 * (input - 100);
  for (const [threshold, points] of [[171, 132], [156, 72], [152, 72], [148, 42], [144, 24], [141, 24], [138, 18]]) {
    if (input >= threshold) score += points - 12;
  }
  return { label: `球速(${input})`, score: Math.floor(score * mult) };
}

function sumLowRank(abilities: Ability[], position?: number): Ability[] {
  return abilities.map((ability) => {
    const lower = abilities.filter((item) => item.groupId === ability.groupId && item.rank > 0 && item.rank <= ability.rank);
    const scoreForPosition = (item: Ability, kind: 'sateiMain' | 'sateiSub') => {
      const rate = position === undefined ? undefined : item.pos_rate?.find((entry) => entry.pos === position);
      return kind === 'sateiMain'
        ? rate?.sateiMain ?? rate?.score ?? item[kind]
        : rate?.sateiSub ?? rate?.scoreSub ?? item[kind];
    };
    return {
      ...ability,
      sateiMain: lower.reduce((sum, item) => sum + scoreForPosition(item, 'sateiMain'), 0),
      sateiSub: lower.reduce((sum, item) => sum + scoreForPosition(item, 'sateiSub'), 0),
      pf: lower.reduce((sum, item) => sum + (item.pf ?? 0), 0),
      fp: lower.reduce((sum, item) => sum + (item.fp ?? 0), 0),
    };
  });
}

function highestRankPerGroup(abilities: Ability[]): Ability[] {
  const groups = new Map<number, Ability>();
  for (const ability of abilities) {
    const current = groups.get(ability.groupId);
    if (!current || ability.rank > current.rank) groups.set(ability.groupId, ability);
  }
  return [...groups.values()];
}

const incompatibilities: Record<string, string> = {
  'パワーヒッター': 'ラインドライブ', 'アーチスト': 'ラインドライブ',
  'ローボールヒッター': 'ハイボールヒッター', '低球必打': '高球必打',
  'インコース◯': 'アウトコース◯', '内角必打': '外角必打',
  '広角打法': 'プルヒッター', '広角砲': '伝説の引っ張り屋',
  '対ストレート○': '対変化球○', 'ストレートキラー': '対変化球○',
  'ポーカーフェイス': '闘志', '鉄仮面': '闘魂',
};

function removeIncompatible(options: Ability[], withAbility: Ability, all: Ability[]): Ability[] {
  const counterpart = incompatibilities[withAbility.name];
  if (counterpart) {
    const group = all.find((item) => item.name === counterpart)?.groupId;
    if (group !== undefined) return options.filter((item) => item.groupId !== group);
  } else {
    const conflicting = options.find((item) => incompatibilities[item.name] === withAbility.name);
    if (conflicting) return options.filter((item) => item.groupId !== conflicting.groupId);
  }
  return options;
}

const positionRules: [string, number][] = [
  ['球界の頭脳', 2], ['キャッチャー◯', 2], ['至高の一塁手', 3], ['ファースト○', 3],
  ['至高の二塁手', 4], ['セカンド○', 4], ['至高の遊撃手', 5], ['ショート○', 5],
  ['至高の三塁手', 6], ['サード○', 6], ['至高の外野手', 7], ['アウトフィールダー○', 7],
];

function eligibleAbilities(player: Player, all: Ability[], isSub: boolean, subQuality: number): Ability[] {
  let candidates = all.filter((item) => item.playerType === (player.position === 1 ? 2 : 1));
  candidates = candidates.filter((item) => !player.abilities.some((owned) => owned.groupId === item.groupId && owned.rank >= item.rank));
  for (const ability of player.abilities) candidates = removeIncompatible(candidates, ability, all);
  const excludedIds = new Set(positionRules.filter(([name]) => all.some((a) => a.name === name)).flatMap(([name, position]) =>
    all.filter((item) => item.name === name && (position !== player.position)).map((item) => item.id)));
  candidates = candidates.filter((item) => !excludedIds.has(item.id));
  const redGroups = new Set(player.abilities.filter((item) => item.colorType === 1).map((item) => item.groupId));
  candidates = candidates.filter((item) => !(item.colorType === 2 && redGroups.has(item.groupId)));
  return sumLowRank(candidates, player.position);
}

export interface CalcOptions {
  player: Player;
  allAbilities: Ability[];
  eventUnits: EventUnit[];
  level: number;
  coachCount: number;
  usage: string;
  isBench?: boolean;
  fielderMax?: boolean;
  pitcherMax?: boolean;
  excludedUnits?: number[];
  selectedMastery?: number[];
  customStatus?: Partial<FielderStatus & PitcherStatus>;
}

type MasteryBonus = { type: number; level: number; f?: Partial<Record<keyof FielderStatus, number>>; p?: Partial<PitcherStatus> };
const mastery: MasteryBonus[] = [
  { type: 0, level: 1, f: { power: 7, runPower: 7 } }, { type: 1, level: 1, f: { runPower: 10 } },
  { type: 2, level: 1, f: { shoulderPower: 6, fielding: 6, catching: 6 } }, { type: 3, level: 1, p: { ballSpeed: 6, ballControl: 6, stamina: 6 } },
  { type: 0, level: 2, f: { power: 9, runPower: 9 } }, { type: 1, level: 2, f: { runPower: 15 } },
  { type: 2, level: 2, f: { shoulderPower: 8, fielding: 8, catching: 8 } }, { type: 3, level: 2, p: { ballSpeed: 8, ballControl: 8, stamina: 8 } },
  { type: 0, level: 3, f: { power: 11, runPower: 11 } }, { type: 1, level: 3, f: { runPower: 20 } },
  { type: 2, level: 3, f: { shoulderPower: 10, fielding: 10, catching: 10 } }, { type: 3, level: 3, p: { ballSpeed: 10, ballControl: 10, stamina: 10 } },
  { type: 0, level: 4, f: { power: 13, runPower: 13 } }, { type: 1, level: 4, f: { runPower: 25 } },
  { type: 2, level: 4, f: { shoulderPower: 12, fielding: 12, catching: 12 } }, { type: 3, level: 4, p: { ballSpeed: 12, ballControl: 12, stamina: 12 } },
];

type PriorityScore = { first: number; second: number; third: number };

function comparePriorityScore(a: PriorityScore, b: PriorityScore): number {
  return a.first - b.first || a.second - b.second || a.third - b.third;
}

function scoreDeckStatus(position: number, f: FielderStatus, p: PitcherStatus, limits: Record<string, number>, pitcherLimits: PitcherStatus): PriorityScore {
  const fielderScore = fielderLabels.reduce((sum, [key]) => sum + fieldScore(f[key] + Math.min(limits[key] ?? 0, 50)).score, 0);
  if (position === 1) {
    const controlStaminaScore = fieldScore(p.ballControl + Math.min(pitcherLimits.ballControl, 50)).score
      + fieldScore(p.stamina + Math.min(pitcherLimits.stamina, 50)).score;
    const speed = speedScore(p.ballSpeed + Math.min(pitcherLimits.ballSpeed, 50)).score;
    return { first: controlStaminaScore, second: fielderScore, third: speed };
  }
  return { first: fielderScore, second: 0, third: 0 };
}

function addUnitLimits(unit: EventUnit, limits: Record<string, number>, pitcherLimits: PitcherStatus): void {
  for (const key of Object.keys(limits)) limits[key] += unit.limit[key as keyof typeof unit.limit] ?? 0;
  pitcherLimits.ballSpeed += unit.limit.ballSpeed ?? 0;
  pitcherLimits.ballControl += unit.limit.ballControl ?? 0;
  pitcherLimits.stamina += unit.limit.stamina ?? 0;
}

function projectedStatusScore(
  unit: EventUnit,
  position: number,
  f: FielderStatus,
  p: PitcherStatus,
  limits: Record<string, number>,
  pitcherLimits: PitcherStatus,
): PriorityScore {
  const nextField = { ...limits };
  const nextPitcher = { ...pitcherLimits };
  addUnitLimits(unit, nextField, nextPitcher);
  return scoreDeckStatus(position, f, p, nextField, nextPitcher);
}

function usefulLimitGain(unit: EventUnit, position: number, limits: Record<string, number>, pitcherLimits: PitcherStatus): PriorityScore {
  let fielderGain = 0;
  for (const key of Object.keys(limits)) {
    fielderGain += Math.min(Math.max(0, 50 - limits[key]), unit.limit[key as keyof typeof unit.limit] ?? 0);
  }
  if (position === 1) {
    const controlStaminaGain = Math.min(Math.max(0, 50 - pitcherLimits.ballControl), unit.limit.ballControl ?? 0)
      + Math.min(Math.max(0, 50 - pitcherLimits.stamina), unit.limit.stamina ?? 0);
    const speedGain = Math.min(Math.max(0, 50 - pitcherLimits.ballSpeed), unit.limit.ballSpeed ?? 0);
    return { first: controlStaminaGain, second: fielderGain, third: speedGain };
  }
  return { first: fielderGain, second: 0, third: 0 };
}

function evaluatePlayer(player: Player, all: Ability[], f: FielderStatus, p: PitcherStatus, limits: Record<string, number>, pitcherLimits: PitcherStatus, abilities: Ability[], options: CalcOptions): ScoreLine[] {
  const lines: ScoreLine[] = [];
  const bench = options.isBench ?? false;
  const pitcher = player.position === 1;
  const subQuality = options.usage === 'サブポジ' ? 0 : options.usage === 'サブポジ〇' ? 1 : 2;
  const subpositionRate = options.usage === 'サブポジ' ? 0.8 : options.usage === 'サブポジ〇' ? 0.9 : 1;
  if (pitcher) {
    lines.push({ label: `弾道(${player.status?.dandou ?? 1})`, score: Math.floor(((player.status?.dandou ?? 1) - 1) * 50 / 5) });
    for (const [key, label] of fielderLabels) lines.push(fieldScore((options.fielderMax ? 50 : Math.min(limits[key] ?? 0, 50)) + f[key], 0.2, label));
    lines.push(speedScore((options.pitcherMax ? 50 : Math.min(pitcherLimits.ballSpeed, 50)) + p.ballSpeed, bench ? 0.5 : 1));
    lines.push(pitcherScore((options.pitcherMax ? 50 : Math.min(pitcherLimits.ballControl, 50)) + p.ballControl, bench ? 0.5 : 1, 'コントロール'));
    lines.push(pitcherScore((options.pitcherMax ? 50 : Math.min(pitcherLimits.stamina, 50)) + p.stamina, bench ? 0.5 : 1, 'スタミナ'));
    const curveTotal = options.pitcherMax ? player.curves.filter((c) => c.amount !== 0).length * 7 + player.curves.filter((c) => c.amount === 0).length : atLevel(options.level, player.curves.reduce((sum, c) => sum + (c.amount === 0 ? 1 : c.amount), 0));    lines.push({ label: `変化(${curveTotal})`, score: Math.floor(curveTotal * 24 * (bench ? 0.5 : 1)) });
  } else {
    lines.push({ label: `弾道(${player.status?.dandou ?? 1})`, score: Math.floor(((player.status?.dandou ?? 1) - 1) * 50 * (bench ? 0.2 : 1)) });
    for (const [key, label] of fielderLabels) {
      const limit = options.fielderMax ? 50 : Math.min(limits[key] ?? 0, 50);
      const multiplier = !bench ? 1 : key === 'runPower' ? 0.4 : 0.2;
      const score = fieldScore(limit + f[key], multiplier, label);
      const subpositionAdjusted = ['shoulderPower', 'fielding', 'catching'].includes(key)
        && options.usage !== 'スタメン';
      lines.push(subpositionAdjusted
        ? { ...score, score: roundDownToFive(score.score * subpositionRate) }
        : score);
    }
  }

  const bestByGroup = new Map<number, Ability>();
  for (const ability of [...player.abilities, ...abilities]) {
    const current = bestByGroup.get(ability.groupId);
    if (!current || current.rank < ability.rank) bestByGroup.set(ability.groupId, ability);
  }
  const fullTable = sumLowRank(all, player.position);
  for (const ability of bestByGroup.values()) {
    if (ability.name === '調子安定') {
      const value = pitcher ? (bench ? 3 : 6) : (bench ? 4 : 15);
      if (value) lines.push({ label: ability.name, score: value, ability: { ...ability, sateiMain: value, sateiSub: value } });
      continue;
    }
    const row = fullTable.find((item) => item.id === ability.id);
    if (!row) continue;
    const type = pitcher ? 2 : 1;
    let value = bench ? Math.trunc(row.sateiSub) : Math.trunc(row.sateiMain);
    const positionRate = row.pos_rate?.find((rate) => rate.pos === player.position);
    if (row.playerType !== type && !positionRate) value = Math.trunc(type === 1 ? row.pf ?? 0 : row.fp ?? 0);
    if (value) lines.push({ label: ability.name, score: value, ability: row });
  }
  return lines;
}

export interface CalculationResult {
  score: number;
  normalScore: number;
  lines: ScoreLine[];
  benchScore: number;
  fielderLimit: Record<string, number>;
  pitcherLimit: PitcherStatus;
  decks: { units: { id: number; name: string; ability?: Ability; supexp?: boolean }[]; abilities: DeckAbilityScore[] }[];
}

export function calculate(options: CalcOptions): CalculationResult {
  const { player, allAbilities: all, eventUnits, level } = options;
  const count = Math.max(0, Math.min(options.coachCount, 4));
  const usage = options.usage;
  const subQuality = usage === 'サブポジ' ? 0 : usage === 'サブポジ〇' ? 1 : 2;
  const baseF: FielderStatus = {
    dandou: player.status?.dandou ?? 1,
    meet: atLevel(level, player.status?.meet ?? 0), power: atLevel(level, player.status?.power ?? 0),
    runPower: atLevel(level, player.status?.runPower ?? 0), shoulderPower: atLevel(level, player.status?.shoulderPower ?? 0),
    fielding: atLevel(level, player.status?.fielding ?? 0), catching: atLevel(level, player.status?.catching ?? 0),
  };
  const baseP: PitcherStatus = {
    ballSpeed: player.pitcherStatus ? 100 + atLevel(level, player.pitcherStatus.ballSpeed - 100) : 120,
    ballControl: atLevel(level, player.pitcherStatus?.ballControl ?? 0),
    stamina: atLevel(level, player.pitcherStatus?.stamina ?? 0),
  };
  for (const [key, value] of Object.entries(options.customStatus ?? {})) {
    if (key in baseF) (baseF as unknown as Record<string, number>)[key] = value;
    if (key in baseP) (baseP as unknown as Record<string, number>)[key] = value;
  }

  const fLimit: Record<string, number> = Object.fromEntries(fielderLabels.map(([key]) => [key, 0]));
  const pLimit: PitcherStatus = { ballSpeed: 0, ballControl: 0, stamina: 0 };
  const bestMastery = new Map<number, MasteryBonus>();
  for (const idx of options.selectedMastery ?? []) {
    const add = mastery[idx];
    if (!add) continue;
    const current = bestMastery.get(add.type);
    if (!current || add.level > current.level) bestMastery.set(add.type, add);
  }
  for (const add of bestMastery.values()) {
    if (add.f) for (const [key, val] of Object.entries(add.f)) fLimit[key] += val ?? 0;
    if (add.p) for (const [key, val] of Object.entries(add.p)) pLimit[key as keyof PitcherStatus] += val;
  }
  const availableUnits = eventUnits.filter((unit) => !(options.excludedUnits ?? []).includes(unit.id));
  // Keep the displayed gold ability separate from the event unit's own ability list.
  // EventUnit.abilities describes what a card can grant; it is not the ability
  // assigned to that card in this particular deck.
  const decks: { id: number; name: string; fixedAbility?: Ability; fixed: boolean; supexp?: boolean }[][] = Array.from({ length: count }, () => []);
  const chosenAbilities: Ability[][] = Array.from({ length: count }, () => []);
  const cards: Set<number>[] = Array.from({ length: count }, () => new Set());
  const deckOrgs: Set<number>[] = Array.from({ length: count }, () => new Set());
  const orgKey = (unit: EventUnit) => unit.org ?? unit.id;
  const pickCounts = new Map<number, number>();
  const addCard = (coach: number, unit: EventUnit, fixed: boolean, ability?: Ability) => {
    cards[coach].add(unit.id);
    deckOrgs[coach].add(orgKey(unit));
    decks[coach].push({ id: unit.id, name: unit.name, fixed, fixedAbility: ability, supexp: unit.supexp });
    pickCounts.set(unit.id, (pickCounts.get(unit.id) ?? 0) + 1);
    addUnitLimits(unit, fLimit, pLimit);
  };
  let candidate = eligibleAbilities(player, all, usage !== 'スタメン', subQuality);
  const comparator = (a: Ability, b: Ability) => (options.isBench ? b.sateiSub - a.sateiSub : b.sateiMain - a.sateiMain);
  let golds = highestRankPerGroup(candidate.filter((a) => a.colorType === 3)).sort(comparator);
  for (let coach = 0; coach < count; coach++) {
    for (let slot = 0; slot < 2; slot++) {
      let selected: { ability: Ability; provider: EventUnit } | undefined;
      for (const ability of golds) {
        const provider = availableUnits
          .filter((unit) => unit.abilities.some((owned) => owned.id === ability.id) && !cards[coach].has(unit.id) && !deckOrgs[coach].has(orgKey(unit)))
          .sort((a, b) => comparePriorityScore(usefulLimitGain(b, player.position, fLimit, pLimit), usefulLimitGain(a, player.position, fLimit, pLimit))
            || comparePriorityScore(projectedStatusScore(b, player.position, baseF, baseP, fLimit, pLimit), projectedStatusScore(a, player.position, baseF, baseP, fLimit, pLimit))
            || a.id - b.id)[0];
        if (provider) { selected = { ability, provider }; break; }
      }
      if (!selected) break;
      addCard(coach, selected.provider, true, selected.ability);
      chosenAbilities[coach].push(selected.ability);
      candidate = candidate.filter((item) => item.groupId !== selected!.ability.groupId);
      golds = removeIncompatible(golds.filter((item) => item.groupId !== selected!.ability.groupId), selected.ability, all);
    }
  }
  const intimidation = all.find((ability) => ability.id === (player.position === 1 ? 301 : 118));
  if (intimidation && count > 0 && candidate.some((ability) => ability.id === intimidation.id)) {
    const coach = 0;
    const provider = availableUnits
      .filter((unit) => unit.abilities.some((owned) => owned.id === intimidation.id) && !cards[coach].has(unit.id) && !deckOrgs[coach].has(orgKey(unit)))
      .sort((a, b) => comparePriorityScore(usefulLimitGain(b, player.position, fLimit, pLimit), usefulLimitGain(a, player.position, fLimit, pLimit))
        || comparePriorityScore(projectedStatusScore(b, player.position, baseF, baseP, fLimit, pLimit), projectedStatusScore(a, player.position, baseF, baseP, fLimit, pLimit))
        || a.id - b.id)[0];
    if (provider) {
      addCard(coach, provider, true, intimidation);
      chosenAbilities[coach].push(intimidation);
      candidate = candidate.filter((item) => item.groupId !== intimidation.groupId);
    }
  }
  // Reserve one supexp character in every deck. These are fixed cards and
  // cannot be removed by the later 50-cap replacement pass.
  const supexpLimitSum = (unit: EventUnit) =>
    [...fielderLabels.map(([key]) => unit.limit[key] ?? 0), unit.limit.ballSpeed ?? 0, unit.limit.ballControl ?? 0, unit.limit.stamina ?? 0]
      .reduce((sum, value) => sum + value, 0);
  for (let coach = 0; coach < count; coach++) {
    const provider = availableUnits
      .filter((unit) => unit.supexp === true && !cards[coach].has(unit.id) && !deckOrgs[coach].has(orgKey(unit)) && (pickCounts.get(unit.id) ?? 0) < count)
      .sort((a, b) => supexpLimitSum(b) - supexpLimitSum(a)
        || comparePriorityScore(usefulLimitGain(b, player.position, fLimit, pLimit), usefulLimitGain(a, player.position, fLimit, pLimit))
        || a.id - b.id)[0];
    if (provider) addCard(coach, provider, false);
  }
  let blues = highestRankPerGroup(candidate.filter((a) => a.colorType === 2)).sort(comparator);
  for (let coach = 0; coach < count; coach++) {
    let slots = Math.max(0, 5 - chosenAbilities[coach].length);
    while (slots > 0 && blues.length) {
      const ability = blues.shift()!;
      chosenAbilities[coach].push(ability);
      slots--;
      blues = removeIncompatible(blues, ability, all).filter((item) => item.groupId !== ability.groupId);
    }
  }

  // Fill in descending total-cap order. Each character can be used up to the
  // coach count across all decks, and at most once in any single deck.
  const rawLimitSum = (unit: EventUnit) =>
    [...fielderLabels.map(([key]) => unit.limit[key] ?? 0), unit.limit.ballSpeed ?? 0, unit.limit.ballControl ?? 0, unit.limit.stamina ?? 0]
      .reduce((sum, value) => sum + value, 0);
  const rankedUnits = [...availableUnits].sort((a, b) => rawLimitSum(b) - rawLimitSum(a) || a.id - b.id);
  for (;;) {
    let added = false;
    const coachOrder = Array.from({ length: count }, (_, i) => i).sort((a, b) => decks[a].length - decks[b].length || a - b);
    for (const coach of coachOrder) {
      if (decks[coach].length >= 9) continue;
      const unit = rankedUnits.find((item) => item.supexp !== true
        && (pickCounts.get(item.id) ?? 0) < count && !cards[coach].has(item.id) && !deckOrgs[coach].has(orgKey(item)));
      if (!unit) continue;
      addCard(coach, unit, false);
      added = true;
    }
    if (!added) break;
  }

  // Replace flexible cards if another card improves the capped total limits.
  let improved = true;
  while (improved) {
    improved = false;
    const baseline = scoreDeckStatus(player.position, baseF, baseP, fLimit, pLimit);
    let best: { coach: number; index: number; outgoing: EventUnit; incoming: EventUnit; score: PriorityScore; gain: PriorityScore } | undefined;
    for (let coach = 0; coach < count; coach++) for (let index = 0; index < decks[coach].length; index++) {
      const card = decks[coach][index];
      if (card.fixed) continue;
      const outgoing = availableUnits.find((unit) => unit.id === card.id);
      if (!outgoing) continue;
      const reducedField = { ...fLimit };
      const reducedPitcher = { ...pLimit };
      for (const key of Object.keys(reducedField)) reducedField[key] -= outgoing.limit[key as keyof typeof outgoing.limit] ?? 0;
      reducedPitcher.ballSpeed -= outgoing.limit.ballSpeed ?? 0;
      reducedPitcher.ballControl -= outgoing.limit.ballControl ?? 0;
      reducedPitcher.stamina -= outgoing.limit.stamina ?? 0;
      const outgoingGain = usefulLimitGain(outgoing, player.position, reducedField, reducedPitcher);
      const otherDeckOrgs = new Set(deckOrgs[coach]);
      otherDeckOrgs.delete(orgKey(outgoing));
      for (const incoming of rankedUnits) {
        if (incoming.id === outgoing.id || (incoming.supexp === true) !== (outgoing.supexp === true)
          || orgKey(incoming) === orgKey(outgoing) || cards[coach].has(incoming.id) || otherDeckOrgs.has(orgKey(incoming))
          || (pickCounts.get(incoming.id) ?? 0) >= count) continue;
        const nextField = { ...reducedField };
        const nextPitcher = { ...reducedPitcher };
        addUnitLimits(incoming, nextField, nextPitcher);
        const score = scoreDeckStatus(player.position, baseF, baseP, nextField, nextPitcher);
        const gain = usefulLimitGain(incoming, player.position, reducedField, reducedPitcher);
        const scoreOrder = comparePriorityScore(score, baseline);
        const gainOrder = comparePriorityScore(gain, outgoingGain);
        if ((scoreOrder > 0 || (scoreOrder === 0 && gainOrder > 0))
          && (!best || scoreOrder > 0 && comparePriorityScore(score, best.score) > 0
            || comparePriorityScore(score, best.score) === 0 && comparePriorityScore(gain, best.gain) > 0)) {
          best = { coach, index, outgoing, incoming, score, gain };
        }
      }
    }
    if (!best) continue;
    const { coach, index, outgoing, incoming } = best;
    for (const key of Object.keys(fLimit)) fLimit[key] -= outgoing.limit[key as keyof typeof outgoing.limit] ?? 0;
    pLimit.ballSpeed -= outgoing.limit.ballSpeed ?? 0;
    pLimit.ballControl -= outgoing.limit.ballControl ?? 0;
    pLimit.stamina -= outgoing.limit.stamina ?? 0;
    cards[coach].delete(outgoing.id);
    deckOrgs[coach].delete(orgKey(outgoing));
    pickCounts.set(outgoing.id, (pickCounts.get(outgoing.id) ?? 1) - 1);
    cards[coach].add(incoming.id);
    deckOrgs[coach].add(orgKey(incoming));
    pickCounts.set(incoming.id, (pickCounts.get(incoming.id) ?? 0) + 1);
    decks[coach][index] = { id: incoming.id, name: incoming.name, fixed: false, supexp: incoming.supexp };
    addUnitLimits(incoming, fLimit, pLimit);
    improved = true;
  }
  const abilityRows = chosenAbilities.flat();
  const lines = evaluatePlayer(player, all, baseF, baseP, fLimit, pLimit, abilityRows, options);
  const normalLines = options.isBench ? evaluatePlayer(player, all, baseF, baseP, fLimit, pLimit, abilityRows, { ...options, isBench: false }) : lines;
  const benchLines = evaluatePlayer(player, all, baseF, baseP, fLimit, pLimit, abilityRows, { ...options, isBench: true });
  return {
    score: lines.reduce((sum, row) => sum + row.score, 0),
    normalScore: normalLines.reduce((sum, row) => sum + row.score, 0),
    lines,
    benchScore: benchLines.reduce((sum, row) => sum + row.score, 0),
    fielderLimit: fLimit, pitcherLimit: pLimit,
    decks: decks.map((cards, i) => ({
      units: cards.map(({ id, name, fixedAbility, supexp }) => ({ id, name, ability: fixedAbility, supexp })),
      abilities: chosenAbilities[i].map((ability) => ({
        ability,
        score: lines.find((line) => line.ability?.id === ability.id)?.score ?? 0,
      })),
    })),
  };
}
