// Character-format spans follow the UTF-16 story. Counts are bytes, not glyphs.
// Each span contains a bounded nested attribute record; never scan into layout caches.
export function readV3TextStyles(bytes,range){
 if(!range)return []
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),runs=[]
 // InPage includes the story's initial paragraph sentinel in the format counts.
 let offset=range.end,position=-1
 while(offset+22<=bytes.length){
  const count=v.getUint32(offset,true),length=v.getUint32(offset+4,true)
  if(!count||count%2||length<12||length>4096||offset+8+length>bytes.length||v.getUint16(offset+8,true)!==1||v.getUint32(offset+10,true)!==length-6||![0,0x80].includes(v.getUint16(offset+14,true)))break
  if(position+count/2>(range.end-range.start)/2)break
  const style={fontSize:12,bold:false},end=offset+8+length
  for(let p=offset+20;p+2<=end;){
   const tag=v.getUint16(p,true)
   if([0x7f00,0x7f8a].includes(tag)&&p+6<=end){
    const value=v.getUint32(p+2,true)/2000
    if(value>=1&&value<=300)style[tag===0x7f00?'fontSize':'leading']=value
    p+=6
   }else if([0x7f02,0x7f07,0x7f80].includes(tag)&&p+4<=end){
    if(tag===0x7f02)style.bold=v.getUint16(p+2,true)>=600
    if(tag===0x7f07)style.nativeColorIndex=v.getUint16(p+2,true)
    p+=4
   }else p+=2
  }
  runs.push({from:position,to:position+count/2,...style})
  position+=count/2;offset=end
 }
 // Reject accidental matches unless the spans account for the complete story.
 return position===(range.end-range.start)/2?runs:[]
}

export function styledNativeParagraph(text,start,runs,attrs={},palette=[]){
 const content=[]
 const first=runs.find(r=>r.from<=start&&r.to>start)
 if(first)attrs={...attrs,fontSize:first.fontSize+'pt'}
 if(first?.leading)attrs={...attrs,leading:first.leading}
 for(const run of runs){
  const from=Math.max(start,run.from),to=Math.min(start+text.length,run.to)
  if(to<=from)continue
  const marks=[{type:'textStyle',attrs:{fontSize:run.fontSize+'pt'}}]
  const color=palette.find(c=>c.index===(run.nativeColorIndex??2))?.color
  if(color)marks[0].attrs.color=color
  if(run.bold)marks.push({type:'bold'})
  content.push({type:'text',text:text.slice(from-start,to-start),marks})
 }
 return {type:'paragraph',attrs,content:content.length?content:(text?[{type:'text',text}]:[])}
}
