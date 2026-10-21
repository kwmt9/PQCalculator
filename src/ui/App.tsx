import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Ability, EventUnit, Player, SavedComparison } from '../types';
import { atLevel, calculate, fielderLabels, pitcherLabels } from '../scoring';

const asset = (file: string) => `${import.meta.env.BASE_URL}data/${file}`;
const masteryLabels = ['打撃1', '走塁1', '守備1', '投球1', '打撃2', '走塁2', '守備2', '投球2', '打撃3', '走塁3', '守備3', '投球3', '打撃4', '走塁4', '守備4', '投球4'];
const positionNames: Record<number, string> = { 1: '投手', 2: '捕手', 3: '一塁手', 4: '二塁手', 5: '遊撃手', 6: '三塁手', 7: '外野手' };
const positionClasses: Record<number, string> = { 1: 'bg-pitcher', 2: 'bg-chatcher', 3: 'bg-infielder', 4: 'bg-infielder', 5: 'bg-infielder', 6: 'bg-infielder', 7: 'bg-outfielder' };
const defaults = { level: 50, coachCount: 4, cost: 20, usage: 'スタメン' };

function readStored<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; }
}

function readSavedComparisons(): SavedComparison[] {
  try {
    const raw = localStorage.getItem('characters');
    if (!raw) return [];
    const saved: unknown = JSON.parse(raw);
    if (!Array.isArray(saved)) return [];

    return saved
      .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      .map((item) => {
        const number = (camelCase: string, pascalCase: string, fallback: number) => {
          const value = Number(item[camelCase] ?? item[pascalCase]);
          return Number.isFinite(value) ? value : fallback;
        };
        return {
          name: String(item.name ?? item.Name ?? ''),
          position: number('position', 'Position', 1),
          level: number('level', 'Level', 50),
          cost: number('cost', 'Cost', 20),
          usage: String(item.usage ?? item.Usage ?? 'スタメン'),
          coachCount: number('coachCount', 'CoachCount', 4),
          evaluation: number('evaluation', 'Evaluation', 0),
          benchEvaluation: number('benchEvaluation', 'BenchEvaluation', 0),
          costPerformance: number('costPerformance', 'CostPerformance', 0),
        };
      })
      .filter((item) => item.name.length > 0);
  } catch {
    return [];
  }
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<EventUnit[]>([]);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [route, setRoute] = useState(location.hash.replace('#', '') || '/');

  useEffect(() => {
    const syncRoute = () => setRoute(location.hash.replace('#', '') || '/');
    addEventListener('hashchange', syncRoute);
    Promise.all([
      fetch(asset('playerUnit.json')).then((r) => { if (!r.ok) throw new Error('playerUnit.json'); return r.json() as Promise<Player[]>; }),
      fetch(asset('eventUnit.json')).then((r) => { if (!r.ok) throw new Error('eventUnit.json'); return r.json() as Promise<EventUnit[]>; }),
      fetch(asset('satei.json')).then((r) => { if (!r.ok) throw new Error('satei.json'); return r.json() as Promise<Ability[]>; }),
    ]).then(([p, e, a]) => { setPlayers(p); setEvents(e); setAbilities(a); })
      .catch(() => setLoadError('データを読み込めませんでした。ページを再読み込みしてください。'))
      .finally(() => setLoading(false));
    return () => removeEventListener('hashchange', syncRoute);
  }, []);

  return <div class="app-shell">
    <header class="topbar"><a class="brand" href="#/" aria-label="パワクエコーチ計算機 ホーム"><span><strong>{route === '/compare' ? '契約書比較ツール' : route === '/satei' ? '査定データ' : 'パワクエコーチ計算機(仮)'}</strong></span></a>
      <nav><a class={route === '/' ? 'active' : ''} href="#/">コーチ計算</a><a class={route === '/compare' ? 'active' : ''} href="#/compare">契約書比較</a><a class={route === '/satei' ? 'active' : ''} href="#/satei">査定データ</a></nav>
    </header>
    {loading ? <main class="loading"><span class="spinner" /><p>読み込み中</p></main>
      : loadError ? <main class="loading"><p class="error-text">{loadError}</p></main>
      : route === '/compare' ? <ComparePage players={players} abilities={abilities} events={events} />
      : route === '/satei' ? <SateiDataPage abilities={abilities} />
      : <CalculatorPage players={players} abilities={abilities} events={events} />}
    <footer class="app-footer"><details><summary>更新履歴</summary><ul>
    <li><time dateTime="2026-10-20">2026/10/20</time> サブポジ関連の計算式を修正</li>
    <li><time dateTime="2026-10-19">2026/10/19</time> デッキに経験点上限キャラが入るようにしました。別Verのキャラが被らないようにしました</li>
    <li><time dateTime="2026-01-01">2026/01/01</time> ああああ</li>
    </ul></details></footer>
  </div>;
}

