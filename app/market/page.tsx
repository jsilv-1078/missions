'use client'

import { useEffect,useMemo,useState } from 'react'
import AppNav from '../components/AppNav'
import './market.css'

type LiveCard={id:string;name:string;category:string;value:number;move7:number;move30:number;sales7:number;sales30:number}
type LiveData={live:boolean;updatedAt:string;error?:string;movers?:LiveCard[]}
type MarketRow={name:string;change:number;sales:number;activity:number;cards:number;rising:number;falling:number}
const sports=['Basketball','Football','Baseball','Hockey'] as const
function moneyCompact(n:number){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(n)}
function num(n:number){return Math.round(n).toLocaleString('en-US')}
function pct(n:number){return `${n>=0?'+':'−'}${Math.abs(n).toFixed(2)}%`}
function median(values:number[]){if(!values.length)return 0;const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2}

export default function MarketPage(){
 const [data,setData]=useState<LiveData|null>(null),[period,setPeriod]=useState<'7D'|'30D'>('30D')
 useEffect(()=>{let stop=false;const load=async()=>{try{const r=await fetch('/api/collection-demo/live',{cache:'no-store'});const j=await r.json();if(!stop)setData(j)}catch{if(!stop)setData({live:false,updatedAt:new Date().toISOString()})}};load();const id=setInterval(load,120000);return()=>{stop=true;clearInterval(id)}},[])
 const rows=useMemo<MarketRow[]>(()=>sports.map(name=>{const group=(data?.movers??[]).filter(c=>c.category===name&&c.sales30>=5&&Math.abs(period==='7D'?c.move7:c.move30)<=100);const moves=group.map(c=>period==='7D'?c.move7:c.move30);const sales=group.reduce((s,c)=>s+(period==='7D'?c.sales7:c.sales30),0);const activity=group.reduce((s,c)=>s+c.value*(period==='7D'?c.sales7:c.sales30),0);return{name,change:median(moves),sales,activity,cards:group.length,rising:moves.filter(x=>x>0).length,falling:moves.filter(x=>x<0).length}}),[data,period])
 const active=rows.filter(x=>x.cards>0)
 const overall=useMemo(()=>({change:median(active.map(x=>x.change)),sales:active.reduce((s,x)=>s+x.sales,0),activity:active.reduce((s,x)=>s+x.activity,0),cards:active.reduce((s,x)=>s+x.cards,0)}),[active])
 const updated=data?.updatedAt?new Date(data.updatedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):''
 return <main className="market-shell"><header className="market-header"><div><p>MARKETS</p><h1>Trading card market</h1></div><span className="market-updated">{data?.live?`Updated ${updated}`:'Updating…'}</span></header><div className="period-switch">{(['7D','30D'] as const).map(p=><button key={p} className={period===p?'on':''} onClick={()=>setPeriod(p)}>{p}</button>)}</div><section className="overall-index"><div className="index-top"><div><label>MARKET SNAPSHOT</label><h2>{active.length?pct(overall.change):'—'}</h2><strong className={overall.change>=0?'up':'down'}><small>Median {period} price movement</small></strong></div></div><div className="overall-stats"><span>Observed sales<b>{num(overall.sales)}</b></span><span>Observed activity<b>{moneyCompact(overall.activity)}</b></span></div><p className="market-updated">Based only on qualifying card markets returned in the current sample.</p></section><section className="market-list"><div className="section-title"><p>SPORT MARKETS</p><span>{period} observed activity</span></div>{rows.map(x=>{const breadth=x.cards?Math.round(x.rising/x.cards*100):0;return <a className="sport-index" key={x.name} href={`/market/${x.name.toLowerCase()}`}><div className="sport-main"><div><label>{x.name.toUpperCase()}</label><h3>{x.name}</h3><strong>{x.cards?pct(x.change):'—'}</strong><span className={x.change>=0?'up':'down'}>{x.cards?`Median ${period} move`:'No qualifying sample'}</span></div></div><div className="market-metrics"><span>Sales<b>{x.cards?num(x.sales):'—'}</b></span><span>Activity<b>{x.cards?moneyCompact(x.activity):'—'}</b></span><span>Breadth<b>{x.cards?`${breadth}% ↑`:'—'}</b></span></div><div className="market-open">View {x.name} market <b>›</b></div></a>})}</section><section className="method"><p>ABOUT THIS VIEW</p><h3>Observed market data, not an invented index.</h3><p>Price movement is shown as the median change among qualifying cards in the current data sample. Sales are recorded sales counts. Activity is an estimate based on current card value multiplied by observed sales and should not be read as actual transaction volume.</p></section><div className="nav-space"/><AppNav active="market"/></main>
}
