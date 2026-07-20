import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import{ArrowLeft,BarChart3,Check,ChevronDown,ChevronRight,Clock3,Coins,Gift,HelpCircle,LockKeyhole,Menu,RotateCcw,ShoppingCart,Sparkles,Trophy,WalletCards,Zap}from'lucide-react';
import'./styles.css';

const days=[
 ['3/3','Perfect day',60],['2/3','Strong finish',38],['3/3','Perfect day',66],['3/3','Perfect day',72],
 ['1/3','One complete',18],['3/3','Perfect day',84],['2/3','Two complete',52],['3/3','Perfect day',90],
 ['3/3','Perfect day',96],['2/3','Two complete',64],['3/3','Perfect day',108],['3/3','Perfect day',114],
 ['2/3','Two complete',78],['3/3','Championship',150]
];
const missions=[
 {window:'Morning',time:'8:00 AM - 12:00 PM',title:'Open your Booster Pack',short:'Start your competition by revealing your first cards.',brief:'Your Booster Pack gives you cards that can immediately become part of your competition portfolio. Open the pack, reveal each card, and decide which cards you want to hold or sell. Cards you keep will begin moving with the market, while cards you sell return virtual currency to your competition account balance for future trades or Aura Packs.',action:'Open Booster Pack',count:'0 of 1 pack opened'},
 {window:'Afternoon',time:'12:00 PM - 4:00 PM',title:'Play Guess the Price',short:'Learn how card values move before making a trade.',brief:'Guess the Price helps you build the market instincts you will use throughout the competition. Open the game from Earn, review the featured card and available information, then submit your best estimate of its market value. Completing the game introduces the price signals that can help you evaluate cards in your Portfolio and the Trade window.',action:'Play Guess the Price',count:'Available at 12 PM'},
 {window:'Evening',time:'4:00 PM - 8:00 PM',title:'Buy or sell a card',short:'Make your first active portfolio decision.',brief:'Your Portfolio contains cards from opened packs and completed purchases. Sell a card to lock in its current profit or loss and move the proceeds into your competition balance, or visit the Trade window to buy a card you believe can gain value. Either choice completes the mission and begins building your competition strategy.',action:'Go to trade',count:'Available at 4 PM'}
];

