// Paragraph structure and per-paragraph colors survive text flowing between boxes.
export function storySegments(text,offset=0,runs=[]){
 let cursor=offset
 return text.split('\n').map((part,i,array)=>{
  const start=cursor;cursor+=part.length+(i<array.length-1?1:0)
  const run=runs.find(r=>start>=r.from&&start<r.to)
  const paragraphRun=runs.find(r=>r.align&&start>=r.from&&start<r.to)
  const align=['left','right','center','justify'].includes(run?.align)?run.align:paragraphRun?.align||null
  const segment={text:part,color:run?.color||null}
  if(align)segment.align=align
  const style={}
  if(run?.font)style.fontFamily=run.font
  if(Number.isFinite(run?.fontSize)&&run.fontSize>0)style.fontSize=run.fontSize+'pt'
  if(Number.isFinite(run?.leading)&&run.leading>0)style.lineHeight=run.leading+'pt'
  if(typeof run?.bold==='boolean')style.fontWeight=run.bold?'bold':'normal'
  if(typeof run?.italic==='boolean')style.fontStyle=run.italic?'italic':'normal'
  if(align)style.textAlign=align
  if(Object.keys(style).length)segment.style=style
  const spans=runs.filter(r=>r.from<cursor&&r.to>start)
  if(spans.length>1&&spans.some(r=>r.fontSize||r.font||r.bold||r.italic)){
   const breaks=[start,...spans.flatMap(r=>[Math.max(start,r.from),Math.min(cursor,r.to)]),cursor].sort((a,b)=>a-b).filter((v,j,a)=>j===0||v!==a[j-1])
   segment.parts=[]
   for(let j=0;j<breaks.length-1;j++){
    const from=breaks[j],to=breaks[j+1],partRun=runs.find(r=>r.from<to&&r.to>from)
    if(to<=from||!partRun)continue
    const partStyle={}
    if(partRun.font)partStyle.fontFamily=partRun.font
    if(partRun.fontSize)partStyle.fontSize=partRun.fontSize+'pt'
    if(partRun.color)partStyle.color=partRun.color
    if(typeof partRun.bold==='boolean')partStyle.fontWeight=partRun.bold?'bold':'normal'
    if(typeof partRun.italic==='boolean')partStyle.fontStyle=partRun.italic?'italic':'normal'
    segment.parts.push({text:part.slice(from-start,to-start),style:partStyle})
   }
  }
  return segment
 })
}
export function populateStory(element,text,offset,runs,layout={}){
 for(const segment of storySegments(text,offset,runs)){const p=document.createElement('div');p.style.minHeight='1lh';p.style.whiteSpace='pre-wrap';p.style.marginTop=(layout.spaceBefore||0)+'pt';p.style.marginBottom=(layout.spaceAfter||0)+'pt';if(segment.color)p.style.color=segment.color;Object.assign(p.style,segment.style||{});if(segment.parts?.length){for(const part of segment.parts){const span=document.createElement('span');Object.assign(span.style,part.style);span.textContent=part.text;p.append(span)}}else p.textContent=segment.text||'\u200b';element.append(p)}
}
export function paragraphRuns(paragraphs){let offset=0;const runs=[];for(const p of paragraphs){if(p.trim()&&p.length<80&&!p.startsWith('ایکسس کا فلسفہ'))runs.push({from:offset,to:offset+p.length+1,color:'#ff0000'});offset+=p.length+1}return runs}
export function rebaseRuns(runs,oldText,newText,offset){
 let prefix=0,suffix=0;while(prefix<Math.min(oldText.length,newText.length)&&oldText[prefix]===newText[prefix])prefix++
 while(suffix<Math.min(oldText.length,newText.length)-prefix&&oldText.at(-1-suffix)===newText.at(-1-suffix))suffix++
 const start=offset+prefix,end=offset+oldText.length-suffix,delta=newText.length-oldText.length
 return runs.map(r=>({...r,from:r.from>=end?r.from+delta:r.from>start?start:r.from,to:r.to>=end?r.to+delta:r.to>start?start+newText.length-prefix-suffix:r.to})).filter(r=>r.to>r.from)
}
export function setParagraphRunAlignment(runs,from,to,align){
 const next=(runs||[]).map(run=>{
  if(!run.align||run.to<=from||run.from>=to)return {...run}
  const {align:ignored,...rest}=run
  return Object.keys(rest).length?rest:null
 }).filter(Boolean)
 next.push({from,to,align})
 return next
}
