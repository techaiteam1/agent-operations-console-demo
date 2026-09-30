import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Box,
  Braces,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Code2,
  Download,
  Eye,
  FileJson,
  FileSpreadsheet,
  Filter,
  Gauge,
  History,
  Info,
  Layers3,
  LockKeyhole,
  Menu,
  Network,
  Pause,
  Play,
  RefreshCcw,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TerminalSquare,
  UploadCloud,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { scenarios } from './data/scenarios'
import { defaultGuardrails, landedCost } from './engine/calculations'
import { buildDemoRun, downloadableArtifacts, recomputeResults, stagesAtCursor } from './engine/runner'
import type {
  AgentEvent,
  DemoRun,
  Guardrails,
  ScenarioDefinition,
  SourcingResult,
  StageStatus,
} from './types'

type ViewId = 'command' | 'products' | 'guardrails' | 'resume' | 'feed' | 'architecture'

const views: Array<{ id: ViewId; label: string; icon: typeof Activity }> = [
  { id: 'command', label: 'Command center', icon: Gauge },
  { id: 'products', label: 'Product explorer', icon: ShoppingBag },
  { id: 'guardrails', label: 'Guardrail lab', icon: Filter },
  { id: 'resume', label: 'Resume center', icon: History },
  { id: 'feed', label: 'Feed review', icon: UploadCloud },
  { id: 'architecture', label: 'Architecture & safety', icon: Network },
]

const agents = [
  {
    name: 'Pipeline Runner',
    tier: 'Sonnet',
    role: 'Control plane',
    icon: Network,
    color: 'violet',
    detail: 'Reconstructs status, delegates specialists, verifies artifacts, and controls resume or stop decisions.',
    value: 'One accountable workflow instead of disconnected automations.',
    tools: ['Python runner', 'State manifest', 'Artifact checks'],
  },
  {
    name: 'Listing Collector',
    tier: 'Haiku',
    role: 'Discovery worker',
    icon: Layers3,
    color: 'cyan',
    detail: 'Paginates a seller catalogue, extracts product URLs, removes duplicates, and skips checkpointed items.',
    value: 'Low-cost, complete catalogue discovery with predictable boundaries.',
    tools: ['Browser navigation', 'DOM extraction', 'Checkpoint filter'],
  },
  {
    name: 'eBay Sourcer',
    tier: 'Sonnet',
    role: 'Research & judgment',
    icon: Search,
    color: 'green',
    detail: 'Reformulates searches, verifies listings, enforces supplier policy, and selects the best profitable match.',
    value: 'Auditable decisions across messy marketplace data.',
    tools: ['Search strategy', 'Listing verification', 'Margin engine'],
  },
]

const walkthrough = [
  ['01', 'The opportunity', 'Three specialists, one accountable workflow', '1 min'],
  ['02', 'Control plane', 'Planning and status reconstruction', '2 min'],
  ['03', 'Catalogue', 'Pagination, deduplication, checkpoints', '2 min'],
  ['04', 'Product data', 'Structured extraction and hand-off', '2 min'],
  ['05', 'Supplier intelligence', 'Fallback search, verification, economics', '4 min'],
  ['06', 'Recovery', 'Interrupt, restore, skip completed work', '2 min'],
  ['07', 'Safe hand-off', 'Guardrails, review, mock feed', '2 min'],
]