function Field({ label, value, onInput, min = 0, max = 999 }: { label: string; value: number; onInput: (value: number) => void; min?: number; max?: number }) {
  const currentValue = useRef(value);
  const initialTimer = useRef<number>();
  const repeatTimer = useRef<number>();
  currentValue.current = value;
  const stopRepeat = () => {
    if (initialTimer.current !== undefined) window.clearTimeout(initialTimer.current);
    if (repeatTimer.current !== undefined) window.clearInterval(repeatTimer.current);
    initialTimer.current = undefined;
    repeatTimer.current = undefined;
  };
  const update = (next: number) => {
    const clamped = Math.max(min, Math.min(max, next));
    currentValue.current = clamped;
    onInput(clamped);
  };
  const startRepeat = (delta: number) => {
    stopRepeat();
    update(currentValue.current + delta);
    if (currentValue.current <= min || currentValue.current >= max) return;
    initialTimer.current = window.setTimeout(() => {
      repeatTimer.current = window.setInterval(() => {
        const next = Math.max(min, Math.min(max, currentValue.current + delta));
        update(next);
        if (next <= min || next >= max) stopRepeat();
      }, 75);
    }, 500);
  };
  useEffect(() => () => stopRepeat(), []);
  const pressHandlers = (delta: number) => ({
    onPointerDown: (event: PointerEvent) => { event.preventDefault(); startRepeat(delta); },
    onPointerUp: stopRepeat,
    onPointerLeave: stopRepeat,
    onPointerOut: stopRepeat,
    onPointerCancel: stopRepeat,
    onContextMenu: (event: Event) => event.preventDefault(),
  });
  return <div class="field"><span>{label}</span><div class="number-stepper"><button type="button" aria-label={`${label}を1減らす`} {...pressHandlers(-1)}>−</button><input type="number" inputMode="numeric" aria-label={label} min={min} max={max} value={value} onInput={(event) => update(Number((event.currentTarget as HTMLInputElement).value) || min)} /><button type="button" aria-label={`${label}を1増やす`} {...pressHandlers(1)}>＋</button></div></div>;
}

