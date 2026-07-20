import React,{useEffect,useState}from'react';
import{createRoot}from'react-dom/client';
import{ArrowLeft,BarChart3,Check,ChevronDown,ChevronRight,Clock3,Coins,Gift,HelpCircle,LockKeyhole,Menu,ShoppingCart,Sparkles,Trophy,WalletCards,Zap}from'lucide-react';
import'./styles.css';

const days=[
 ['3/3','Perfect day',60],['2/3','Strong finish',38],['3/3','Perfect day',66],['3/3','Perfect day',72],
 ['1/3','One complete',18],['3/3','Perfect day',84],['2/3','Two complete',52],['3/3','Perfect day',90],
 ['3/3','Perfect day',96],['2/3','Two complete',64],['3/3','Perfect day',108],['3/3','Perfect day',114],
 ['2/3','Two complete',78],['3/3','Championship',150]
];
const missions=[
 {window:'Morning',time:'8:00 AM - 12:00 PM',title:'Review your five lowest-performing cards',short:'Identify opportunities before the market moves.',brief:'Your Portfolio contains every active card you have collected by opening packs or buying from the Trade window. Open your Portfolio and sort by performance to find the five cards that have lost the most value. Reviewing these cards helps you decide whether to hold for a recovery or sell and put your competition balance to work elsewhere.',action:'View portfolio',count:'5 cards reviewed'},
 {window:'Afternoon',time:'12:00 PM - 4:00 PM',title:'Sell a card from your portfolio',short:'Lock in a result and free up competition balance.',brief:'In your Portfolio you will find all the active cards you have collected from opening packs or buying from the Trade window. Enter your Portfolio and sell one card to complete this mission. Selling locks in the profit or loss on that card, and the virtual currency from the sale is deposited into your competition account balance. Hold that balance, buy another card, or open an Aura Pack - the next move is yours.',action:'Go to portfolio',count:'0 of 1 sold'},
 {window:'Evening',time:'4:00 PM - 8:00 PM',title:'Reinvest your competition balance',short:'Use today’s sale to make your next strategic move.',brief:'Your available balance appears in the competition status bar and increases when you sell a card. Visit the Trade window to research cards available in this competition, then buy one card that fits your strategy. You may also use the balance for an Aura Pack. Either action keeps your resources working inside the competition.',action:'Open trade window',count:'Available at 4 PM'}
];

function App(){
 const[day,setDay]=useState(8),[slot,setSlot]=useState(1),[done,setDone]=useState([true,false,false]),[seconds,setSeconds]=useState(4127),[selected,setSelected]=useState(8),[brief,setBrief]=useState(true);
 useEffect(()=>{const id=setInterval(()=>setSeconds(s=>s?s-1:14399),1000);return()=>clearInterval(id)},[]);
 useEffect(()=>setSelected(day),[day]);
 const clock=new Date(seconds*1000).toISOString().slice(11,19),mission=missions[slot],finish=()=>setDone(v=>v.map((x,i)=>i===slot||x));
 return <div className="app">
  <nav className="global">
   <img className="fullLogo" src="/brand/card-madness-full.svg" alt="Card Madness"/><img className="symbolLogo" src="/brand/card-madness-symbol.svg" alt="Card Madness"/>
   <div className="navlinks"><a>Today</a><a className="active">Competitions</a><a>Collection</a><a>Shop</a><a>How to play</a><a>Profile</a><a>Admin</a></div>
   <div className="navtools"><span><Coins/>19,105</span><ShoppingCart/><Menu/></div>
  </nav>
  <main>
   <div className="back"><ArrowLeft/> Today</div>
   <header><button>‹</button><div><h1>CardMadness Free 114: Can You Beat A.J. Dillon?</h1><span className="statusDot"/></div><button>⌄</button><HelpCircle/></header>
   <div className="competitionTabs"><button>Portfolio</button><button>Earn</button><button>Trade</button><button>Standings</button><button className="active">Missions <i>{done.filter(Boolean).length}</i></button></div>
   <div className="metrics"><span><Trophy/><b>#12/107</b></span><span><WalletCards/><b>$1,383.81</b></span><span><BarChart3/><b>$4,193.22</b></span><span><Clock3/><b>Ends in 7d 08:24:43</b></span></div>
   <div className="missionTop"><span className="streak"><Zap/> 38-day streak</span><div><small>COMPETITION MISSIONS</small><h2>Your 14-day run</h2><p>Complete timed challenges to learn the competition, improve your portfolio, and keep your streak alive.</p></div><div className="missionStats"><span><b>18</b> completed</span><span><b>5</b> perfect days</span><span><b>478</b> mission points</span></div></div>
   <section className="journey">
    <div className="path"/>
    {days.map((d,i)=>{const n=i+1,state=n<day?'past':n===day?'current':'future';return <article key={n} className={'node '+state+' '+(i%2?'right':'left')+(selected===n?' selected':'')} onClick={()=>setSelected(n)}>
      <button className="orb">{state==='past'?<Check/>:state==='current'?<Zap/>:<LockKeyhole/>}</button>
      <div className="dayCard"><div><span>DAY {n}</span><small>{state==='past'?d[0]+' MISSIONS':state==='current'?'IN PROGRESS':n===14?'CHAMPIONSHIP':'LOCKED'}</small></div>
       {state==='past'&&<><h3>{d[1]}</h3><p><Check/> {d[2]} points earned</p></>}
       {state==='current'&&<><h3>Today’s missions</h3><p><Clock3/> {mission.window} mission live</p></>}
       {state==='future'&&<><h3>{n===14?'Final challenge':'Mission hidden'}</h3><p><LockKeyhole/> Reveals when active</p></>}
      </div>
      {n===7&&<label><Gift/> HALFWAY REWARD</label>}{n===14&&<label><Trophy/> FINAL REWARD</label>}
    </article>})}
   </section>
   {selected===day&&<section className="livePanel">
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
  <div className="controls"><small>PROTOTYPE</small><label>Day <select value={day} onChange={e=>{setDay(+e.target.value);setDone([true,false,false])}}>{days.map((_,i)=><option key={i}>{i+1}</option>)}</select></label><button onClick={finish}>Complete mission</button></div>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