export default function App() {
  const [scenarioId, setScenarioId] = useState('happy-path')
  const [run, setRun] = useState<DemoRun | null>(null)
  const [cursor, setCursor] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [view, setView] = useState<ViewId>('command')
  const [inspector, setInspector] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [guardrails, setGuardrails] = useState<Guardrails>(defaultGuardrails)

  useEffect(() => {
    let active = true
    setPlaying(false)
    setCursor(-1)
    setGuardrails(defaultGuardrails)
    buildDemoRun(scenarioId).then((nextRun) => {
      if (!active) return
      setRun(nextRun)
      setSelectedProductId(nextRun.products[0]?.id ?? '')
    })
    return () => { active = false }
  }, [scenarioId])

  useEffect(() => {
    if (!playing || !run) return
    const timer = window.setInterval(() => {
      setCursor((current) => {
        if (current >= run.events.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, 650)
    return () => window.clearInterval(timer)
  }, [playing, run])

  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0]
  const visibleEvents = run ? run.events.slice(0, cursor + 1) : []
  const stages = run ? stagesAtCursor(run, cursor) : []
  const completed = run ? cursor >= run.events.length - 1 : false
  const activeEvent = visibleEvents.at(-1)
  const displayedResults = useMemo(() => run ? recomputeResults(run, guardrails) : [], [run, guardrails])
  const matches = displayedResults.filter((result) => result.match).length
  const avgMargin = displayedResults.filter((result) => result.matchDecision).reduce((sum, result) => sum + (result.matchDecision?.netMarginPct ?? 0), 0) / Math.max(1, matches)

  const reset = () => {
    setPlaying(false)
    setCursor(-1)
    setView('command')
    setInspector(false)
    setGuardrails(defaultGuardrails)
    window.localStorage.removeItem('agent-demo-state')
  }

  const toggleRun = () => {
    if (!run) return
    if (completed) setCursor(-1)
    if (cursor < 0) setCursor(0)
    setPlaying((value) => !value)
  }

  const jumpToEnd = () => {
    if (!run) return
    setPlaying(false)
    setCursor(run.events.length - 1)
  }

  return (
    <div className="app-shell">
      <Sidebar
        scenario={scenario}
        scenarioId={scenarioId}
        setScenarioId={setScenarioId}
        view={view}
        setView={setView}
        menuOpen={menuOpen}
        closeMenu={() => setMenuOpen(false)}
      />

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
            <div>
              <div className="eyebrow">Northwind Demo Supply <span>/</span> Run #1042</div>
              <h1>{views.find((item) => item.id === view)?.label}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="safety-pill"><LockKeyhole size={14} /> Offline fixture mode</div>
            <button className="button ghost" onClick={() => setInspector(true)}><Code2 size={16} /> Technical inspector</button>
            <button className="icon-button" onClick={reset} title="Reset demo"><RotateCcw size={18} /></button>
          </div>
        </header>

        <div className="simulation-banner">
          <ShieldCheck size={17} />
          <strong>Safe demonstration environment</strong>
          <span>All products, sellers, browser actions, API responses, and feed IDs are synthetic. No external marketplace connection exists.</span>
        </div>

        <section className="content-area">
          {!run ? <LoadingState /> : (
            <>
              {view === 'command' && (
                <CommandCenter
                  run={run}
                  stages={stages}
                  events={visibleEvents}
                  activeEvent={activeEvent}
                  cursor={cursor}
                  playing={playing}
                  completed={completed}
                  toggleRun={toggleRun}
                  jumpToEnd={jumpToEnd}
                  matches={matches}
                  avgMargin={avgMargin}
                  onExplore={() => setView('products')}
                />
              )}
              {view === 'products' && <ProductExplorer results={displayedResults} selectedId={selectedProductId} setSelectedId={setSelectedProductId} />}
              {view === 'guardrails' && <GuardrailLab run={run} guardrails={guardrails} setGuardrails={setGuardrails} results={displayedResults} />}
              {view === 'resume' && <ResumeCenter run={run} onRunScenario={() => setScenarioId('resume')} />}
              {view === 'feed' && <FeedReview run={run} results={displayedResults} onComplete={jumpToEnd} />}
              {view === 'architecture' && <Architecture />}
            </>
          )}
        </section>
      </main>

      {inspector && run && <Inspector run={run} cursor={cursor} close={() => setInspector(false)} />}
    </div>
  )
}

function Sidebar({ scenario, scenarioId, setScenarioId, view, setView, menuOpen, closeMenu }: {
  scenario: ScenarioDefinition
  scenarioId: string
  setScenarioId: (id: string) => void
  view: ViewId
  setView: (id: ViewId) => void
  menuOpen: boolean
  closeMenu: () => void
}) {
  return (
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <button className="sidebar-close" onClick={closeMenu}><X size={20} /></button>
      <div className="brand">
        <div className="brand-mark"><Sparkles size={21} /></div>
        <div><strong>AgentOps</strong><span>Client demonstration</span></div>
      </div>
      <div className="scenario-control">
        <label>Demonstration scenario</label>
        <div className="select-wrap">
          <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)} aria-label="Demonstration scenario">
            {scenarios.map((item) => <option key={item.id} value={item.id}>{item.shortTitle}</option>)}
          </select>
          <ChevronDown size={15} />
        </div>
        <p>{scenario.description}</p>
        <span className="duration"><Clock3 size={13} /> {scenario.duration}</span>
      </div>
      <nav>
        <span className="nav-label">Workspace</span>
        {views.map((item) => {
          const Icon = item.icon
          return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => { setView(item.id); closeMenu() }}><Icon size={17} /> {item.label}</button>
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="no-network"><LockKeyhole size={17} /><div><strong>Network locked</strong><span>Fixture adapters only</span></div><span className="status-dot" /></div>
        <p>Prototype v1.0 · Synthetic data</p>
      </div>
    </aside>
  )
}

function CommandCenter({ run, stages, events, activeEvent, cursor, playing, completed, toggleRun, jumpToEnd, matches, avgMargin, onExplore }: {
  run: DemoRun
  stages: ReturnType<typeof stagesAtCursor>
  events: AgentEvent[]
  activeEvent?: AgentEvent
  cursor: number
  playing: boolean
  completed: boolean
  toggleRun: () => void
  jumpToEnd: () => void
  matches: number
  avgMargin: number
  onExplore: () => void
}) {
  const progress = cursor < 0 ? 0 : Math.round(((cursor + 1) / run.events.length) * 100)
  return (
    <div className="page-grid">
      <section className="hero-card">
        <div className="hero-copy">
          <div className="section-kicker"><Zap size={15} /> Guided demonstration</div>
          <h2>From catalogue signal to<br /><span>validated supply decision.</span></h2>
          <p>Watch three specialized agents coordinate research, economics, recovery, and a safe mock marketplace hand-off.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={toggleRun}>{playing ? <><Pause size={17} /> Pause walkthrough</> : <><Play size={17} fill="currentColor" /> {completed ? 'Replay walkthrough' : cursor >= 0 ? 'Continue walkthrough' : 'Start guided demo'}</>}</button>
            <button className="button secondary" onClick={jumpToEnd}>Show completed run <ArrowRight size={16} /></button>
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="core"><Bot size={34} /><span>3 agents</span></div>
          <div className="satellite s-one"><Layers3 size={18} /></div>
          <div className="satellite s-two"><Search size={18} /></div>
          <div className="satellite s-three"><ShieldCheck size={18} /></div>
          <div className="sim-chip">SIMULATED</div>
        </div>
      </section>

      <section className="metric-row">
        <Metric icon={Box} label="Products evaluated" value={cursor < 0 ? '—' : String(run.products.length)} detail="Synthetic catalogue" tone="blue" />
        <Metric icon={CheckCircle2} label="Qualified matches" value={cursor < 0 ? '—' : String(matches)} detail={`${run.products.length - matches} safely excluded`} tone="green" />
        <Metric icon={CircleDollarSign} label="Avg. net margin" value={cursor < 0 ? '—' : `${avgMargin.toFixed(1)}%`} detail="After referral fee" tone="violet" />
        <Metric icon={History} label="Recoverable work" value={cursor < 0 ? '—' : `${run.checkpoint.sourcingDoneIds.length}/${run.products.length}`} detail="Per-product checkpoint" tone="amber" />
      </section>

      <section className="card pipeline-card">
        <div className="card-heading">
          <div><div className="section-kicker">Live orchestration</div><h3>Pipeline execution</h3></div>
          <div className="progress-label"><span>{progress}%</span><div className="progress-track"><i style={{ width: `${progress}%` }} /></div></div>
        </div>
        <div className="pipeline-flow">
          {stages.map((stage, index) => <StageNode key={stage.id} stage={stage} isLast={index === stages.length - 1} />)}
        </div>
      </section>

      {activeEvent?.presenterCue && (
        <section className="presenter-cue">
          <div className="cue-icon"><Eye size={19} /></div>
          <div><span>Presenter cue</span><strong>{activeEvent.presenterCue}</strong></div>
          <button onClick={onExplore}>Open detail <ArrowRight size={14} /></button>
        </section>
      )}

      <div className="two-column">
        <section className="card activity-card">
          <div className="card-heading"><div><div className="section-kicker">Explainable execution</div><h3>Live activity</h3></div><span className={`live-indicator ${playing ? 'on' : ''}`}><i /> {playing ? 'Running' : completed ? 'Complete' : 'Ready'}</span></div>
          <div className="activity-list">
            {events.length ? [...events].reverse().slice(0, 7).map((event) => <EventRow key={event.id} event={event} />) : <EmptyActivity />}
          </div>
        </section>
        <section className="card agents-card">
          <div className="card-heading"><div><div className="section-kicker">Specialized intelligence</div><h3>Agent team</h3></div><Bot size={20} className="muted" /></div>
          <div className="agent-list">
            {agents.map((agent) => {
              const Icon = agent.icon
              return <div className="agent-row" key={agent.name}><div className={`agent-icon ${agent.color}`}><Icon size={19} /></div><div><strong>{agent.name}</strong><span>{agent.role}</span></div><small>{agent.tier}</small></div>
            })}
          </div>
          <div className="walkthrough-mini"><Clock3 size={16} /><span><strong>15-minute story</strong> · 7 guided chapters</span></div>
        </section>
      </div>
    </div>
  )
}

function ProductExplorer({ results, selectedId, setSelectedId }: { results: SourcingResult[]; selectedId: string; setSelectedId: (id: string) => void }) {
  const selected = results.find((result) => result.product.id === selectedId) ?? results[0]
  if (!selected) return <EmptyPage title="No product fixtures in this scenario" />
  return (
    <div className="explorer-layout">
      <section className="card product-list-panel">
        <div className="card-heading"><div><div className="section-kicker">Synthetic batch</div><h3>{results.length} products</h3></div></div>
        <div className="product-list">
          {results.map((result) => <button key={result.product.id} className={selected.product.id === result.product.id ? 'selected' : ''} onClick={() => setSelectedId(result.product.id)}>
            <ProductMark product={result.product} />
            <div><strong>{result.product.name}</strong><span>{result.product.category} · ${result.product.sellingPrice.toFixed(2)}</span></div>
            <StatusBadge status={result.status} />
          </button>)}
        </div>
      </section>
      <div className="product-detail-stack">
        <section className="card product-summary">
          <div className="product-main"><ProductMark product={selected.product} large /><div><div className="section-kicker">Walmart-side product · simulated</div><h2>{selected.product.name}</h2><div className="meta-line"><span>Item {selected.product.walmartItemNo}</span><span>Model {selected.product.supplierItemNo}</span><span>GTIN {selected.product.upc}</span></div></div></div>
          <div className="sell-price"><span>Target sell price</span><strong>${selected.product.sellingPrice.toFixed(2)}</strong></div>
        </section>
        <section className="card decision-banner">
          <div className={`decision-icon ${selected.match ? 'pass' : 'fail'}`}>{selected.match ? <CheckCircle2 size={22} /> : <XCircle size={22} />}</div>
          <div><span>Agent decision</span><strong>{selected.match ? selected.summary : selected.status === 'quarantined' ? 'Result quarantined before feed review.' : 'No candidate passed every policy gate.'}</strong></div>
          {selected.matchDecision && <div className="decision-metrics"><span>Net margin <b>{selected.matchDecision.netMarginPct}%</b></span><span>Landed cost <b>${selected.matchDecision.landedCost.toFixed(2)}</b></span></div>}
        </section>
        <section className="card candidates-card">
          <div className="card-heading"><div><div className="section-kicker">Verified marketplace evidence</div><h3>Supplier candidates</h3></div><span className="tiny-badge">{selected.candidates.length} inspected</span></div>
          <div className="candidate-table-wrap"><table className="candidate-table"><thead><tr><th>Supplier</th><th>Landed cost</th><th>Condition</th><th>Delivery</th><th>Feedback</th><th>Decision</th></tr></thead><tbody>
            {selected.candidates.map((candidate) => {
              const decision = selected.decisions.find((item) => item.candidateId === candidate.id)!
              const winner = selected.match?.id === candidate.id
              return <tr key={candidate.id} className={winner ? 'winner' : ''}><td><div className="seller-cell"><span className="seller-avatar">{candidate.seller.slice(0, 2).toUpperCase()}</span><div><strong>{candidate.seller}</strong><span>{candidate.evidence}</span></div></div></td><td><strong>${landedCost(candidate).toFixed(2)}</strong><span>${candidate.price} + ${candidate.shipping}</span></td><td>{candidate.condition}</td><td>{candidate.deliveryDays} days</td><td>{candidate.feedback.toLocaleString()}</td><td>{winner ? <span className="pill pass"><Check size={13} /> Selected</span> : <span className="pill reject" title={decision.reasons.join('; ')}><X size={13} /> {decision.reasons[0]?.split(':')[0] || 'Rejected'}</span>}</td></tr>
            })}
            {!selected.candidates.length && <tr><td colSpan={6} className="table-empty">No candidate records reached verification.</td></tr>}
          </tbody></table></div>
        </section>
      </div>
    </div>
  )
}

function GuardrailLab({ run, guardrails, setGuardrails, results }: { run: DemoRun; guardrails: Guardrails; setGuardrails: (value: Guardrails) => void; results: SourcingResult[] }) {
  const changed = JSON.stringify(guardrails) !== JSON.stringify(defaultGuardrails)
  return (
    <div className="lab-layout">
      <section className="card controls-card">
        <div className="card-heading"><div><div className="section-kicker">What-if analysis</div><h3>Business policy controls</h3></div><Settings2 size={20} className="muted" /></div>
        <p className="helper-copy">Adjust policy safely. Decisions are recalculated locally against the same verified fixture evidence.</p>
        <Slider label="Minimum net margin" value={guardrails.ebayNetMarginPct} min={5} max={35} suffix="%" onChange={(value) => setGuardrails({ ...guardrails, ebayNetMarginPct: value })} />
        <Slider label="Walmart referral fee" value={guardrails.walmartReferralFeePct} min={5} max={25} suffix="%" onChange={(value) => setGuardrails({ ...guardrails, walmartReferralFeePct: value })} />
        <Slider label="Minimum gross margin" value={guardrails.minGrossMarginPct} min={10} max={45} suffix="%" onChange={(value) => setGuardrails({ ...guardrails, minGrossMarginPct: value })} />
        <Slider label="Maximum delivery" value={guardrails.maxDeliveryDays} min={2} max={14} suffix=" days" onChange={(value) => setGuardrails({ ...guardrails, maxDeliveryDays: value })} />
        <Slider label="Minimum feedback" value={guardrails.minSellerFeedback} min={0} max={100} suffix="" onChange={(value) => setGuardrails({ ...guardrails, minSellerFeedback: value })} />
        <div className="toggle-row"><div><strong>Require US-based seller</strong><span>Location gate</span></div><button className={`toggle ${guardrails.requireUsSeller ? 'on' : ''}`} onClick={() => setGuardrails({ ...guardrails, requireUsSeller: !guardrails.requireUsSeller })}><i /></button></div>
        <button className="button secondary full" disabled={!changed} onClick={() => setGuardrails(defaultGuardrails)}><RefreshCcw size={15} /> Restore production defaults</button>
      </section>
      <section className="card outcome-card">
        <div className="card-heading"><div><div className="section-kicker">Immediate impact</div><h3>Qualification outcome</h3></div><span className="tiny-badge">{results.filter((item) => item.match).length}/{run.products.length} qualify</span></div>
        <div className="outcome-bars">
          {results.map((result) => <div className="outcome-row" key={result.product.id}><ProductMark product={result.product} /><div className="outcome-info"><div><strong>{result.product.name}</strong><span>{result.matchDecision ? `${result.matchDecision.netMarginPct}% net margin` : result.summary}</span></div><div className="outcome-track"><i className={result.match ? 'pass' : 'fail'} style={{ width: `${Math.max(5, Math.min(100, (result.matchDecision?.netMarginPct ?? 2) * 2.5))}%` }} /></div></div><StatusBadge status={result.status} /></div>)}
        </div>
        <div className="policy-note"><ShieldCheck size={18} /><div><strong>Deterministic enforcement</strong><span>The agent proposes candidates. This policy engine makes the final feed-admission decision.</span></div></div>
      </section>
    </div>
  )
}

function ResumeCenter({ run, onRunScenario }: { run: DemoRun; onRunScenario: () => void }) {
  const isResume = run.scenario.behavior.interruptedResume
  return (
    <div className="resume-page">
      <section className="card resume-hero">
        <div><div className="section-kicker"><History size={15} /> Durable recovery</div><h2>Continue from the last verified product,<br /><span>not from the beginning.</span></h2><p>Two state files preserve deterministic work across browser interruptions, rate limits, context windows, or machine restarts.</p>{!isResume && <button className="button primary" onClick={onRunScenario}><Play size={16} /> Load resume scenario</button>}</div>
        <div className="recovery-score"><span>Work protected</span><strong>{isResume ? '33%' : '100%'}</strong><small>{isResume ? '2 searches restored' : 'Checkpoint ready'}</small></div>
      </section>
      <div className="two-column equal">
        <section className="card state-card"><div className="state-icon cyan"><FileJson size={22} /></div><div><span>Walmart checkpoint</span><h3>checkpoint.json</h3><p>Stores detail-scrape item IDs. Collection and scraping both use it to avoid duplicate work across batches.</p></div><CodeBlock data={{ done_ids: run.checkpoint.doneIds.length ? run.checkpoint.doneIds : ['9001001', '9001002', '…'] }} /></section>
        <section className="card state-card"><div className="state-icon violet"><History size={22} /></div><div><span>eBay sourcing progress</span><h3>ebay_progress.json</h3><p>Commits one complete product result at a time. A resumed agent skips every finished product.</p></div><CodeBlock data={{ completed_item_ids: run.checkpoint.sourcingDoneIds.slice(0, 3), resumed: run.checkpoint.resumed }} /></section>
      </div>
      <section className="card resume-timeline"><div className="card-heading"><div><div className="section-kicker">Recovery sequence</div><h3>Interrupted sourcing scenario</h3></div></div><div className="recovery-steps">
        <RecoveryStep number="01" title="Products 1–2 completed" detail="Each result is verified and committed immediately." state="complete" />
        <RecoveryStep number="02" title="Session interrupted" detail="No partial product is marked complete." state="warning" />
        <RecoveryStep number="03" title="Progress restored" detail="Completed item IDs are loaded from durable state." state="complete" />
        <RecoveryStep number="04" title="Research resumes at product 3" detail="No completed browser search is repeated." state="active" />
      </div></section>
    </div>
  )
}

function FeedReview({ run, results, onComplete }: { run: DemoRun; results: SourcingResult[]; onComplete: () => void }) {
  const eligible = results.filter((result) => result.match && result.matchDecision?.eligible)
  return (
    <div className="feed-page">
      <section className="mock-warning"><AlertTriangle size={20} /><div><strong>Simulation boundary</strong><span>This screen previews a feed-shaped artifact. The submit action only advances the local fixture adapter.</span></div><span>NO EXTERNAL API</span></section>
      <div className="feed-summary-grid">
        <Metric icon={CheckCircle2} label="Eligible items" value={String(eligible.length)} detail="Selected + policy validated" tone="green" />
        <Metric icon={XCircle} label="Excluded items" value={String(results.length - eligible.length)} detail="No valid selected match" tone="amber" />
        <Metric icon={UploadCloud} label="Mock feed status" value={run.feed.status.replaceAll('_', ' ')} detail={run.feed.id || 'Not yet simulated'} tone="blue" />
      </div>
      <section className="card feed-table-card">
        <div className="card-heading"><div><div className="section-kicker">Final human review</div><h3>Proposed catalogue feed</h3></div><button className="button secondary" onClick={() => downloadJson('mock-feed-preview.json', run.artifacts.find((item) => item.id === 'a-feed-preview')?.content)}><Download size={15} /> Download preview</button></div>
        <div className="candidate-table-wrap"><table className="candidate-table feed-table"><thead><tr><th>Product</th><th>GTIN</th><th>Supplier</th><th>Sell price</th><th>Landed cost</th><th>Net margin</th><th>Validation</th></tr></thead><tbody>
          {eligible.map((result) => <tr key={result.product.id}><td><div className="seller-cell"><ProductMark product={result.product} /><div><strong>{result.product.name}</strong><span>{result.product.walmartSku}</span></div></div></td><td className="mono">{result.product.upc.padStart(14, '0')}</td><td>{result.match?.seller}</td><td>${result.product.sellingPrice.toFixed(2)}</td><td>${result.matchDecision?.landedCost.toFixed(2)}</td><td><strong className="positive">{result.matchDecision?.netMarginPct}%</strong></td><td><span className="pill pass"><ShieldCheck size={13} /> Ready</span></td></tr>)}
          {!eligible.length && <tr><td colSpan={7} className="table-empty">No records can enter the mock feed in this scenario.</td></tr>}
        </tbody></table></div>
        <div className="feed-footer"><div><LockKeyhole size={17} /><span><strong>Local fixture adapter</strong> will create a deterministic terminal result</span></div><button className="button primary" onClick={onComplete} disabled={!eligible.length}><UploadCloud size={16} /> Simulate feed submission</button></div>
      </section>
      {run.feed.status === 'PARTIAL_ERROR' && <section className="card feed-errors"><AlertTriangle size={20} /><div><strong>1 synthetic item-level error</strong><span>{run.feed.errors[0]}</span></div></section>}
    </div>
  )
}

function Architecture() {
  const capabilities = [
    ['Run planning & status', 'Pipeline Runner', 'Manifest + artifact checks', 'Control and accountability'],
    ['Pagination & dedupe', 'Listing Collector', 'Browser DOM extraction', 'Complete catalogue coverage'],
    ['Product enrichment', 'Python worker', 'Structured payload parser', 'Consistent product records'],
    ['Search reformulation', 'eBay Sourcer', 'Title → short title → UPC', 'Higher supplier coverage'],
    ['Supplier verification', 'eBay Sourcer', 'Detail-page evidence', 'Quality and delivery control'],
    ['Margin enforcement', 'Policy engine', 'Deterministic formulas', 'Protected unit economics'],
    ['Resume after failure', 'Both specialists', 'Durable JSON checkpoints', 'No repeated completed work'],
    ['Feed hand-off', 'Mock adapter', 'Validated feed contract', 'Safe operational boundary'],
  ]
  return (
    <div className="architecture-page">
      <section className="card architecture-diagram">
        <div className="card-heading"><div><div className="section-kicker">Separation of concerns</div><h3>Safe demo architecture</h3></div><span className="tiny-badge secure"><LockKeyhole size={13} /> External network blocked</span></div>
        <div className="arch-flow"><ArchBox icon={Bot} title="React console" detail="Guidance + visibility" tone="violet" /><ArrowRight /><ArchBox icon={Activity} title="Scenario engine" detail="Real state + formulas" tone="cyan" /><ArrowRight /><ArchBox icon={Braces} title="Fixture adapters" detail="Synthetic responses" tone="green" /><div className="blocked-connector"><X size={15} /> blocked</div><ArchBox icon={UploadCloud} title="Live marketplaces" detail="Never contacted" tone="muted" /></div>
      </section>
      <div className="two-column equal">
        <section className="card safety-card"><div className="safety-icon"><ShieldCheck size={26} /></div><h3>What is real</h3><ul><li>Pipeline order and ownership</li><li>Artifact and schema contracts</li><li>Guardrail and margin calculations</li><li>Checkpoint and resume transitions</li><li>Feed-admission invariants</li></ul></section>
        <section className="card safety-card"><div className="safety-icon amber"><Sparkles size={26} /></div><h3>What is simulated</h3><ul><li>All products and sellers</li><li>Browser and marketplace responses</li><li>CAPTCHA and rate-limit events</li><li>Feed IDs and polling statuses</li><li>Every external side effect</li></ul></section>
      </div>
      <section className="card capability-card"><div className="card-heading"><div><div className="section-kicker">Traceable value</div><h3>Capability matrix</h3></div></div><div className="candidate-table-wrap"><table className="candidate-table"><thead><tr><th>Visible capability</th><th>Owner</th><th>Production analogue</th><th>Client value</th></tr></thead><tbody>{capabilities.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table></div></section>
      <section className="card walkthrough-card"><div className="card-heading"><div><div className="section-kicker">Presenter runbook</div><h3>15-minute client story</h3></div><span className="tiny-badge"><Clock3 size={13} /> 15 min</span></div><div className="walkthrough-list">{walkthrough.map(([number, title, detail, duration]) => <div key={number}><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div><b>{duration}</b></div>)}</div><div className="faq-strip"><Info size={18} /><div><strong>Likely question: “Is this touching our accounts?”</strong><span>No. The demo is cryptographically browser-blocked from external hosts and uses fixture adapters only. Production connectors are not imported.</span></div></div></section>
    </div>
  )
}

function Inspector({ run, cursor, close }: { run: DemoRun; cursor: number; close: () => void }) {
  const [tab, setTab] = useState<'event' | 'artifact' | 'run'>('event')
  const event = cursor >= 0 ? run.events[cursor] : null
  const payload = tab === 'event' ? event ?? { state: 'Ready — no event emitted yet' } : tab === 'artifact' ? run.artifacts : downloadableArtifacts(run)
  return <div className="drawer-backdrop" onMouseDown={close}><aside className="inspector" onMouseDown={(event_) => event_.stopPropagation()}><div className="inspector-head"><div><div className="section-kicker">Technical inspector</div><h2>Execution evidence</h2></div><button className="icon-button" onClick={close}><X size={20} /></button></div><div className="inspector-tabs"><button className={tab === 'event' ? 'active' : ''} onClick={() => setTab('event')}>Current event</button><button className={tab === 'artifact' ? 'active' : ''} onClick={() => setTab('artifact')}>Artifacts</button><button className={tab === 'run' ? 'active' : ''} onClick={() => setTab('run')}>Run export</button></div><div className="inspector-meta"><span><TerminalSquare size={14} /> Deterministic trace</span><span><LockKeyhole size={14} /> Local only</span></div><pre>{JSON.stringify(payload, null, 2)}</pre><button className="button primary full" onClick={() => downloadJson('agent-demo-run.json', downloadableArtifacts(run))}><Download size={16} /> Download run evidence</button></aside></div>
}

function StageNode({ stage, isLast }: { stage: ReturnType<typeof stagesAtCursor>[number]; isLast: boolean }) {
  return <><div className={`stage-node ${stage.status}`}><div className="stage-status-icon">{stage.status === 'complete' ? <Check size={15} /> : stage.status === 'running' ? <span className="pulse-dot" /> : stage.status === 'warning' ? <AlertTriangle size={14} /> : <span>{String(stageSeedIndex(stage.id) + 1).padStart(2, '0')}</span>}</div><strong>{stage.shortLabel}</strong><span>{stage.owner}</span></div>{!isLast && <div className={`stage-line ${stage.status === 'complete' ? 'complete' : ''}`}><ArrowRight size={14} /></div>}</>
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Box; label: string; value: string; detail: string; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><div><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>
}

function EventRow({ event }: { event: AgentEvent }) {
  const icons = { success: CheckCircle2, warning: AlertTriangle, error: XCircle, retry: RefreshCcw, artifact: FileJson, tool: TerminalSquare, decision: Filter, plan: Network, resume: History }
  const Icon = icons[event.kind]
  return <div className="event-row"><div className={`event-icon ${event.kind}`}><Icon size={15} /></div><div><div><strong>{event.title}</strong><span>+{formatTime(event.elapsedSeconds)}</span></div><p>{event.detail}</p><small>{event.agent}{event.tool ? ` · ${event.tool}` : ''}</small></div></div>
}

function Slider({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  const pct = ((value - min) / (max - min)) * 100
  return <label className="slider-control"><div><strong>{label}</strong><span>{value}{suffix}</span></div><input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} style={{ '--range': `${pct}%` } as React.CSSProperties} /></label>
}

function StatusBadge({ status }: { status: SourcingResult['status'] }) {
  return <span className={`status-badge ${status}`}>{status === 'matched' ? <CheckCircle2 size={13} /> : status === 'quarantined' ? <AlertTriangle size={13} /> : <XCircle size={13} />}{status}</span>
}

function ProductMark({ product, large = false }: { product: SourcingResult['product']; large?: boolean }) {
  return <span className={`product-mark ${large ? 'large' : ''}`} data-category={product.category}>{product.thumbnail}</span>
}

function RecoveryStep({ number, title, detail, state }: { number: string; title: string; detail: string; state: string }) {
  return <div className={`recovery-step ${state}`}><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div>{state === 'complete' ? <CheckCircle2 size={18} /> : state === 'warning' ? <AlertTriangle size={18} /> : <Activity size={18} />}</div>
}

function ArchBox({ icon: Icon, title, detail, tone }: { icon: typeof Bot; title: string; detail: string; tone: string }) {
  return <div className={`arch-box ${tone}`}><Icon size={22} /><strong>{title}</strong><span>{detail}</span></div>
}

function CodeBlock({ data }: { data: unknown }) { return <pre className="code-block">{JSON.stringify(data, null, 2)}</pre> }
function LoadingState() { return <div className="loading"><span /><strong>Preparing deterministic scenario…</strong></div> }
function EmptyActivity() { return <div className="empty-activity"><Activity size={28} /><strong>Ready to demonstrate</strong><span>Start the guided demo to stream agent activity.</span></div> }
function EmptyPage({ title }: { title: string }) { return <div className="empty-page"><Box size={32} /><h2>{title}</h2></div> }

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }
function stageSeedIndex(id: string) { return ['runner', 'collector', 'scraper', 'prepare', 'sourcer', 'review', 'upload'].indexOf(id) }
