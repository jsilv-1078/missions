'use client'

import { useEffect,useMemo,useState } from 'react'
import AppNav from '../components/AppNav'
import './market.css'

type LiveCard={id:string;name:string;meta?:string;category:string;value:number;move7:number;move30:number;sales7:number;sales30:number;rank?:number}
type SportActive={Basketball?:LiveCard[];Football?:LiveCard[];Baseball?:LiveCard[];Hockey?:LiveCard[]}
type LiveData={live:boolean;updatedAt:string;error?:string;cm100?:LiveCard[];sportActive?:SportActive}
type MarketRow={name:keyof SportActive;change:number;sales:number;cards:number;pricedCards:number;rising:number;falling:number}
const sports:['Basketball','Football','Baseball','Hockey']=['Basketball','Football','Baseball','Hockey']
function num(n:number){return Math.round(n).toLocaleString('en-US')}
function pct(n:number){return `${n>=0?'+':'−'}${Math.abs(n).toFixed(2)}%`}
function median(values:number[]){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function validMove(n:number){return Number.isFinite(n)&&n!==0&&Math.abs(n)<=100}

export default function MarketPage(){
 const [data,setData]=useState<LiveData|null>(null)
 useEffect(()=>{let stop=false;const load=async()=>{try{const r=await fetch('/api/collection-demo/live',{cache:'no-store'});const j=await r.json();if(!stop)setData(j)}catch{if(!stop)setData({live:false,updatedAt:new Date().toISOString()})}};load();const id=setInterval(load,120000);return()=>{stop=true;clearInterval(id)}},[])

 const cm100=data?.cm100??[]
 const cmStats=useMemo(()=>{const moves=cm100.map(c=>c.move7).filter(validMove);const rising=moves.filter(n=>n>0).length;const falling=moves.filter(n=>n<0).length;return{move:median(moves),sales:cm100.reduce((s,c)=>s+c.sales7,0),pricedCards:moves.length,rising,falling,breadth:moves.length?Math.round(rising/moves.length*100):0}},[cm100])

 const rows=useMemo<MarketRow[]>(()=>sports.map(name=>{const cards=(data?.sportActive?.[name]??[]).filter(c=>c.sales7>0);const moves=cards.map(c=>c.move7).filter(validMove);const rising=moves.filter(x=>x>0).length;const falling=moves.filter(x=>x<0).length;return{name,change:median(moves),sales:cards.reduce((s,c)=>s+c.sales7,0),cards:cards.length,pricedCards:moves.length,rising,falling}}),[data])

 const composition=useMemo(()=>sports.map(name=>({name,count:cm100.filter(c=>c.category===name).length})).filter(x=>x.count>0),[cm100])
 const updated=data?.updatedAt?new Date(data.updatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):''

 return <main className="market-shell">
  <header className="market-header"><div><p>MARKETS</p><h1>Trading card market</h1></div><span className="market-updated">{data?.live?`Updated ${updated}`:'Updating…'}</span></header>

  <section className="overall-index">
   <div className="index-top"><div><label>CM100</label><h2>{cmStats.pricedCards?pct(cmStats.move):'—'}</h2><strong className={cmStats.move>=0?'up':'down'}><small>Median 7-day price movement · {cmStats.pricedCards} cards with price history</small></strong></div><span>7D</span></div>
   <p>The 100 most actively traded sports cards over the last 7 days.</p>
   <div className="overall-stats"><span>7D sales<b>{cm100.length?num(cmStats.sales):'—'}</b></span><span>Active cards<b>{cm100.length?num(cm100.length):'—'}</b></span></div>
   {cmStats.pricedCards?<><div className="breadth"><i style={{width:`${cmStats.breadth}%`}}/></div><div className="breadth-labels"><span>{cmStats.rising} rising</span><span>{cmStats.falling} falling</span></div></>:null}
   <a className="market-open" href="#most-active"><span>View most active cards</span><b>›</b></a>
  </section>

  <section className="market-list">
   <div className="section-title"><p>SPORT MARKETS</p><span>Most-active 7D sample</span></div>
   {rows.map(x=>{const breadth=x.pricedCards?Math.round(x.rising/x.pricedCards*100):0;return <a className="sport-index" key={x.name} href={`/market/${x.name.toLowerCase()}`}><div className="sport-main"><div><label>{x.name.toUpperCase()}</label><h3>{x.name}</h3><strong className={x.change>=0?'up':'down'}>{x.pricedCards?pct(x.change):'—'}</strong><span>{x.pricedCards?`Median 7D move · ${x.pricedCards} with price history`:'No usable 7D price history'}</span></div></div><div className="market-metrics"><span>7D sales<b>{x.cards?num(x.sales):'—'}</b></span><span>Breadth<b>{x.pricedCards?`${breadth}% ↑`:'—'}</b></span><span>Active cards<b>{x.cards?num(x.cards):'—'}</b></span></div><div className="market-open">View {x.name} market <b>›</b></div></a>})}
  </section>

  <section className="market-list" id="most-active">
   <div className="section-title"><p>MOST ACTIVE</p><span>Top CM100 cards</span></div>
   {cm100.slice(0,10).map((c,i)=><a className="sport-index" key={c.id} href={`/gauge?search=${encodeURIComponent(c.name+(c.meta?` ${c.meta}`:''))}`}><div className="sport-main"><div><label>#{i+1} · {c.category||'SPORTS'}</label><h3>{c.name}</h3><strong>{num(c.sales7)} sales</strong><span className={validMove(c.move7)?(c.move7>=0?'up':'down'):''}>{validMove(c.move7)?`${pct(c.move7)} · 7D`:'7D price move unavailable'}</span></div></div><div className="market-open">Research in Gauge <b>›</b></div></a>)}
  </section>

  {composition.length?<section className="method"><p>CM100 COMPOSITION</p><h3>Where trading activity is concentrated</h3>{composition.map(x=>{const share=Math.round(x.count/cm100.length*100);return <div key={x.name} className="market-open"><span>{x.name}</span><b>{share}%</b></div>})}</section>:null}

  <section className="method"><p>CM100 METHODOLOGY</p><h3>Activity first, valid price history second.</h3><p>CM100 ranks the 100 cards with the highest recorded 7-day sales count. Sales and rankings use all active cards. Median price movement and breadth use only cards with a usable, non-zero 7-day price change, so missing price history is not counted as a flat 0% move.</p></section>
  <div className="nav-space"/><AppNav active="market"/>
 </main>
}