function App(){
 const[day,setDay]=useState(1),[slot,setSlot]=useState(0),[done,setDone]=useState([false,false,false]),[seconds,setSeconds]=useState(4127),[selected,setSelected]=useState(1),[brief,setBrief]=useState(true);
 useEffect(()=>{const id=setInterval(()=>setSeconds(s=>s?s-1:14399),1000);return()=>clearInterval(id)},[]);
 useEffect(()=>setSelected(day),[day]);
 const clock=new Date(seconds*1000).toISOString().slice(11,19),mission=missions[slot],finish=()=>setDone(v=>v.map((x,i)=>i===slot||x)),openDay=n=>{setSelected(n);if(n===day){setSlot(0);setBrief(true);setTimeout(()=>document.getElementById('active-mission')?.scrollIntoView({behavior:'smooth',block:'start'}),50)}},reset=()=>{setDay(1);setSlot(0);setDone([false,false,false]);setSeconds(4127);setSelected(1);setBrief(true);window.scrollTo({top:0,behavior:'smooth'})};
 return <div className="app">
  <nav className="global">
   <img className="fullLogo" src="/brand/card-madness-full.svg" alt="Card Madness"/><img className="symbolLogo" src="/brand/card-madness-symbol.svg" alt="Card Madness"/>
   <div className="navlinks"><a>Today</a><a className="active">Competitions</a><a>Collection</a><a>Shop</a><a>How to play</a><a>Profile</a><a>Admin</a></div>
   <div className="navtools"><span><Coins/>19,105</span><ShoppingCart/><Menu/></div>
  </nav>
  <main>
   <div className="back"><ArrowLeft/> Today</div>
   <header><button>‹</button><div><h1>CardMadness Free 114: Can You Beat A.J. Dillon?</h1><span className="statusDot"/></div><button>⌄</button><HelpCircle/></header>
   <div className="competitionTabs"><button className="active" onClick={()=>openDay(day)}>Missions <i>{done.filter(Boolean).length}</i></button><button>Portfolio</button><button>Earn</button><button>Trade</button><button>Standings</button></div>
   <div className="metrics"><span><Trophy/><b>#12/107</b></span><span><WalletCards/><b>$1,383.81</b></span><span><BarChart3/><b>$4,193.22</b></span><span><Clock3/><b>Ends in 7d 08:24:43</b></span></div>
   <div className="missionTop"><span className="streak"><Zap/> New mission run</span><div><small>COMPETITION MISSIONS</small><h2>Your 14-day run</h2><p>Complete timed challenges to learn the competition, improve your portfolio, and keep your streak alive.</p></div><div className="missionStats"><span><b>{done.filter(Boolean).length}</b> completed</span><span><b>0</b> perfect days</span><span><b>{done.filter(Boolean).length*42}</b> mission points</span></div></div>
   <section className="journey">
    <div className="path"/>
    {days.map((d,i)=>{const n=i+1,state=n<day?'past':n===day?'current':'future';return <article key={n} className={'node '+state+' '+(i%2?'right':'left')+(selected===n?' selected':'')} onClick={()=>openDay(n)}>
      <button className="orb">{state==='past'?<Check/>:state==='current'?<Zap/>:<LockKeyhole/>}</button>
      <div className="dayCard"><div><span>DAY {n}</span><small>{state==='past'?d[0]+' MISSIONS':state==='current'?'IN PROGRESS':n===14?'CHAMPIONSHIP':'LOCKED'}</small></div>
       {state==='past'&&<><h3>{d[1]}</h3><p><Check/> {d[2]} points earned</p></>}
       {state==='current'&&<><h3>Today’s missions</h3><p><Clock3/> {mission.window} mission live</p></>}
       {state==='future'&&<><h3>{n===14?'Final challenge':'Mission hidden'}</h3><p><LockKeyhole/> Reveals when active</p></>}
      </div>
      {n===7&&<label><Gift/> HALFWAY REWARD</label>}{n===14&&<label><Trophy/> FINAL REWARD</label>}
    </article>})}
   </section>
   {selected===day&&<section className="livePanel" id="active-mission">
    <div className="panelHeader"><div><span><i/> LIVE NOW · {mission.window.toUpperCase()}</span><h2>{mission.title}</h2><p>{mission.short}</p></div><div className="timer"><small>EXPIRES IN</small><b>{clock}</b><em>{mission.time}</em></div></div>
    <div className="missionWindows">{missions.map((m,i)=>{const state=done[i]?'done':i===slot?'live':'locked';return <button key={m.window} className={state} onClick={()=>state!=='locked'&&(setSlot(i),setBrief(true))}>{state==='done'?<Check/>:state==='locked'?<LockKeyhole/>:<Clock3/>}<span><small>{m.window}</small><b>{state==='locked'?'Reveals when active':m.title}</b></span></button>})}</div>
    <div className="brief">
     <button className="briefToggle" onClick={()=>setBrief(!brief)}><span><HelpCircle/><b>Mission brief</b><small>Learn why this matters and how to complete it</small></span><ChevronDown className={brief?'open':''}/></button>
     {brief&&<div className="briefBody"><div className="lesson"><span>HOW TO COMPLETE IT</span><p>{mission.brief}</p><div className="tip"><Sparkles/><p><b>Competition tip</b>Mission actions use your competition portfolio, balance, packs, and Trade window. They never take you outside this competition.</p></div></div><div className="objective"><small>OBJECTIVE</small><b>{mission.count}</b><div className="bar"><i style={{width:done[slot]?'100%':'35%'}}/></div><span><Gift/> Reward: 42 Mission Points</span><button onClick={finish}>{done[slot]?<><Check/> Mission complete</>:<>{mission.action}<ChevronRight/></>}</button></div></div>}
    </div>
   </section>}
   {selected<day&&<section className="daySummary"><Check/><div><small>DAY {selected} OUTCOME</small><h2>{days[selected-1][1]}</h2><p>{days[selected-1][0]} missions completed · {days[selected-1][2]} Mission Points earned</p></div><button onClick={()=>setSelected(day)}>Return to today</button></section>}
   {selected>day&&<section className="daySummary lockedSummary"><LockKeyhole/><div><small>DAY {selected} PREVIEW</small><h2>{selected===14?'Championship day':'A new challenge awaits'}</h2><p>Exact mission details stay hidden until each time window becomes active.</p></div><button onClick={()=>setSelected(day)}>Return to today</button></section>}
  </main>
  <button className="demoReset" onClick={reset}><RotateCcw/> Reset demo</button>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
