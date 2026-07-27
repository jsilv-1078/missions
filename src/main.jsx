import React,{useState}from'react';
import{createRoot}from'react-dom/client';
import{ArrowRight,BarChart3,Check,ChevronRight,Coins,Crown,Home,Layers3,Lightbulb,PackageOpen,ShoppingCart,Sparkles,Target,TrendingDown,TrendingUp,Trophy,UserRound,WalletCards,X}from'lucide-react';
import'./styles.css';

const steps=[
 {phase:'COLLECT',title:'Open your Daily Pack',copy:'Five new cards are waiting for you.',action:'Open pack',icon:PackageOpen},
 {phase:'COLLECT',title:'Play Guess the Price',copy:'Get it right to unlock a Reward Pack.',action:'Play now',icon:Target},
 {phase:'MANAGE',title:'Review your portfolio',copy:'Two cards need your attention today.',action:'Review cards',icon:WalletCards},
 {phase:'MANAGE',title:'Explore the Trade Window',copy:'You have 1,240 Mad Coin available.',action:'Find opportunities',icon:ShoppingCart},
 {phase:'COMPETE',title:'Check your position',copy:'You are only $126 from the prize zone.',action:'View leaderboard',icon:Crown}
];
const insights=[
 {tone:'up',icon:TrendingUp,label:'MOMENTUM',title:'Three cards gained value',copy:'Your portfolio is up $54.16 today. CeeDee Lamb is leading at +9.23%.',action:'See todayâ€™s movers'},
 {tone:'down',icon:TrendingDown,label:'WATCHLIST',title:'Two cards are losing ground',copy:'They are down more than 5% over the last three days. Review before you make your next move.',action:'Review these cards'},
 {tone:'coin',icon:Coins,label:'OPPORTUNITY',title:'Buying power available',copy:'You have more available Mad Coin than most players near your rank.',action:'Open Trade Window'}
];

function App(){
 const[tab,setTab]=useState('coach'),[done,setDone]=useState([true,false,false,false,false]),[open,setOpen]=useState(true);
 const next=done.findIndex(x=>!x),complete=i=>setDone(v=>v.map((x,n)=>n===i?true:x));
 return <div className="app">
  <div className="iosStatus"><span>9:41</span><b>â— â— â–°</b></div>
  <nav><div className="brand"><i>CM</i><b>CARD <span>MADNESS</span></b></div><div className="tools"><span><Coins/>19,105</span><button><UserRound/></button></div></nav>
  <main>
   <header><div><small>MONDAY Â· JULY 27</small><h1>Today</h1></div><button className="rank"><Crown/><span><small>YOUR RANK</small><b>#18</b></span><em>â†‘ 3</em></button></header>
   <div className="tabs">{[['coach','Coach'],['packs','Packs'],['highlights','PC Highlights'],['opportunities','Opportunities']].map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{id==='coach'&&<Sparkles/>}{label}{id==='coach'&&<i>3</i>}</button>)}</div>
   {tab!=='coach'?<section className="placeholder"><Sparkles/><h2>{tab==='packs'?'Your packs are ready':tab==='highlights'?'Your collection is moving':'New opportunities are waiting'}</h2><p>This tab remains available alongside Coach. Coach brings the most useful updates and next actions into one daily briefing.</p><button onClick={()=>setTab('coach')}>Back to Coach</button></section>:<>
    {open&&<section className="coachHero"><button className="close" onClick={()=>setOpen(false)}><X/></button><div className="coachFace"><UserRound/><i><Sparkles/></i></div><div className="briefing"><span>YOUR DAILY BRIEFING</span><h2>Good morning, Jeff. Letâ€™s make a move.</h2><p>You climbed <b>3 places</b> overnight. Youâ€™re now <strong>$126 from the prize zone</strong>, and two cards in your portfolio deserve a closer look.</p><div className="heroActions"><button onClick={()=>document.getElementById('insights').scrollIntoView({behavior:'smooth'})}>Show me what changed <ArrowRight/></button><small>Coach uses your portfolio, competition, and market activity to prioritize todayâ€™s best next steps.</small></div></div></section>}
    {!open&&<button className="reopen" onClick={()=>setOpen(true)}><Sparkles/> Open todayâ€™s Coach briefing</button>}
    <section className="loop">
     <div className="sectionHead"><div><small>TODAYâ€™S GAME PLAN</small><h2>Collect. Manage. Compete.</h2><p>A recommended pathâ€”not a requirement. Complete it in any order.</p></div><div className="progress"><b>{done.filter(Boolean).length}/{steps.length}</b><span>steps reviewed</span></div></div>
     <div className="progressBar"><i style={{width:`${done.filter(Boolean).length/steps.length*100}%`}}/></div>
     <div className="stepList">{steps.map((s,i)=>{const Icon=s.icon,state=done[i]?'done':i===next?'next':'';return <article className={state} key={s.title}><div className="stepIcon">{done[i]?<Check/>:<Icon/>}</div><div className="stepCopy"><small>{s.phase}</small><h3>{s.title}</h3><p>{s.copy}</p></div>{i===next&&<span className="recommended">COACHâ€™S PICK</span>}<button onClick={()=>complete(i)}>{done[i]?'Reviewed':s.action}<ChevronRight/></button></article>})}</div>
    </section>
    <section className="insights" id="insights"><div className="sectionHead"><div><small>COACHâ€™S INSIGHTS</small><h2>What matters today</h2></div><button className="why"><Lightbulb/> How Coach decides</button></div><div className="insightGrid">{insights.map(x=>{const Icon=x.icon;return <article className={x.tone} key={x.title}><div className="insightTop"><span><Icon/></span><small>{x.label}</small></div><h3>{x.title}</h3><p>{x.copy}</p><button>{x.action}<ArrowRight/></button></article>})}</div></section>
    <section className="finish"><div><BarChart3/><span><small>COMPETITION SNAPSHOT</small><h3>One strong move could put you in the Top 15.</h3><p>#18 Â· $126 behind the prize zone Â· 6 days remaining</p></span></div><button>View competition <ArrowRight/></button></section>
   </>}
  </main>
  <div className="bottomNav"><button className="active"><Home/><span>Today</span></button><button><Trophy/><span>Compete</span></button><button className="coachTab"><i><Sparkles/></i><span>Coach</span></button><button><Layers3/><span>Collection</span></button><button><UserRound/><span>Profile</span></button></div>
 </div>
}
createRoot(document.getElementById('root')).render(<App/>);
