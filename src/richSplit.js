// Preserve inline marks, links and explicit breaks when pagination splits a run.
export function splitInlineContent(content,offset){
 const before=[],after=[];let position=0
 for(const item of content||[]){
  const length=item.type==='text'?item.text.length:1
  if(position+length<=offset)before.push(structuredClone(item))
  else if(position>=offset)after.push(structuredClone(item))
  else if(item.type==='text'){
   const cut=offset-position
   if(cut)before.push({...structuredClone(item),text:item.text.slice(0,cut)})
   if(cut<length)after.push({...structuredClone(item),text:item.text.slice(cut)})
  }else after.push(structuredClone(item))
  position+=length
 }
 return [before,after]
}