function PlayerPicker({ players, value, onChange }: { players: Player[]; value: string; onChange: (name: string) => void }) {
  const options = useMemo(() => players.filter((p) => p.position !== 0).sort((a, b) => b.id - a.id), [players]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const suggestions = value.trim()
    ? options.filter((player) => player.name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()))
    : options;
  const select = (name: string) => { onChange(name); setOpen(false); inputRef.current?.blur(); };
  return <div class="player-picker">
    <input ref={inputRef} class="player-search" placeholder={String.fromCharCode(0x30ad,0x30e3,0x30e9,0x30af,0x30bf,0x30fc,0x540d,0x3092,0x5165,0x529b)} value={value} role="combobox" aria-autocomplete="list" aria-expanded={open && suggestions.length > 0} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={(event) => { if (event.key === 'Enter' && open && suggestions.length) { event.preventDefault(); select(suggestions[0].name); } else if (event.key === 'Escape') setOpen(false); }} onInput={(event) => { onChange((event.currentTarget as HTMLInputElement).value); setOpen(true); }} />
    {value && <button type="button" class="player-search-clear" aria-label="入力を消去" title="入力を消去" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(''); setOpen(false); }}>×</button>}
    {open && suggestions.length > 0 && <div class="player-suggestions" role="listbox">{suggestions.map((player) => <button type="button" class="player-suggestion" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => select(player.name)}>{player.name}</button>)}</div>}
  </div>;
}
function ResultPanel({ result, isBench, position, onExcludeUnit }: { result: ReturnType<typeof calculate>; isBench: boolean; position: number; onExcludeUnit: (id: number) => void }) {
  const [showDetails, setShowDetails] = useState(false);
  const detailLines = [...result.lines.filter((line) => !line.ability), ...result.lines.filter((line) => line.ability).sort((a, b) => b.score - a.score)];
  return <section class="result-panel">
    <div class="result-head"><div><span class="eyebrow">{isBench ? 'BENCH SCORE' : 'ESTIMATED SCORE'}</span><div class="score-number">{Math.round(result.score).toLocaleString()}</div></div><div class="score-secondary"><span>{isBench ? '通常査定' : '控え査定'}</span><b>{Math.round(isBench ? result.normalScore : result.benchScore).toLocaleString()}</b></div></div>
    <div class={`limit-strip ${position === 1 ? 'pitcher-limits' : ''}`}>{fielderLabels.map(([key, label]) => <span><small>{label}</small><b>+{result.fielderLimit[key] ?? 0}</b></span>)}{position === 1 && <><span><small>{'\u7403\u901f'}</small><b>+{result.pitcherLimit.ballSpeed}</b></span><span><small>{'\u30b3\u30f3\u30c8\u30ed\u30fc\u30eb'}</small><b>+{result.pitcherLimit.ballControl}</b></span><span><small>{'\u30b9\u30bf\u30df\u30ca'}</small><b>+{result.pitcherLimit.stamina}</b></span></>}</div>
    <button class="text-button" onClick={() => setShowDetails(!showDetails)}>{showDetails ? '内訳を閉じる' : '査定の内訳を見る'} <span>{showDetails ? '−' : '+'}</span></button>
    {showDetails && <div class="score-lines">{detailLines.map((line) => <div><span>{line.ability ? <span class={`skill-chip type-${line.ability.colorType}`}>{line.label}</span> : line.label}</span><b>{line.score.toLocaleString()}</b></div>)}</div>}
    {result.decks.length > 0 && <div class="coach-decks"><div class="deck-grid">{result.decks.map((deck, index) => <article class="deck-card"><h4>デッキ <span>0{index + 1}</span></h4><div class="deck-units">{deck.units.slice(0, 9).map((unit) => <div class="deck-unit" title={unit.name}><span>{unit.name}</span>{unit.supexp && <span class="supexp-label">経験点上限</span>}{unit.ability && <span class={`skill-chip type-${unit.ability.colorType}`}>{unit.ability.name}</span>}<button type="button" class="deck-remove" aria-label="所持キャラに戻す" title="未所持キャラに追加" onClick={() => onExcludeUnit(unit.id)}>×</button></div>)}</div><div class="deck-abilities"><div class="deck-abilities-title">取得する特殊能力</div>{deck.abilities.map(({ ability, score }) => <div class="deck-ability"><span class={`skill-chip type-${ability.colorType}`}>{ability.name}</span><b>{score.toLocaleString()}</b></div>)}</div></article>)}</div></div>}
  </section>;
}

