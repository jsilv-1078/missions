'use client'

import {useState} from 'react'

type Tab='pulse'|'market'|'collection'|'gauge'

function Icon({name}:{name:Tab|'more'}){
 const common={width:22,height:22,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.9,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}
 if(name==='pulse')return <svg {...common}><path d="M3 12h3l2-6 4 12 3-9 2 3h4"/></svg>
 if(name==='market')return <svg {...common}><path d="M4 18V10M10 18V6M16 18v-4M22 18V3"/><path d="M3 20h20"/></svg>
 if(name==='collection')return <svg {...common}><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
 if(name==='gauge')return <svg {...common}><path d="M4 15a8 8 0 1 1 16 0"/><path d="M12 15l4-5"/><path d="M6 15h12"/></svg>
 return <svg {...common}><path d="M5 7h14M5 12h14M5 17h14"/></svg>
}

export default function AppNav({active}:{active:Tab}){
 const [more,setMore]=useState(false)
 return <>
  <nav className="cm-bottom-nav" aria-label="Card Madness navigation">
   <a className={`cm-nav-item ${active==='pulse'?'selected':''}`} href="/"><Icon name="pulse"/><small>Pulse</small></a>
   <a className={`cm-nav-item ${active==='market'?'selected':''}`} href="/market"><Icon name="market"/><small>Market</small></a>
   <a className={`cm-nav-item ${active==='collection'?'selected':''}`} href="/collection"><Icon name="collection"/><small>Collection</small></a>
   <a className={`cm-nav-item ${active==='gauge'?'selected':''}`} href="/gauge"><Icon name="gauge"/><small>Gauge</small></a>
   <button className="cm-nav-item" type="button" onClick={()=>setMore(true)}><Icon name="more"/><small>More</small></button>
  </nav>
  {more?<div className="cm-more-backdrop" onClick={()=>setMore(false)} role="presentation"><section className="cm-more-sheet" onClick={e=>e.stopPropagation()} aria-label="More Card Madness options"><div className="cm-more-handle"/><div className="cm-more-title"><div><span>CARD MADNESS</span><h2>More</h2></div><button onClick={()=>setMore(false)} aria-label="Close">×</button></div><a href="/">Open Pulse<span>›</span></a><a href="/market">View Markets<span>›</span></a><a href="/collection">View Collection<span>›</span></a><a href="/gauge">Research a card<span>›</span></a><button className="cm-more-refresh" onClick={()=>window.location.reload()}>Refresh current page<span>↻</span></button></section></div>:null}
 </>
}
