import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeftRight, BarChart3, Check, ChevronRight, CircleDollarSign,
  Coins, Gift, Menu, PackageOpen, Sparkles, Target, Trophy, WalletCards, Zap
} from 'lucide-react';
import './styles.css';

const dayOne = [
  { title: 'Enter Competition', note: 'Choose your arena and lock in your starting balance.', icon: Trophy, cta: 'Enter competition' },
  { title: 'Open Booster Pack', note: 'Reveal the cards that could shape your opening strategy.', icon: PackageOpen, cta: 'Open booster' },
  { title: 'Open Daily Pack', note: 'Add today’s free cards to your collection.', icon: Gift, cta: 'Open daily pack' },
  { title: 'Check Portfolio', note: 'See what moved and where you have an edge.', icon: WalletCards, cta: 'View portfolio' },
  { title: 'Sell Cards', note: 'Turn the right cards into competition balance.', icon: CircleDollarSign, cta: 'Review cards' },
  { title: 'Trade / Aura Pack', note: 'Improve your position or reveal an Aura Pack.', icon: ArrowLeftRight, cta: 'Go to trade' },
  { title: 'Leaderboard', note: 'See the field—then keep moving toward today’s finish.', icon: BarChart3, cta: 'View standings' },
  { title: 'Prize Pool', note: 'Know exactly what you are competing to win.', icon: Coins, cta: 'See prizes' },
  { title: 'Guess the Price', note: 'Put your market instincts to the test.', icon: Target, cta: 'Make a guess' },
  { title: 'Reward Pack', note: 'You earned a pack for today’s performance.', icon: Sparkles, cta: 'Open reward', optional: true },
];

const repeatDays = [
  dayOne[2], dayOne[8], dayOne[9], dayOne[3], dayOne[4], dayOne[5], dayOne[6]
];

function App() {
  const [mode, setMode] = useState('day1');
  const [completed, setCompleted] = useState({ day1: 2, daily: 1 });
  const steps = mode === 'day1' ? dayOne : repeatDays;
  const done = completed[mode];
  const current = Math.min(done, steps.length - 1);
  const isComplete = done >= steps.length;
  const progress = Math.round((Math.min(done, steps.length) / steps.length) * 100);
  const task = steps[current];
  const Icon = task?.icon || Check;
  const title = mode === 'day1' ? 'Build your competition' : 'Keep your momentum';
  const eyebrow = mode === 'day1' ? 'DAY 1 · COMPETITION SETUP' : 'DAY 6 OF 14 · DAILY ROUTINE';
  const completionTitle = mode === 'day1' ? 'Competition Ready' : 'Daily Complete';
  const nextReset = mode === 'day1' ? 'Your daily routine starts tomorrow' : 'Come back tomorrow to keep your streak';

  const selectMode = next => setMode(next);
  const finishStep = () => setCompleted(state => ({ ...state, [mode]: Math.min(state[mode] + 1, steps.length) }));
  const reset = () => setCompleted(state => ({ ...state, [mode]: 0 }));
  const points = useMemo(() => 420 + completed.day1 * 25 + completed.daily * 20, [completed]);

  return <div className="app">
    <nav className="global">
      <img className="fullLogo" src="/brand/card-madness-full.svg" alt="Card Madness" />
      <img className="symbolLogo" src="/brand/card-madness-symbol.svg" alt="Card Madness" />
      <div className="navlinks"><a className="active">Today</a><a>Competitions</a><a>Collection</a><a>Shop</a></div>
      <div className="navtools"><span><Coins /> {points.toLocaleString()}</span><Menu /></div>
    </nav>

    <main>
      <header className="pageHeader">
        <div><small>MONDAY · JULY 27</small><h1>Today</h1></div>
        <span className="streak"><Zap /> 6 day streak</span>
      </header>

      <section className="competitionPath">
        <div className="pathTop">
          <div>
            <span className="kicker"><Sparkles /> COMPETITION PATH</span>
            <h2>{title}</h2>
            <p>Follow the path. Learn the game. Finish today’s routine.</p>
          </div>
          <div className="progressRing" style={{ '--progress': `${progress * 3.6}deg` }}>
            <div><b>{progress}%</b><small>complete</small></div>
          </div>
        </div>

        <div className="modeTabs" role="tablist" aria-label="Competition path day">
          <button className={mode === 'day1' ? 'active' : ''} onClick={() => selectMode('day1')}>
            <span>Day 1</span><small>Get competition ready</small>
          </button>
          <button className={mode === 'daily' ? 'active' : ''} onClick={() => selectMode('daily')}>
            <span>Days 2–14</span><small>Repeat your daily rhythm</small>
          </button>
        </div>

        <div className="pathBody">
          <aside className="stepRail">
            <div className="railIntro"><small>{eyebrow}</small><strong>{done} of {steps.length} steps complete</strong></div>
            <div className="steps">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const state = index < done ? 'complete' : index === current && !isComplete ? 'current' : 'upcoming';
                return <button key={`${mode}-${step.title}`} className={`step ${state}`} onClick={() => index <= done && setCompleted(s => ({ ...s, [mode]: index }))}>
                  <i>{state === 'complete' ? <Check /> : <StepIcon />}</i>
                  <span><b>{step.title}</b>{step.optional && <em>IF EARNED</em>}</span>
                  {state === 'current' && <small>NOW</small>}
                  {state === 'complete' && <small>DONE</small>}
                </button>;
              })}
              <div className={`finishNode ${isComplete ? 'complete' : ''}`}>
                <i><Check /></i><span><b>{completionTitle}</b><small>{isComplete ? 'YOU’RE ALL SET' : 'FINISH LINE'}</small></span>
              </div>
            </div>
          </aside>

          <section className="actionStage">
            {!isComplete ? <>
              <div className="stepCount">STEP {current + 1} OF {steps.length}</div>
              <div className="heroIcon"><Icon /></div>
              <span className="nowLabel"><i /> UP NEXT</span>
              <h3>{task.title}</h3>
              <p>{task.note}</p>
              {task.optional && <div className="earned"><Sparkles /> Reward unlocked from today’s play</div>}
              <button className="primary" onClick={finishStep}>{task.cta}<ChevronRight /></button>
              <button className="demoComplete" onClick={finishStep}>Preview completed state</button>
            </> : <div className="completion">
              <div className="celebration"><span>✦</span><i><Check /></i><span>✦</span></div>
              <small>{mode === 'day1' ? 'DAY 1 COMPLETE' : 'TODAY’S ROUTINE COMPLETE'}</small>
              <h3>{completionTitle}</h3>
              <p>{nextReset}.</p>
              <div className="rewardSummary">
                <span><Zap /><b>+{mode === 'day1' ? 250 : 140}</b><small>Momentum</small></span>
                <span><Trophy /><b>{mode === 'day1' ? 'Entered' : '6 days'}</b><small>{mode === 'day1' ? 'Competition' : 'Current streak'}</small></span>
              </div>
              <button className="primary">Return to Today <ChevronRight /></button>
              <button className="demoComplete" onClick={reset}>Replay this path</button>
            </div>}
          </section>
        </div>
      </section>

      <section className="why">
        <div><small>WHY THIS PATH</small><h2>One routine. Every part of Card Madness.</h2></div>
        <p>The path connects packs, portfolio decisions, trading, market knowledge, standings, and rewards—then closes the loop with a clear finish.</p>
      </section>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);