function CalculatorPage({ players, abilities, events }: { players: Player[]; abilities: Ability[]; events: EventUnit[] }) {
  const [name, setName] = useState('');
  const [level, setLevel] = useState(defaults.level);
  const [coachCount, setCoachCount] = useState(defaults.coachCount);
  const [usage, setUsage] = useState(defaults.usage);
  const [isBench, setIsBench] = useState(false);
  const [fielderMax, setFielderMax] = useState(false);
  const [pitcherMax, setPitcherMax] = useState(false);
  const [mastery, setMastery] = useState<number[]>([]);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, number>>({});
  const [excluded, setExcluded] = useState<number[]>(() => readStored('notOwnUnit', []));
  const [result, setResult] = useState<ReturnType<typeof calculate> | null>(null);
  const player = players.find((item) => item.name === name);
  const status = player?.status;
  const pitcher = player?.pitcherStatus;

  const restoreDeckUnit = (id: number) => {
    const next = excluded.filter((item) => item !== id);
    localStorage.setItem('notOwnUnit', JSON.stringify(next));
    setExcluded(next);
    if (player) setResult(calculate({ player, allAbilities: abilities, eventUnits: events, level, coachCount, usage, isBench, fielderMax, pitcherMax, selectedMastery: mastery, excludedUnits: next, customStatus: statusOverrides }));
  };  const excludeDeckUnit = (id: number) => {
    const next = excluded.includes(id) ? excluded : [...excluded, id];
    localStorage.setItem('notOwnUnit', JSON.stringify(next));
    setExcluded(next);
    if (player) setResult(calculate({ player, allAbilities: abilities, eventUnits: events, level, coachCount, usage, isBench, fielderMax, pitcherMax, selectedMastery: mastery, excludedUnits: next, customStatus: statusOverrides }));
  };
  const restoreAllDeckUnits = () => {
    localStorage.setItem('notOwnUnit', JSON.stringify([]));
    setExcluded([]);
    if (player && result) setResult(calculate({ player, allAbilities: abilities, eventUnits: events, level, coachCount, usage, isBench, fielderMax, pitcherMax, selectedMastery: mastery, excludedUnits: [], customStatus: statusOverrides }));
  };
  const runCalculation = () => {
    if (!player) return;
    const calculated = calculate({ player, allAbilities: abilities, eventUnits: events, level, coachCount, usage, isBench, fielderMax, pitcherMax, selectedMastery: mastery, excludedUnits: excluded, customStatus: statusOverrides });
    setResult(calculated);
  };
  useEffect(() => {
    if (!result || !player) return;
    setResult(calculate({ player, allAbilities: abilities, eventUnits: events, level, coachCount, usage, isBench, fielderMax, pitcherMax, selectedMastery: mastery, excludedUnits: excluded, customStatus: statusOverrides }));
  }, [player, abilities, events, level, coachCount, usage, isBench, fielderMax, pitcherMax, mastery, excluded, statusOverrides]);
  const masteryGroups = masteryLabels.map((label, index) => ({ label, index }));

  return <main class="page-wrap">
    <div class="workspace">
      <section class="panel input-panel">
        <label class="field field-wide"><span>契約書キャラクター</span><PlayerPicker players={players} value={name} onChange={(value) => { setName(value); setResult(null); setStatusOverrides({}); }} /></label>
        {player && <div class="player-summary"><div class="player-summary-head"><span class={`position-mark ${positionClasses[player.position] ?? ''}`}>{positionNames[player.position] ?? '選手'}</span><div><b>{player.name}</b></div></div><div class="ability-card"><span class="eyebrow">CHARACTER ABILITIES</span><div class="ability-list">{player.abilities.map((ability) => <span class={`skill-chip type-${ability.colorType}`}>{ability.name}</span>)}</div></div></div>}
        <div class="field-grid"><Field label="契約書Lv" value={level} min={1} onInput={(value) => { setLevel(value); setStatusOverrides({}); }} /><Field label="コーチ人数" value={coachCount} min={0} max={4} onInput={setCoachCount} /></div>
        {player && <div class="status-editor"><div class="section-caption">査定対象能力値 <small>編集できます</small></div><div class="status-grid">{fielderLabels.map(([key, label]) => <Field label={label} value={statusOverrides[key] ?? atLevel(level, player.status?.[key] ?? 0)} onInput={(value) => setStatusOverrides((current) => ({ ...current, [key]: value }))} min={1} />)}{player.position === 1 && pitcherLabels.map(([key, label]) => <Field label={label} value={statusOverrides[key] ?? atLevel(level, player.pitcherStatus?.[key] ?? 0)} onInput={(value) => setStatusOverrides((current) => ({ ...current, [key]: value }))} min={1} />)}{player.position === 1 && <Field label="球速" value={statusOverrides.ballSpeed ?? (player.pitcherStatus ? 100 + atLevel(level, player.pitcherStatus.ballSpeed - 100) : 120)} onInput={(value) => setStatusOverrides((current) => ({ ...current, ballSpeed: value }))} min={100} />}</div></div>}
        <div class="field field-wide"><span>起用方法</span><div class="segmented">{['スタメン', 'サブポジ', 'サブポジ〇', 'サブポジ◎'].map((item) => <button class={usage === item ? 'selected' : ''} onClick={() => setUsage(item)}>{item}</button>)}</div></div>
        <div class="option-list"><label class="toggle-row"><span><b>控え運用</b><small>控え査定で編成を評価</small></span><input type="checkbox" checked={isBench} onChange={(e) => setIsBench((e.currentTarget as HTMLInputElement).checked)} /></label>
          <label class="toggle-row"><span><b>野手能力上限を最大化</b><small>野手上限が不足する分を補い査定を計算</small></span><input type="checkbox" checked={fielderMax} onChange={(e) => setFielderMax((e.currentTarget as HTMLInputElement).checked)} /></label>
          {player?.position === 1 && <label class="toggle-row"><span><b>投手能力上限を最大化</b><small>投手上限が不足する分を補う</small></span><input type="checkbox" checked={pitcherMax} onChange={(e) => setPitcherMax((e.currentTarget as HTMLInputElement).checked)} /></label>}
        </div>
        <details class="advanced"><summary>熟練の〇〇</summary><div class="mastery-list">{masteryGroups.map(({ label, index }) => <label><input type="checkbox" checked={mastery.includes(index)} onChange={() => setMastery((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index])} />{label}</label>)}</div></details>
        <button class="primary-button" disabled={!player} onClick={runCalculation}><span>計算する</span></button>
        {!player && <p class="helper-text">キャラクターを選択すると計算できます。</p>}
      </section>
      <section class="result-column">{result ? <ResultPanel result={result} isBench={isBench} position={player?.position ?? 0} onExcludeUnit={excludeDeckUnit} /> : <div class="empty-result"></div>}</section>
        <section class="unowned-list"><div class="unowned-heading"><h3>未所持キャラ <small>{excluded.length}</small></h3>{excluded.length > 0 && <button type="button" class="secondary-button" onClick={restoreAllDeckUnits}>すべて所持に戻す</button>}</div>{excluded.length ? <ul>{excluded.map((id) => { const unit = events.find((item) => item.id === id); return unit ? <li><span>{unit.name}</span><button type="button" class="restore-button" aria-label="所持キャラに戻す" title="所持キャラに戻す" onClick={() => restoreDeckUnit(id)}>×</button></li> : null; })}</ul> : <p>未所持キャラはありません。</p>}</section>
    </div>
  </main>;
}

