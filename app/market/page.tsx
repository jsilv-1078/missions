'use client'

import { useEffect,useMemo,useState } from 'react'
import AppNav from '../components/AppNav'
import './market.css'

type LiveCard={id:string;name:string;meta?:string;category:string;value:number;move7:number;move30:number;sales7:number;sales30:number;rank?:number}
type SportActive={Basketball?:LiveCard[];Football?:LiveCard[];Baseball?:LiveCard[];Hockey?:LiveCard[]}
type LiveData={live:boolean;updatedAt:string;error?:string;cm100?:LiveCard[];sportActive?:SportActive}
type MarketRow={name:keyof SportActive;change:number;sales:number;cards:number;rising:number;falling:number}
const sports:['Basketball','Football','Baseball','Hockey']=['Basketball','Football','Baseball','Hockey']
function num(n:number){return Math.round(n).toLocaleString('en-US')}
function pct(n:number){return `${n>=0?'+':'−'}${Math.abs(n).toFixed(2)}%`}
function median(values:number[]){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}

export default function MarketPage(){
 const [data,setData]=useState<LiveData|null>(null)
 useEffect(()=>{let stop=false;const load=async()=>{try{const r=await fetch('/api/collection-demo/live',{cache:'no-store'});const j=await r.json();if(!stop)setData(j)}catch{if(!stop)setData({live:false,updatedAt:new Date().toISOString()})}};load();const id=setInterval(load,120000);return()=>{stop=true;clearInterval(id)}},[])

 const cm100=data?.cm100??[]
 const cmStats=useMemo(()=>{const moves=cm100.map(c=>c.move7).filter(n=>Number.isFinite(n)&&Math.abs(n)<=100);const rising=moves.filter(n=>n>0).length;const falling=moves.filter(n=>n<0).length;return{move:median(moves),sales:cm100.reduce((s,c)=>s+c.sales7,0),rising,falling,breadth:moves.length?Math.round(rising/moves.length*100):0}},[cm100])

 const rows=useMemo<MarketRow[]>(()=>sports.map(name=>{const cards=(data?.sportActive?.[name]??[]).filter(c=>c.sales7>0&&Math.abs(c.move7)<=100);const moves=cards.map(c=>c.move7);const rising=moves.filter(x=>x>0).length;const falling=moves.filter(x=>x<0).length;return{name,change:median(moves),sales:cards.reduce((s,c)=>s+c.sales7,0),cards:cards.length,rising,falling}}),[data])

 const composition=useMemo(()=>sports.map(name=>({name,count:cm100.filter(c=>c.category===name).length})).filter(x=>x.count>0),[cm100])
 const updated=data?.updatedAt?new Date(data.updatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):''

 return <main className="market-shell">
  <header className="market-header"><div><p>MARKETS</p><h1>Trading card market</h1></div><span className="market-updated">{data?.live?`Updated ${updated}`:'Updating…'}</span></header>

  <section className="overall-index">
   <div className="index-top"><div><label>CM100</label><h2>{cm100.length?pct(cmStats.move):'—'}</h2><strong className={cmStats.move>=0?'up':'down'}><small>Median 7-day price movement</small></strong></div><span>7D</span></div>
   <p>The 100 most actively traded sports cards over the last 7 days.</p>
   <div className="overall-stats"><span>7D sales<b>{cm100.length?num(cmStats.sales):'—'}</b></span><span>Cards<b>{cm100.length?num(cm100.length):'—'}</b></span></div>
   {cm100.length?<><div className="breadth"><i style={{width:`${cmStats.breadth}%`}}/></div><div className="breadth-labels"><span>{cmStats.rising} rising</span><span>{cmStats.falling} falling</span></div></>:null}
   <a className="market-open" href="#most-active"><span>View most active cards</span><b>›</b></a>
  </section>

  <section className="market-list">
   <div className="section-title"><p>SPORT MARKETS</p><span>Most-active 7D sample</span></div>
   {rows.map(x=>{const breadth=x.cards?Math.round(x.rising/x.cards*100):0;return <a className="sport-index" key={x.name} href={`/market/${x.name.toLowerCase()}`}><div className="sport-main"><div><label>{x.name.toUpperCase()}</label><h3>{x.name}</h3><strong className={x.change>=0?'up':'down'}>{x.cards?pct(x.change):'—'}</strong><span>{x.cards?'Median 7D move':'No qualifying sample'}</span></div></div><div className="market-metrics"><span>7D sales<b>{x.cards?num(x.sales):'—'}</b></span><span>Breadth<b>{x.cards?`${breadth}% ↑`:'—'}</b></span><span>Cards<b>{x.cards?num(x.cards):'—'}</b></span></div><div className="market-open">View {x.name} market <b>›</b></div></a>})}
  </section>

  <section className="market-list" id="most-active">
   <div className="section-title"><p>MOST ACTIVE</p><span>Top CM100 cards</span></div>
   {cm100.slice(0,10).map((c,i)=><a className="sport-index" key={c.id} href={`/gauge?search=${encodeURIComponent(c.name+(c.meta?` ${c.meta}`:''))}`}><div className="sport-main"><div><label>#{i+1} · {c.category||'SPORTS'}</label><h3>{c.name}</h3><strong>{num(c.sales7)} sales</strong><span className={c.move7>=0?'up':'down'}>{pct(c.move7)} · 7D</span></div></div><div className="market-open">Research in Gauge <b>›</b></div></a>)}
  </section>

  {composition.length?<section className="method"><p>CM100 COMPOSITION</p><h3>Where trading activity is concentrated</h3>{composition.map(x=>{const share=Math.round(x.count/cm100.length*100);return <div key={x.name} className="market-open"><span>{x.name}</span><b>{share}%</b></div>})}</section>:null}

  <section className="method"><p>CM100 METHODOLOGY</p><h3>Activity first.</h3><p>CM100 ranks the 100 cards with the highest recorded 7-day sales count. The headline move is the median 7-day price change across qualifying CM100 cards, and market breadth shows how many are rising versus falling. Cards can enter or leave the CM100 as trading activity changes.</p></section>
  <div className="nav-space"/><AppNav active="market"/>
 </main>
}
