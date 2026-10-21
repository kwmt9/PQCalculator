export interface Ability {
  id: number;
  name: string;
  colorType: number;
  playerType: number;
  groupId: number;
  rank: number;
  sateiMain: number;
  sateiSub: number;
  pos_rate?: { pos: number; sateiMain?: number; sateiSub?: number; score?: number; scoreSub?: number }[] | null;
  pf?: number | null;
  fp?: number | null;
}

export interface FielderStatus {
  dandou: number;
  meet: number;
  power: number;
  runPower: number;
  shoulderPower: number;
  fielding: number;
  catching: number;
}

export interface PitcherStatus {
  ballSpeed: number;
  ballControl: number;
  stamina: number;
}

export interface Player {
  id: number;
  name: string;
  position: number;
  status: FielderStatus | null;
  pitcherStatus: PitcherStatus | null;
  abilities: Ability[];
  curves: { curveId: number; amount: number }[];
}

export interface EventUnit {
  id: number;
  org?: number;
  name: string;
  supexp?: boolean;
  limit: FielderStatus & PitcherStatus;
  abilities: Pick<Ability, 'id' | 'name' | 'groupId' | 'rank' | 'playerType' | 'colorType'>[];
}

export interface ScoreLine {
  label: string;
  score: number;
  ability?: Ability;
}

export interface DeckAbilityScore {
  ability: Ability;
  score: number;
}

export interface SavedComparison {
  name: string;
  position: number;
  level: number;
  cost: number;
  usage: string;
  coachCount: number;
  evaluation: number;
  benchEvaluation: number;
  costPerformance: number;
}