function ComparePage({ players, abilities, events }: { players: Player[]; abilities: Ability[]; events: EventUnit[] }) {
  const [rows, setRows] = useState<SavedComparison[]>(readSavedComparisons);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(50);
  const [cost, setCost] = useState(20);
  const [coachCount, setCoachCount] = useState(4);
  const [usage, setUsage] = useState('スタメン');
  const [sort, setSort] = useState<keyof SavedComparison>('evaluation');
  const [descending, setDescending] = useState(true);
  const player = players.find((item) => item.name === name);
  const sorted = [...rows].sort((a, b) => {
    const left = a[sort], right = b[sort];
    const order = typeof left === 'string' ? left.localeCompare(String(right), 'ja') : Number(left) - Number(right);
    return descending ? -order : order;
  });
  const persist = (next: SavedComparison[]) => { setRows(next); localStorage.setItem('characters', JSON.stringify(next)); };
  const add = () => {
    if (!player) return;
    const result = calculate({ player, allAbilities: abilities, eventUnits: events, level, coachCount, usage, fielderMax: true, pitcherMax: true });
    persist([...rows, { name: player.name, position: player.position, level, cost, usage, coachCount, evaluation: Math.trunc(result.score), benchEvaluation: Math.trunc(result.benchScore), costPerformance: cost ? Math.round(result.score / cost * 100) / 100 : 0 }]);
    setName('');
  };
  const copy = async () => {
    const heading = 'キャラ名\t守備位置\t査定\t控え査定\tコスパ\tコーチ人数\tレベル上限\tコスト';
    const lines = sorted.map((row) => `${row.name}\t${row.usage === 'スタメン' ? positionNames[row.position] ?? row.position : row.usage}\t${row.evaluation}\t${row.benchEvaluation}\t${row.costPerformance}\t${row.coachCount}\t${row.level}\t${row.cost}`);
    await navigator.clipboard.writeText([heading, ...lines].join('\n'));
  };
  const remove = (index: number) => persist(rows.filter((_, rowIndex) => rowIndex !== index));
  const th = (key: keyof SavedComparison, title: string) => <th><button onClick={() => { if (sort === key) setDescending(!descending); else { setSort(key); setDescending(true); } }}><span>{title}</span><span class={`sort-indicator ${sort === key ? 'active' : ''}`} aria-hidden="true">{sort === key ? descending ? '▼' : '▲' : '\u00a0'}</span></button></th>;
  return <main class="page-wrap compare-page"><section class="hero"><div><h1>契約書比較ツール</h1><p>査定、控え査定、コストパフォーマンスを比較できます。</p></div></section>
    <section class="panel compare-form"><div class="panel-heading"><div><span class="eyebrow">ADD PLAYER</span><h2>比較するキャラクター</h2></div></div>
      <div class="compare-fields"><label class="field field-wide"><span>キャラクター</span><PlayerPicker players={players} value={name} onChange={setName} /></label><Field label="Lv" value={level} min={1} onInput={setLevel} /><Field label="コスト" value={cost} min={1} onInput={setCost} /><Field label="コーチ人数" value={coachCount} min={1} max={4} onInput={setCoachCount} /><div class="field field-wide"><span>起用方法</span><div class="segmented">{['スタメン', 'サブポジ', 'サブポジ〇', 'サブポジ◎'].map((item) => <button type="button" class={usage === item ? 'selected' : ''} onClick={() => setUsage(item)}>{item}</button>)}</div></div><button class="primary-button add-button" disabled={!player} onClick={add}>比較に追加 <b>＋</b></button></div>
    </section>
    <section class="panel table-panel"><div class="table-heading"><div><span class="eyebrow">RANKING</span><h2>比較リスト <small>{rows.length}</small></h2></div><div class="table-actions"><button class="secondary-button" disabled={!rows.length} onClick={copy}>表をコピー</button><button class="text-button danger" disabled={!rows.length} onClick={() => persist([])}>すべて削除</button></div></div>
      {rows.length ? <div class="table-scroll"><table><thead><tr>{th('name', 'キャラクター')}{th('position', 'ポジション')}{th('usage', '起用')}{th('evaluation', '査定')}{th('benchEvaluation', '控え査定')}{th('costPerformance', 'コスパ')}{th('coachCount', 'コーチ')}{th('level', 'Lv')}{th('cost', 'コスト')}<th /></tr></thead><tbody>{sorted.map((row) => <tr><td><b>{row.name}</b></td><td><span class={`position-mark ${positionClasses[row.position] ?? ''}`}>{positionNames[row.position] ?? '選手'}</span></td><td>{row.usage}</td><td class="numeric"><b>{row.evaluation.toLocaleString()}</b></td><td class="numeric">{row.benchEvaluation.toLocaleString()}</td><td class="numeric">{row.costPerformance.toFixed(2)}</td><td class="numeric">{row.coachCount}</td><td class="numeric">{row.level}</td><td class="numeric">{row.cost}</td><td><button class="remove-button" aria-label={`${row.name}を削除`} onClick={() => remove(rows.indexOf(row))}>×</button></td></tr>)}</tbody></table></div> : <div class="table-empty"><span>比較リストは空です</span><p>上のフォームからキャラクターを追加してください。</p></div>}
    </section>
  </main>;
}

