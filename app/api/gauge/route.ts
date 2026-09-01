import { NextRequest,NextResponse } from 'next/server'

const BASE='https://api.cardhedger.com'
type ApiResult={ok:boolean;status:number;payload:any}

async function post(path:string,body:Record<string,unknown>):Promise<ApiResult>{
 const key=process.env.CARDHEDGE_API_KEY
 if(!key)throw new Error('Market data is temporarily unavailable.')
 const r=await fetch(`${BASE}${path}`,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json','X-API-Key':key},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)})
 const text=await r.text();let payload:any={};try{payload=text?JSON.parse(text):{}}catch{payload={}}
 return{ok:r.ok,status:r.status,payload}
}
function num(v:any){const n=Number(v);return Number.isFinite(n)&&n>=0?n:undefined}
function image(v:any){if(typeof v!=='string'||!v.trim())return undefined;return v.startsWith('//')?`https:${v}`:v}
function sales(payload:any){const raw=payload?.raw_prices??payload?.prices??payload?.sales??[];if(!Array.isArray(raw))return[];return raw.map((x:any,i:number)=>({id:String(x?.id??x?.sale_id??i),price:num(x?.price??x?.sale_price??x?.value),soldAt:x?.sale_date??x?.sold_at??x?.closing_date??x?.date,source:x?.marketplace??x?.source??x?.price_source??'Sold',url:x?.sale_url??x?.url})).filter((x:any)=>x.price!=null)}
function trend(payload:any){const raw=payload?.prices??[];return Array.isArray(raw)?raw.map((x:any)=>({date:x?.closing_date??x?.sale_date??x?.date,price:num(x?.price)})).filter((x:any)=>x.date&&x.price!=null):[]}
function median(values:number[]){if(!values.length)return undefined;const s=[...values].sort((a,b)=>a-b),m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2}
function trendSummary(items:Array<{date:string;price:number}>){const rows=items.map(x=>({...x,ts:new Date(x.date).getTime()})).filter(x=>Number.isFinite(x.ts)).sort((a,b)=>a.ts-b.ts);if(rows.length<2)return{percentChange:undefined,direction:'unknown',salesUsed:rows.length};const w=Math.max(1,Math.min(5,Math.floor(rows.length/3)));const a=median(rows.slice(0,w).map(x=>x.price)),b=median(rows.slice(-w).map(x=>x.price));const pct=a&&b?((b-a)/a)*100:undefined;return{percentChange:pct,direction:pct==null?'unknown':pct>3?'rising':pct<-3?'falling':'flat',salesUsed:rows.length}}
function liquidity(items:Array<{date:string;price:number}>){const now=Date.now(),day=86400000;const dated=items.map(x=>({...x,ts:new Date(x.date).getTime()})).filter(x=>Number.isFinite(x.ts)&&x.ts<=now);if(!dated.length)return undefined;const sales30=dated.filter(x=>now-x.ts<=30*day).length,sales90=dated.filter(x=>now-x.ts<=90*day).length,last=Math.max(...dated.map(x=>x.ts)),days=Math.max(0,(now-last)/day);const clamp=(v:number)=>Math.max(0,Math.min(1,v));const score=Math.round((clamp(sales30/12)*.45+clamp(sales90/24)*.35+clamp(1-days/45)*.2)*100)/10;return{score,label:score>=9?'Extremely liquid':score>=7?'High':score>=5?'Moderate':score>=3?'Low':'Very low',sales30,sales90,lastSaleDays:Math.round(days)}}
async function pricing(id:string,grade:string){const[c,f]=await Promise.all([post('/v1/cards/comps',{card_id:id,count:10,grade,include_raw_prices:true,time_weighted:true}),post('/v1/cards/card-fmv',{card_id:id,grade})]);return{sales:c.ok?sales(c.payload):[],fmv:f.ok?num(f.payload?.price??f.payload?.fmv?.price):undefined}}

export async function GET(req:NextRequest){
 const sp=req.nextUrl.searchParams,q=(sp.get('q')??'').trim(),cert=(sp.get('cert')??'').trim(),requestedGrade=(sp.get('grade')??'Raw').trim()||'Raw'
 if(!q&&!cert)return NextResponse.json({error:'Enter a card description or PSA certificate number.'},{status:400})
 try{
  let match:any=null,grade=requestedGrade
  if(cert){const c=await post('/v1/cards/fmv-by-cert',{cert,grader:'PSA'});if(!c.ok)return NextResponse.json({error:'PSA certificate lookup failed.'},{status:502});match=c.payload?.card;grade=c.payload?.cert_info?.grade??c.payload?.fmv?.grade_label??grade;if(!match?.card_id){const description=c.payload?.cert_info?.description;if(description){const m=await post('/v1/cards/card-match',{query:description,max_candidates:10,raw_images_only:false});match=m.payload?.match??m.payload?.best_match}}}
  else{const m=await post('/v1/cards/card-match',{query:q,max_candidates:10,raw_images_only:false});if(!m.ok)return NextResponse.json({error:'Card search failed.'},{status:502});match=m.payload?.match??m.payload?.best_match}
  if(!match?.card_id)return NextResponse.json({error:'No confident card match found.'},{status:404})
  const id=String(match.card_id)
  const [exact,tr,raw,psa9,psa10]=await Promise.all([
   pricing(id,grade),
   post('/v1/cards/prices-by-card',{card_id:id,grade,days:90}),
   pricing(id,'Raw'),pricing(id,'PSA 9'),pricing(id,'PSA 10')
  ])
  const trendRows=tr.ok?trend(tr.payload):[]
  const prices=exact.sales.map((x:any)=>x.price).filter((x:number)=>Number.isFinite(x))
  const rawValue=raw.fmv,psa9Value=psa9.fmv,psa10Value=psa10.fmv,gradingCost=79.99
  const psa9Net=rawValue!=null&&psa9Value!=null?psa9Value-rawValue-gradingCost:undefined
  const psa10Net=rawValue!=null&&psa10Value!=null?psa10Value-rawValue-gradingCost:undefined
  const gradeScore=rawValue?Math.max(0,Math.min(10,Math.round((((psa9Net??0)/(rawValue+gradingCost))*6+((psa10Net??0)/(rawValue+gradingCost))*4)*10)/10)):undefined
  const title=match.description??[match.player,match.set,match.number].filter(Boolean).join(' ')
  return NextResponse.json({card:{cardId:id,title,subtitle:[match.set,match.number?`#${match.number}`:null,match.variant].filter(Boolean).join(' · '),imageUrl:image(match.image??match.image_url),grade,currentFmv:exact.fmv},comps:exact.sales,trend:trendRows,trendSummary:trendSummary(trendRows),liquidity:liquidity(trendRows),range30:prices.length?{low:Math.min(...prices),high:Math.max(...prices)}:undefined,gradingOpportunity:{score:gradeScore,recommendation:(gradeScore??0)>=6?'GRADE':'DON’T GRADE',raw:rawValue,psa9:psa9Value,psa10:psa10Value,gradingCost,psa9Net,psa10Net},updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Market research is temporarily unavailable.'},{status:502})}
}
