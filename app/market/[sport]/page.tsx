'use client'

import {useEffect,useMemo,useState} from 'react'
import {useParams} from 'next/navigation'
import AppNav from '../../components/AppNav'
import '../market.css'
import './sport.css'

type Card={id:string;name:string;category:string;value:number;move7:number;move30:number;sales7:number;sales30:number;grade?:string;displayValue?:string}
type Data={live:boolean;updatedAt:string;movers?:Card[]}
const pretty=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1)
const pct=(n:number)=>`${n>=0?'+':'−'}${Math.abs(n).toFixed(2)}%`
const num=(n:number)=>Math.round(n).toLocaleString('en-US')
const money=(n:number)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:1}).format(n)

export default function SportMarketPage(){
 const params=useParams<{sport:string}>(),sport=pretty(params.sport||'basketball')
 const [period,setPeriod]=useState<'7D'|'30D'>('7D'),[data,setData]=useState<Data|null>(null)
 useEffect(()=>{fetch('/api/collection-demo/live',{cache:'no-store'}).then(r=>r.json()).then(setData).catch(()=>setData({live:false,updatedAt:new Date().toISOString()}))},[])
 const cards=useMemo(()=>(data?.movers??[]).filter(c=>c.category?.toLowerCase()===sport.toLowerCase()&&c.sales30>=5&&Math.abs(period==='7D'?c.move7:c.move30)<=100),[data,sport,period])
 const stats=useMemo(()=>{const change=cards.length?cards.reduce((s,c)=>s+(period==='7D'?c.move7:c.move30),0)/cards.length:0;const sales=cards.reduce((s,c)=>s+(period==='7D'?c.sales7:c.sales30),0);const volume=cards.reduce((s,c)=>s+c.value*(period==='7D'?c.sales7:c.sales30),0);const rising=cards.filter(c=>(period==='7D'?c.move7:c.move30)>0).length;const falling=cards.filter(c=>(period==='7D'?c.move7:c.move30)<0).length;return {change,index:Math.round(10000*(1+change/100)),sales,volume,rising,falling}},[cards,period])
 return <main className="market-shell sport-page"><header className="market-header"><div><p>{sport.toUpperCase()} MARKET</p><h1>{sport} index</h1></div><a className="sport-back" href="/market">‹ Markets</a></header><div className="period-switch">{(['7D','30D'] as const).map(p=><button key={p} className={period===p?'on':''} onClick={()=>setPeriod(p)}>{p}</button>)}</div><section className="overall-index"><div className="index-top"><div><label>{sport.toUpperCase()} INDEX</label><h2>{num(stats.index)}</h2><strong className={stats.change>=0?'up':'down'}>{pct(stats.change)} <small>{period}</small></strong></div></div><svg viewBox="0 0 360 110"><path d={stats.change>=0?'M4 88 C40 83,56 95,87 76 S135 70,164 58 S215 42,244 48 S298 26,356 18':'M4 18 C40 24,56 14,87 34 S135 39,164 52 S215 63,244 58 S298 82,356 90'} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/></svg><div className="overall-stats"><span>Sales<b>{num(stats.sales)}</b></span><span>Volume<b>{money(stats.volume)}</b></span></div></section><section className="sport-stats"><label>MARKET BREADTH</label><h2>{cards.length?Math.round(stats.rising/cards.length*100):0}% rising</h2><div className="breadth"><i style={{width:`${cards.length?stats.rising/cards.length*100:0}%`}}/></div><div className="breadth-labels"><span>{stats.rising} rising</span><span>{stats.falling} falling</span></div></section><section className="sport-stats"><label>MARKET COVERAGE</label><h2>{num(cards.length)} tracked card markets</h2><p>This index summarizes qualifying {sport.toLowerCase()} cards with enough recent sales activity to reduce low-liquidity noise.</p></section><div className="nav-space"/><AppNav active="market"/></main>
}