function SateiDataPage({ abilities }: { abilities: Ability[] }) {
  const fielders = abilities.filter((ability) => ability.playerType === 1);
  const pitchers = abilities.filter((ability) => ability.playerType === 2);
  const positionRates = abilities.flatMap((ability) => (ability.pos_rate ?? []).map((rate) => ({ ability, rate })));
  const table = (title: string, rows: Ability[], isFielder: boolean) => <details class="satei-table-collapse">
    <summary>{title}</summary>
    <section class="panel table-panel satei-table-panel">
    <div class="table-scroll"><table class="satei-data-table"><thead><tr><th>特殊能力名</th><th>通常査定</th><th>通常査定（合計）</th><th>控え査定</th><th>控え査定（合計）</th><th>{isFielder ? '投手時' : '野手時'}</th><th>{isFielder ? '投手時（合計）' : '野手時（合計）'}</th></tr></thead><tbody>
      {rows.map((ability) => <tr>
        <td><span class={`skill-chip type-${ability.colorType}`}>{ability.name}</span></td>
        <td class="numeric">{ability.sateiMain}</td>
        <td class="numeric">{rows.filter((lower) => lower.groupId === ability.groupId && lower.rank > 0 && lower.rank <= ability.rank).reduce((sum, lower) => sum + lower.sateiMain, 0)}</td>
        <td class="numeric">{ability.sateiSub}</td>
        <td class="numeric">{rows.filter((lower) => lower.groupId === ability.groupId && lower.rank > 0 && lower.rank <= ability.rank).reduce((sum, lower) => sum + lower.sateiSub, 0)}</td>
        <td class="numeric">{(isFielder ? ability.fp : ability.pf) ?? ''}</td>
        <td class="numeric">{rows.filter((lower) => lower.groupId === ability.groupId && lower.rank > 0 && lower.rank <= ability.rank).reduce((sum, lower) => sum + (isFielder ? lower.fp ?? 0 : lower.pf ?? 0), 0)}</td>
      </tr>)}
    </tbody></table></div>
    {!rows.length && <div class="table-empty">該当するデータがありません。</div>}
    </section>
  </details>;

  return <main class="page-wrap compare-page satei-data-page">
    <section class="hero"><div><h1>査定データ</h1><p>査定計算に使用しているデータです。</p></div></section>
    {table('野手', fielders, true)}
    {table('投手', pitchers, false)}
    <details class="satei-table-collapse">
      <summary>ポジション別</summary>
      <section class="panel table-panel satei-table-panel">
        <div class="table-scroll"><table class="satei-data-table"><thead><tr><th>特殊能力</th><th>ポジション</th><th>通常査定</th><th>ベンチ査定</th></tr></thead><tbody>
          {positionRates.map(({ ability, rate }) => <tr>
            <td><span class={`skill-chip type-${ability.colorType}`}>{ability.name}</span></td>
            <td><span class={`position-mark ${positionClasses[rate.pos] ?? ''}`}>{positionNames[rate.pos] ?? ''}</span></td>
            <td class="numeric">{rate.sateiMain ?? rate.score ?? ''}</td>
            <td class="numeric">{rate.sateiSub ?? rate.scoreSub ?? ''}</td>
          </tr>)}
        </tbody></table></div>
        {!positionRates.length && <div class="table-empty">ポジション別査定データがありません。</div>}
      </section>
    </details>
  </main>;
}
