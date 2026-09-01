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
        let link=actions.querySelector<HTMLAnchorElement>('.pulse-gauge-link')
        if(!link){
          link=document.createElement('a')
          link.className='pulse-gauge-link'
          link.setAttribute('aria-label',`Research ${cardName} in Gauge`)
          const detail=actions.querySelector('.editorial-detail-cue')
          if(detail)actions.insertBefore(link,detail)
          else actions.appendChild(link)
        }
        link.href=`/gauge?q=${encodeURIComponent(query)}`
        link.innerHTML=`${gaugeIcon()}<span>GAUGE</span>`
      })
    }
    wire()
    const observer=new MutationObserver(wire)
    observer.observe(document.body,{subtree:true,childList:true,characterData:true})
    return()=>observer.disconnect()
  },[])
  return null
}
