'use client'

import {useEffect,useMemo,useState} from 'react'
import {useParams} from 'next/navigation'
import AppNav from '../../components/AppNav'
import '../market.css'
import './sport.css'

type Card={id:string;name:string;meta?:string;category:string;value:number;move7:number;move30:number;sales7:number;sales30:number;rank?:number}
type Data={live:boolean;updatedAt:string;sportActive?:Record<string,Card[]>}
const pretty=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1)
const pct=(n:number)=>`${n>=0?'+':'−'}${Math.abs(n).toFixed(2)}%`
const num=(n:number)=>Math.round(n).toLocaleString('en-US')
function median(values:number[]){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}
function validMove(n:number){return Number.isFinite(n)&&n!==0&&Math.abs(n)<=100}

export default function SportMarketPage(){
 const params=useParams<{sport:string}>(),sport=pretty(params.sport||'basketball')
 const [period,setPeriod]=useState<'7D'|'30D'>('7D'),[data,setData]=useState<Data|null>(null)
 useEffect(()=>{fetch('/api/collection-demo/live',{cache:'no-store'}).then(r=>r.json()).then(setData).catch(()=>setData({live:false,updatedAt:new Date().toISOString()}))},[])
 const cards=useMemo(()=>(data?.sportActive?.[sport]??[]).filter(c=>c.sales7>0),[data,sport])
 const stats=useMemo(()=>{const moves=cards.map(c=>period==='7D'?c.move7:c.move30).filter(validMove);const change=median(moves);const sales=cards.reduce((s,c)=>s+(period==='7D'?c.sales7:c.sales30),0);const rising=moves.filter(x=>x>0).length;const falling=moves.filter(x=>x<0).length;return {change,sales,rising,falling,pricedCards:moves.length}},[cards,period])
 const breadth=stats.pricedCards?Math.round(stats.rising/stats.pricedCards*100):0
 return <main className="market-shell sport-page">
  <header className="market-header"><div><p>{sport.toUpperCase()} MARKET</p><h1>{sport}</h1></div><a className="sport-back" href="/market">‹ Markets</a></header>
  <div className="period-switch">{(['7D','30D'] as const).map(p=><button key={p} className={period===p?'on':''} onClick={()=>setPeriod(p)}>{p}</button>)}</div>
  <section className="overall-index"><div className="index-top"><div><label>MEDIAN PRICE MOVEMENT</label><h2>{stats.pricedCards?pct(stats.change):'—'}</h2><strong className={stats.change>=0?'up':'down'}><small>{period} · {stats.pricedCards} cards with price history</small></strong></div></div><div className="overall-stats"><span>Observed sales<b>{cards.length?num(stats.sales):'—'}</b></span><span>Active cards<b>{cards.length?num(cards.length):'—'}</b></span></div></section>
  <section className="sport-stats"><label>MARKET BREADTH</label><h2>{stats.pricedCards?`${breadth}% rising`:'No usable price history'}</h2>{stats.pricedCards?<><div className="breadth"><i style={{width:`${breadth}%`}}/></div><div className="breadth-labels"><span>{stats.rising} rising</span><span>{stats.falling} falling</span></div></>:null}</section>
  <section className="market-list"><div className="section-title"><p>MOST ACTIVE</p><span>Ranked by 7D sales</span></div>{cards.slice(0,20).map((c,i)=>{const move=period==='7D'?c.move7:c.move30;return <a className="sport-index" key={c.id} href={`/gauge?search=${encodeURIComponent(c.name+(c.meta?` ${c.meta}`:''))}`}><div className="sport-main"><div><label>#{i+1}</label><h3>{c.name}</h3><strong>{num(c.sales7)} sales</strong><span className={validMove(move)?(move>=0?'up':'down'):''}>{validMove(move)?`${pct(move)} · ${period}`:`${period} price move unavailable`}</span></div></div><div className="market-open">Research in Gauge <b>›</b></div></a>})}</section>
  <section className="method"><p>HOW TO READ THIS</p><h3>Activity-based market view.</h3><p>This page ranks up to 100 of the most actively traded {sport.toLowerCase()} cards by recorded 7-day sales. Sales and rankings include all active cards. Median movement and market breadth use only cards with a usable, non-zero {period} price change, so unavailable price history is not treated as 0% movement.</p></section>
  <div className="nav-space"/><AppNav active="market"/>
 </main>
}
