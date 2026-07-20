import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import{ArrowLeft,BarChart3,Check,ChevronRight,Clock3,Gift,Home,LockKeyhole,Shield,ShoppingCart,Sparkles,Trophy,Users,Zap}from'lucide-react';
import'./styles.css';

const days=[
  {result:'3/3',xp:60,label:'Perfect day'},
  {result:'2/3',xp:38,label:'Strong finish'},
  {result:'3/3',xp:66,label:'Perfect day'},
  {result:'3/3',xp:72,label:'Perfect day'},
  {result:'1/3',xp:18,label:'One complete'},
  {result:'3/3',xp:84,label:'Perfect day'},
  {result:'2/3',xp:52,label:'Two complete'},
  {result:'3/3',xp:90,label:'Perfect day'},
  {result:'3/3',xp:96,label:'Perfect day'},
  {result:'2/3',xp:64,label:'Two complete'},
  {result:'3/3',xp:108,label:'Perfect day'},
  {result:'3/3',xp:114,label:'Perfect day'},
  {result:'2/3',xp:78,label:'Two complete'},
  {result:'3/3',xp:150,label:'Championship'}
];
const missions=[
  ['Morning','Review your five lowest-performing cards','Find the weak spots before the market moves.','8:00 AM–12:00 PM'],
  ['Afternoon','Sell two cards and buy two replacements','Rebuild your lineup with four strategic trades.','12:00 PM–4:00 PM'],
  ['Evening','Update three Collection cards','Keep your card records current before the day ends.','4:00 PM–8:00 PM']
];

function App(){
  const[current,setCurrent]=useState(8),[slot,setSlot]=useState(1),[done,setDone]=useState([true,false,false]),[seconds,setSeconds]=useState(4127),[selected,setSelected]=useState(8);
  useEffect(()=>{const id=setInterval(()=>setSeconds(s=>s?s-1:14399),1000);return()=>clearInterval(id)},[]);
  useEffect(()=>{setSelected(current)},[current]);
  const clock=new Date(seconds*1000).toISOString().slice(11,19),finish=()=>setDone(v=>v.map((x,i)=>i===slot||x));
  return <div className="app">
    <aside>
      <div className="brand"><i><Zap/></i><b>CARD<br/>MADNESS</b></div>
      <nav><a><Home/>Home</a><a className="active"><Trophy/>Competitions</a><a><ShoppingCart/>Marketplace</a><a><BarChart3/>Collection</a></nav>
      <div className="user"><span>JS</span><b>Jeff Silva<small>Level 12 · 2,480 XP</small></b></div>
    </aside>
    <main>
      <div className="crumb"><ArrowLeft/> All competitions <span>/</span> Summer Slugfest</div>
      <header>
        <div className="competition"><div className="cup"><Trophy/></div><div><small>ACTIVE COMPETITION · DAY {current} OF 14</small><h1>Summer Slugfest</h1><p>MLB · 247 players · Ends in {14-current} days</p></div></div>
        <div className="standing"><span>YOUR RANK</span><b>#18</b><small>▲ 4 today</small></div>
      </header>
      <div className="tabs"><button>Overview</button><button>My lineup</button><button>Standings</button><button className="on">Daily missions <i>{done.filter(Boolean).length}</i></button></div>
      <section className="intro"><div><small>YOUR COMPETITION JOURNEY</small><h2>Fourteen days. Build your edge.</h2><p>Complete three timed missions each day to sharpen your lineup and stay active in the competition.</p></div><div className="journeyStats"><span><b>{current-1}</b> days played</span><span><b>18</b> missions</span><span><b>5</b> day streak</span></div></section>
      <section className="map">
        <div className="path"/>
        {days.map((day,i)=>{const n=i+1,state=n<current?'past':n===current?'current':'future',side=i%2?'right':'left';return <article className={'node '+state+' '+side+(selected===n?' selected':'')} key={n} onClick={()=>setSelected(n)}>
          <div className="dayCard">
            <div className="dayLabel"><span>DAY {n}</span>{state==='past'&&<small>{day.result} missions</small>}{state==='current'&&<small>In progress</small>}{state==='future'&&<small>{n<12?'Building difficulty':n<14?'Advanced':'Championship'}</small>}</div>
            {state==='past'&&<><h3>{day.label}</h3><p><Check/> {day.xp} Mission Points earned</p></>}
            {state==='current'&&<><h3>Today’s missions</h3><p><Clock3/> Afternoon mission is live</p></>}
            {state==='future'&&<><h3>{n===14?'Final day':'Mission details hidden'}</h3><p><LockKeyhole/> Reveals on Day {n}</p></>}
          </div>
          <button className="orb" aria-label={'Day '+n}>{state==='past'?<Check/>:state==='current'?<Zap/>:<LockKeyhole/>}</button>
          {n===7&&<div className="checkpoint"><Gift/> HALFWAY REWARD EARNED</div>}
          {n===14&&<div className="checkpoint final"><Trophy/> CHAMPIONSHIP REWARD</div>}
        </article>})}
      </section>
      {selected===current&&<section className="missionPanel">
        <div className="panelHead"><div><span className="live"><i/> LIVE NOW</span><h2>{missions[slot][0]} mission</h2><p>{missions[slot][3]} · Expires before the next mission</p></div><div className="countdown"><small>TIME REMAINING</small><b>{clock}</b></div></div>
        <div className="missionTabs">{missions.map((m,i)=>{let state=done[i]?'done':i===slot?'live':'locked';return <button className={state} onClick={()=>state!=='locked'&&setSlot(i)} key={m[0]}>{state==='done'?<Check/>:state==='locked'?<LockKeyhole/>:<Clock3/>}<span><small>{m[0]}</small><b>{state==='locked'?'Hidden until active':m[1]}</b></span></button>})}</div>
        <div className="challenge"><div className="challengeIcon"><Shield/></div><div><small>CURRENT CHALLENGE</small><h3>{missions[slot][1]}</h3><p>{missions[slot][2]}</p><div className="progress"><span>Progress</span><b>{done[slot]?'4 / 4':'2 / 4'}</b></div><div className="bar"><i style={{width:done[slot]?'100%':'50%'}}/></div></div><div className="payout"><Gift/><span>REWARD</span><b>42 MP</b><small>+30 perfect day bonus</small><button onClick={finish}>{done[slot]?<><Check/> Completed</>:<>Go to lineup <ChevronRight/></>}</button></div></div>
      </section>}
      {selected<current&&<section className="summary"><Check/><div><small>DAY {selected} COMPLETE</small><h2>{days[selected-1].label}</h2><p>{days[selected-1].result} missions completed · {days[selected-1].xp} Mission Points earned</p></div><button onClick={()=>setSelected(current)}>Return to today</button></section>}
      {selected>current&&<section className="summary lockedSummary"><LockKeyhole/><div><small>DAY {selected} PREVIEW</small><h2>{selected===14?'Championship day':'A new challenge awaits'}</h2><p>Exact missions stay hidden until their time window becomes active.</p></div><button onClick={()=>setSelected(current)}>Return to today</button></section>}
    </main>
    <div className="controls"><small>PROTOTYPE</small><label>Competition day <select value={current} onChange={e=>{setCurrent(+e.target.value);setDone([true,false,false])}}>{days.map((_,i)=><option key={i}>{i+1}</option>)}</select></label><button onClick={finish}>Complete active mission</button></div>
  </div>
}
createRoot(document.getElementById('root')).render(<App/>);
