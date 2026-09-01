import { NextResponse } from 'next/server'

type Card={card_id:string;description?:string;player?:string;set?:string;number?:string|number;variant?:string;image?:string;category?:string;gain?:number;gain_30day?:number;'7 Day Sales'?:number;'30 Day Sales'?:number;prices?:Array<{grade:string;price:string|number}>}
const API_BASE='https://api.cardhedger.com'
async function ch<T>(path:string,body:unknown):Promise<T>{const key=process.env.CARDHEDGE_API_KEY;if(!key)throw new Error('CARDHEDGE_API_KEY is not configured');const r=await fetch(API_BASE+path,{method:'POST',headers:{'X-API-Key':key,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`${path} returned ${r.status}`);return r.json() as Promise<T>}
function priceFor(card:Card,grade='PSA 10'){const p=card.prices?.find(x=>x.grade===grade)??card.prices?.find(x=>x.grade==='PSA 9')??card.prices?.[0];return p?Number(p.price):0}
function money(n:number){return Number.isFinite(n)?`$${n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—'}
function normCard(card:Card){const price=priceFor(card);return{id:card.card_id,name:card.player||card.description||'Card',meta:card.description||card.set||'',set:card.set||'',number:String(card.number??''),variant:card.variant||'',image:card.image||'',category:card.category||'',value:price,displayValue:money(price),move7:Number(card.gain??0),move30:Number(card.gain_30day??card.gain??0),sales7:Number(card['7 Day Sales']??0),sales30:Number(card['30 Day Sales']??0),grade:card.prices?.find(x=>x.grade==='PSA 10')?'PSA 10':card.prices?.[0]?.grade||''}}
function compsRows(payload:any){const arr=payload?.raw_prices??payload?.prices??payload?.sales??[];if(!Array.isArray(arr))return[];return arr.slice(0,10).map((x:any)=>({price:Number(x.price??x.sold_price??x.amount??0),date:String(x.date??x.sold_at??x.sale_date??''),marketplace:String(x.marketplace??x.source??'eBay'),title:String(x.title??x.description??''),type:String(x.sale_type??x.listing_type??'Sold'),url:String(x.url??x.item_url??'')})).filter((x:any)=>x.price>0)}
function firstGood(cards:Card[]|undefined){return(cards??[]).find(c=>priceFor(c)>0&&c.image)??cards?.[0]}

export async function GET(){
 try{
  const searches=await Promise.all([
   ch<{cards?:Card[]}>('/v1/cards/search-cards-wsort',{category:'Basketball',sort_by:'gain_30day',sort_order:'desc',page:1,page_size:12}),
   ch<{cards?:Card[]}>('/v1/cards/search-cards-wsort',{category:'Football',sort_by:'gain_30day',sort_order:'desc',page:1,page_size:12}),
   ch<{cards?:Card[]}>('/v1/cards/search-cards-wsort',{category:'Baseball',sort_by:'gain_30day',sort_order:'desc',page:1,page_size:12}),
   ch<{cards?:Card[]}>('/v1/cards/search-cards-wsort',{player:'Victor Wembanyama',category:'Basketball',page:1,page_size:100,sort_by:'sales_30day',sort_order:'desc'}),
   ch<{cards?:Card[]}>('/v1/cards/search-cards-wsort',{search:'Patrick Mahomes Travis Kelce Downtown Duos',category:'Football',page:1,page_size:30,sort_by:'sales_30day',sort_order:'desc'}),
   ch<{cards?:Card[]}>('/v1/cards/search-cards-wsort',{search:'Shohei Ohtani 2018 Bowman',category:'Baseball',page:1,page_size:30,sort_by:'sales_30day',sort_order:'desc'}),
  ])
  const movers=searches.slice(0,3).flatMap(x=>x.cards??[]).map(normCard).filter(x=>x.image&&x.value>0&&Number.isFinite(x.move30)).sort((a,b)=>b.move30-a.move30).slice(0,8)
  const wembyCandidates=(searches[3].cards??[]).filter(c=>String(c.number??'')==='136'||(c.description??'').includes('#136'))
  const wembyRaw=wembyCandidates.find(c=>(c.set??'').includes('2023')&&((c.variant??'').toLowerCase().includes('base')||(c.description??'').toLowerCase().includes('base')))??wembyCandidates[0]??firstGood(searches[3].cards)
  const collectionRaw=[wembyRaw,firstGood(searches[4].cards),firstGood(searches[5].cards)].filter(Boolean) as Card[]
  const costBases=[100,265,350]
  const holdings=collectionRaw.map((c,i)=>{const n=normCard(c);return{...n,paid:costBases[i]??0,gain:n.value-(costBases[i]??0),displayGain:`${n.value-(costBases[i]??0)>=0?'+':'−'}$${Math.abs(n.value-(costBases[i]??0)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`}})
  let detail:any=null
  if(wembyRaw){
   const selected=normCard(wembyRaw);const grade=wembyRaw.prices?.find(x=>x.grade==='PSA 10')?'PSA 10':wembyRaw.prices?.[0]?.grade||'PSA 10'
   const [fmvRes,compsRes]=await Promise.allSettled([ch<any>('/v1/cards/card-fmv',{card_id:wembyRaw.card_id,grade}),ch<any>('/v1/cards/comps',{card_id:wembyRaw.card_id,count:10,grade,include_raw_prices:true,time_weighted:true})])
   const fmvPayload=fmvRes.status==='fulfilled'?fmvRes.value:{};const fmv=fmvPayload?.fmv??fmvPayload;const current=Number(fmv?.price??selected.value);const comps=compsRes.status==='fulfilled'?compsRows(compsRes.value):[];const compPrices=comps.map((x:any)=>x.price)
   detail={...selected,value:current,displayValue:money(current),confidence:String(fmv?.confidence_grade??''),freshnessDays:Number(fmv?.freshness_days??0),rangeLow:compPrices.length?Math.min(...compPrices):0,rangeHigh:compPrices.length?Math.max(...compPrices):0,comps}
  }
  return NextResponse.json({live:true,updatedAt:new Date().toISOString(),movers,holdings,detail},{headers:{'Cache-Control':'no-store'}})
 }catch(error){return NextResponse.json({live:false,error:error instanceof Error?error.message:'Unknown Card Hedge error',updatedAt:new Date().toISOString()},{status:502,headers:{'Cache-Control':'no-store'}})}
}
