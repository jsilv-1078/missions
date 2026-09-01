'use client'

import { useEffect,useMemo,useState } from 'react'
import './market.css'

type LiveCard={id:string;name:string;category:string;value:number;displayValue:string;move7:number;move30:number;sales7:number;sales30:number}
type LiveData={live:boolean;updatedAt:string;error?:string;movers?:LiveCard[]}

type IndexRow={name:string;symbol:string;index:number;change:number;sales:number;volume:number;cards:number}

const fallback:IndexRow[]=[
 {name:'Basketball',symbol:'BASK',index:12481,change:4.82,sales:184293,volume:38400000,cards:26773},
 {name:'Football',symbol:'FBALL',index:9742,change:1.76,sales:121508,volume:21700000,cards:19844},
 {name:'Baseball',symbol:'BASE',index:11206,change:-0.63,sales:166924,volume:29100000,cards:31872},
 {name:'Hockey',symbol:'HKY',index:7894,change:0.92,sales:45211,volume:6800000,cards:12904},
]

function moneyCompact(n:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(n)}
function num(n:number){return Math.round(n).toLocaleString('en-US')}
function pct(n:number){return `${n>=0?'+':'−'}${Math.abs(n).toFixed(2)}%`}

function spark(change:number){
 const up=change>=0
 return up?'M3 46 C20 44,28 52,44 42 S68 35,82 38 S105 30,120 34 S145 17,166 22 S193 10,217 12 S244 4,277 8':'M3 10 C22 12,32 7,48 16 S76 21,91 18 S116 26,132 24 S156 35,176 31 S206 42,224 38 S251 48,277 44'
}

export default function MarketPage(){
 const [data,setData]=useState<LiveData|null>(null)
 const [period,setPeriod]=useState<'7D'|'30D'>('7D')
 useEffect(()=>{let stop=false;const load=async()=>{try{const r=await fetch('/api/collection-demo/live',{cache:'no-store'});const j=await r.json();if(!stop)setData(j)}catch{if(!stop)setData({live:false,updatedAt:new Date().toISOString()})}};load();const id=setInterval(load,120000);return()=>{stop=true;clearInterval(id)}},[])
 const indexes=useMemo(()=>{
   const cards=(data?.movers??[]).filter(c=>c.sales30>=5&&Math.abs(period==='7D'?c.move7:c.move30)<=100)
   if(!cards.length)return fallback
   return ['Basketball','Football','Baseball','Hockey'].map((sport,i)=>{
     const group=cards.filter(c=>c.category===sport)
     if(!group.length)return fallback[i]
     const change=group.reduce((s,c)=>s+(period==='7D'?c.move7:c.move30),0)/group.length
     const sales=group.reduce((s,c)=>s+(period==='7D'?c.sales7:c.sales30),0)
     const volume=group.reduce((s,c)=>s+c.value*(period==='7D'?c.sales7:c.sales30),0)
     return {name:sport,symbol:fallback[i].symbol,index:Math.round(10000*(1+change/100)),change,sales,volume,cards:group.length}
   })
 },[data,period])
 const overall=useMemo(()=>{
   const change=indexes.reduce((s,x)=>s+x.change,0)/indexes.length
   return {index:Math.round(10000*(1+change/100)),change,sales:indexes.reduce((s,x)=>s+x.sales,0),volume:indexes.reduce((s,x)=>s+x.volume,0)}
 },[indexes])
 return <main className="market-shell">
   <header className="market-header"><div><p>MARKETS</p><h1>Trading card market</h1></div><span className={data?.live?'live':'live off'}>{data?.live?'● LIVE':'DEMO'}</span></header>
   <div className="period-switch">{(['7D','30D'] as const).map(p=><button key={p} className={period===p?'on':''} onClick={()=>setPeriod(p)}>{p}</button>)}</div>
   <section className="overall-index"><div className="index-top"><div><label>CARD MARKET INDEX</label><h2>{num(overall.index)}</h2><strong className={overall.change>=0?'up':'down'}>{pct(overall.change)} <small>{period}</small></strong></div><span>CMI</span></div><svg viewBox="0 0 280 58" aria-label="Card market index trend"><path d={spark(overall.change)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg><div className="overall-stats"><span>Sales<b>{num(overall.sales)}</b></span><span>Volume<b>{moneyCompact(overall.volume)}</b></span></div></section>
   <section className="market-list"><div className="section-title"><p>SPORT INDEXES</p><span>{period} performance</span></div>{indexes.map(x=><article className="sport-index" key={x.name}><div className="sport-main"><div><label>{x.symbol}</label><h3>{x.name}</h3><strong>{num(x.index)}</strong><span className={x.change>=0?'up':'down'}>{pct(x.change)} {period}</span></div><svg viewBox="0 0 280 58"><path d={spark(x.change)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg></div><div className="market-metrics"><span>Sales<b>{num(x.sales)}</b></span><span>Volume<b>{moneyCompact(x.volume)}</b></span><span>Tracked<b>{num(x.cards)}</b></span></div></article>)}</section>
   <section className="method"><p>ABOUT THESE INDEXES</p><h3>Built like market benchmarks.</h3><p>Each sport is normalized around a 10,000-point Card Madness index. The live POC uses Card Hedge price movement and sales activity, with low-liquidity and extreme outlier movers filtered from the calculation.</p></section>
   <div className="nav-space"/><nav className="market-nav"><a href="/">∿<small>Pulse</small></a><a className="on" href="/market">⌁<small>Market</small></a><button className="scan">▣</button><a href="/collection-demo?view=collection">▥<small>My Collection</small></a><button>☰<small>More</small></button></nav>
 </main>
}
