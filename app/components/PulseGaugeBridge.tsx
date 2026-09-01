'use client'

import { useEffect } from 'react'

function gaugeIcon(){
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 12l4.2-4.2"/><circle cx="12" cy="12" r="1.4"/></svg>'
}

export default function PulseGaugeBridge(){
  useEffect(()=>{
    const wire=()=>{
      document.querySelectorAll<HTMLElement>('.market-face .editorial-actions').forEach((actions)=>{
        const face=actions.closest<HTMLElement>('.market-face')
        if(!face)return
        const cardName=face.querySelector<HTMLElement>('.editorial-card-name strong')?.textContent?.trim()
        if(!cardName)return
        const cardNumber=face.querySelector<HTMLElement>('.editorial-card-name span')?.textContent?.trim()??''
        const query=[cardName,cardNumber].filter(Boolean).join(' ')
        const href=`/gauge?q=${encodeURIComponent(query)}`
        let link=actions.querySelector<HTMLAnchorElement>('.pulse-gauge-link')
        if(!link){
          link=document.createElement('a')
          link.className='pulse-gauge-link'
          link.setAttribute('aria-label',`Research ${cardName} in Gauge`)
          link.href=href
          link.innerHTML=`${gaugeIcon()}<span>GAUGE</span>`
          const detail=actions.querySelector('.editorial-detail-cue')
          if(detail)actions.insertBefore(link,detail)
          else actions.appendChild(link)
          return
        }
        if(link.getAttribute('href')!==href) link.setAttribute('href',href)
        const aria=`Research ${cardName} in Gauge`
        if(link.getAttribute('aria-label')!==aria) link.setAttribute('aria-label',aria)
      })
    }

    wire()
    let scheduled=false
    const observer=new MutationObserver(()=>{
      if(scheduled)return
      scheduled=true
      requestAnimationFrame(()=>{
        scheduled=false
        wire()
      })
    })
    observer.observe(document.body,{subtree:true,childList:true})
    return()=>observer.disconnect()
  },[])
  return null
}
