// Paragraph structure and per-paragraph colors survive text flowing between boxes.
export function storySegments(text,offset=0,runs=[]){
 let cursor=offset
 return text.split('\n').map((part,i,array)=>{const start=cursor;cursor+=part.length+(i<array.length-1?1:0);return {text:part,color:runs.find(r=>start>=r.from&&start<r.to)?.color||null}})
}
export function populateStory(element,text,offset,runs,layout={}){
 for(const segment of storySegments(text,offset,runs)){const p=document.createElement('div');p.style.minHeight='1lh';p.style.whiteSpace='pre-wrap';p.style.marginTop=(layout.spaceBefore||0)+'pt';p.style.marginBottom=(layout.spaceAfter||0)+'pt';if(segment.color)p.style.color=segment.color;p.textContent=segment.text||'\u200b';element.append(p)}
}
export function paragraphRuns(paragraphs){let offset=0;const runs=[];for(const p of paragraphs){if(p.trim()&&p.length<80&&!p.startsWith('ایکسس کا فلسفہ'))runs.push({from:offset,to:offset+p.length+1,color:'#ff0000'});offset+=p.length+1}return runs}
export function rebaseRuns(runs,oldText,newText,offset){
 let prefix=0,suffix=0;while(prefix<Math.min(oldText.length,newText.length)&&oldText[prefix]===newText[prefix])prefix++
 while(suffix<Math.min(oldText.length,newText.length)-prefix&&oldText.at(-1-suffix)===newText.at(-1-suffix))suffix++
 const start=offset+prefix,end=offset+oldText.length-suffix,delta=newText.length-oldText.length
 return runs.map(r=>({...r,from:r.from>=end?r.from+delta:r.from>start?start:r.from,to:r.to>=end?r.to+delta:r.to>start?start+newText.length-prefix-suffix:r.to})).filter(r=>r.to>r.from)
}
