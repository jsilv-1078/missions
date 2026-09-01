'use client'

import {useMemo,useState} from 'react'
import './gauge.css'

type Payload={card?:{cardId:string;title:string;subtitle?:string;imageUrl?:string;grade:string;currentFmv?:number};comps?:Array<{id:string;price:number;soldAt?:string;source?:string;url?:string}>;trendSummary?:{percentChange?:number;direction?:string;salesUsed?:number};liquidity?:{score:number;label:string;sales30:number;sales90:number;lastSaleDays:number};range30?:{low:number;high:number};gradingOpportunity?:{score?:number;recommendation:string;raw?:number;psa9?:number;psa10?:number;gradingCost:number;psa9Net?:number;psa10Net?:number};error?:string}
const grades=['Raw','PSA 10','PSA 9','SGC 10']
const money=(n?:number)=>n==null?'—':`$${n.toLocaleString('en-US',{maximumFractionDigits:0})}`

export default function GaugePage(){
 const [mode,setMode]=useState<'quick'|'cert'>('quick'),[q,setQ]=useState(''),[cert,setCert]=useState(''),[grade,setGrade]=useState('Raw'),[loading,setLoading]=useState(false),[data,setData]=useState<Payload|null>(null)
 const trend=useMemo(()=>data?.trendSummary?.percentChange,[data])
 async function run(){setLoading(true);setData(null);try{const sp=new URLSearchParams();if(mode==='cert')sp.set('cert',cert);else sp.set('q',q);sp.set('grade',grade);const r=await fetch(`/api/gauge?${sp.toString()}`,{cache:'no-store'});const j=await r.json();setData(j)}catch{setData({error:'Gauge is temporarily unavailable.'})}finally{setLoading(false)}}
 return <main className="gauge-shell">
  <header className="gauge-header"><div><p>GAUGE</p><h1>Know before you buy.</h1></div><span>LIVE</span></header>
  <section className="gauge-search">
   <div className="mode-row"><button className={mode==='quick'?'on':''} onClick={()=>setMode('quick')}>Card search</button><button className={mode==='cert'?'on':''} onClick={()=>setMode('cert')}>PSA cert</button></div>
   {mode==='quick'?<textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="Paste or type a card listing"/>:<input value={cert} onChange={e=>setCert(e.target.value)} placeholder="PSA certificate number"/>}
   <label>GRADE</label><div className="grade-row">{grades.map(g=><button key={g} className={grade===g?'on':''} onClick={()=>setGrade(g)}>{g}</button>)}</div>
   <button className="find" onClick={run} disabled={loading}>{loading?'Checking market…':'Find card'}</button>
  </section>
  {!data&&!loading?<section className="gauge-intro"><h2>One card. Four answers.</h2><div className="intro-grid"><span><b>Value</b>Current market value</span><span><b>Range</b>Recent sold range</span><span><b>Liquidity</b>How easily it sells</span><span><b>Grade Check</b>Potential grading upside</span></div></section>:null}
  {data?.error?<div className="error">{data.error}</div>:null}
  {data?.card?<>
   <section className="result-card">{data.card.imageUrl?<img src={data.card.imageUrl} alt=""/>:<div className="no-image">CARD</div>}<div><label>{data.card.grade}</label><h2>{data.card.title}</h2><p>{data.card.subtitle}</p></div></section>
   <section className="metric-card hero"><label>MARKET VALUE</label><h2>{money(data.card.currentFmv)}</h2><p>Current estimated value for {data.card.grade}</p><div className="range"><span>Recent low<b>{money(data.range30?.low)}</b></span><span>Recent high<b>{money(data.range30?.high)}</b></span></div></section>
   <section className="metric-card"><div className="metric-head"><div><label>LIQUIDITY</label><h2>{data.liquidity?.score?.toFixed(1)??'—'}<small>/10</small></h2></div><strong>{data.liquidity?.label??'—'}</strong></div><p>{data.liquidity?`${data.liquidity.sales90} sales in 90 days · latest sale ${data.liquidity.lastSaleDays===0?'today':`${data.liquidity.lastSaleDays}d ago`}`:'Not enough sales history'}</p></section>
   <section className="metric-card"><label>90-DAY TREND</label><h2 className={(trend??0)>=0?'up':'down'}>{trend==null?'—':`${trend>=0?'+':'−'}${Math.abs(trend).toFixed(1)}%`}</h2><p>Based on the earliest vs. most recent median sales windows.</p></section>
   {data.gradingOpportunity?<section className="metric-card grade-check"><div className="metric-head"><div><label>GRADE CHECK</label><h2>{data.gradingOpportunity.score?.toFixed(1)??'—'}<small>/10</small></h2></div><strong className={data.gradingOpportunity.recommendation==='GRADE'?'positive':'negative'}>{data.gradingOpportunity.recommendation}</strong></div><div className="grade-values"><span>Raw<b>{money(data.gradingOpportunity.raw)}</b></span><span>PSA 9<b>{money(data.gradingOpportunity.psa9)}</b></span><span>PSA 10<b>{money(data.gradingOpportunity.psa10)}</b></span></div><p>Uses current market values and an estimated $80 grading cost. Card condition is not assessed.</p></section>:null}
   <section className="sales"><div className="sales-head"><label>RECENT SALES</label><span>{data.comps?.length??0} shown</span></div>{(data.comps??[]).slice(0,5).map((s,i)=><div className="sale-row" key={`${s.id}-${i}`}><b>{money(s.price)}</b><span>{s.soldAt?new Date(s.soldAt).toLocaleDateString():'Recent'}</span><span>{s.source??'Sold'}</span></div>)}</section>
  </>:null}
  <div className="nav-space"/>
  <nav className="gauge-nav" style={{gridTemplateColumns:'repeat(6,1fr)'}}><a href="/">∿<small>Pulse</small></a><a href="/market">⌁<small>Market</small></a><button className="scan" aria-label="Scan card"><img src="/IMG_4838.jpeg" alt=""/></button><a href="/collection-demo?view=collection">▥<small>My Collection</small></a><a className="on" href="/gauge">◎<small>Gauge</small></a><button>☰<small>More</small></button></nav>
 </main>
}
