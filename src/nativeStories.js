// The zero-terminated paragraph length lists immediately precede the UTF-16 pool.
// Lengths include paragraph terminators and the pool's initial sentinel character.
export function readV3Stories(bytes,recovered){
 const {range,text}=recovered,v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength)
 const end=range.start-6,total=(range.end-range.start)+2
 if(end<4)return []
 let start=end,sum=0
 while(start>=4&&sum<total){
  start-=4;const length=v.getUint32(start,true)
  if(length%2||length>total)return []
  sum+=length
 }
 if(sum!==total)return []
 const stories=[];let position=-1,from=-1,lengths=[]
 const finish=()=>{if(!lengths.length)return;stories.push({index:stories.length,from:Math.max(0,from),to:position,text:text.slice(Math.max(0,from),position),paragraphLengths:lengths});from=position;lengths=[]}
 for(let p=start;p<end;p+=4){
  const length=v.getUint32(p,true)
  if(!length){finish();continue}
  position+=length/2
  if(position>text.length||position>0&&text[position-1]!=='\r'&&text[position-1]!=='\n')return []
  lengths.push(length/2)
 }
 finish()
 return position===text.length?stories:[]
}

export function assignV3Stories(stories,frames){
 const ids=[...new Set(frames.filter(f=>f.storyId!=null).map(f=>f.storyId))].sort((a,b)=>a-b)
 if(stories.length!==ids.length+1)return null
 const primary=stories.reduce((best,s)=>s.text.length>best.text.length?s:best,stories[0])
 const others=stories.filter(s=>s!==primary)
 const assigned=new Map(ids.map((id,i)=>[id,others[i]]))
 const masters=frames.filter(f=>f.master&&f.w>0&&f.h>0)
 const body=masters.reduce((best,f)=>!best||f.w*f.h>best.w*best.h?f:best,null)
 if(!body)return null
 const inherited=frames.filter(f=>!f.master&&f.inheritedId===body.id&&f.inheritedParent===1)
 if(!inherited.length)return null
 return {primary,assigned,bodyFrames:inherited}
}

export function nativeStoriesDocument(d,native){
 const assignment=native.storyAssignments
 if(!assignment)return null
 const mm=96/25.4
 // Keep only nonempty native frames and attach each independent saved story to its box.
 const objects=[]
 const frameByOffset=new Map()
 for(const frame of native.textFrames){
  if(frame.master)continue
  let story=frame.storyId==null?null:assignment.assigned.get(frame.storyId)
  const isBody=frame.inheritedId===assignment.bodyFrames[0]?.inheritedId&&frame.inheritedParent===1
  if(isBody)story=assignment.primary
  if(!story?.text?.trim())continue
  const frameText=story.text.replace(/\r\n?/g,'\n')
  const frameRuns=native.characterRuns.filter(r=>r.from<story.to&&r.to>story.from).map(r=>({
   from:Math.max(story.from,r.from)-story.from,to:Math.min(story.to,r.to)-story.from,
   font:r.font||d.font,fontSize:r.fontSize,
   // The bundled Noori face produces taller browser line boxes than InPage.
   // Use its measured conversion so small per-line differences don't add pages.
   leading:(r.leading??r.fontSize*1.5)*(isBody?0.89:1),bold:r.bold,scale:r.scale??100,tracking:r.tracking??0,
   color:native.palette.find(c=>c.index===(r.nativeColorIndex??2))?.color||'#000000'
  }))
  // Paragraph offsets must use the same CRLF-normalized text stored on the
  // frame. Using the raw native string shifts every following run by one for
  // each collapsed CRLF, which makes the renderer miss the paragraph start.
  if(isBody)frameRuns.push(...nativeParagraphRuns(native.formattedParagraphs,frameText))
  const root=isBody&&frame.page===1
  const first=frameRuns[0]
  const object={id:'native-text-'+frame.recordOffset,page:'page-'+frame.page,type:'text',
   x:frame.x*mm,y:frame.y*mm,w:frame.w*mm,h:frame.h*mm,rotation:0,
   fill:'none',stroke:'none',strokeWidth:0,inset:0,text:frameText,
   font:d.font,fontSize:first?.fontSize||12,leading:'Auto',color:first?.color||'#000000',
   direction:d.direction,align:'right',columns:1,richParagraphs:true,runs:frameRuns,
   // InPage's bundled Noori face advances narrower than its Unicode web
   // substitute. Widen the layout measure and counter-scale the frame so the
   // visual box stays fixed while paragraph wrapping matches the native face.
   nativeAdvanceScale:isBody?1.05:1,
   autoPaginate:root,next:null,nativeFixedFrame:!isBody,nativeStoryId:frame.storyId??null,recordOffset:frame.recordOffset}
  if(root){
   object._nativeStoryRange={from:story.from,to:story.to}
   object.pageBreakOffsets=(native.pageBreakIndices||[])
    .filter(position=>position>=story.from&&position<story.to)
    .map(position=>position-story.from)
  }
  objects.push(object);frameByOffset.set(frame.recordOffset,object)
 }
 const bodyFrames=native.textFrames.filter(f=>!f.master&&f.inheritedId===assignment.bodyFrames[0]?.inheritedId&&f.inheritedParent===1&&frameByOffset.has(f.recordOffset)).sort((a,b)=>a.page-b.page)
 for(let i=0;i<bodyFrames.length-1;i++)frameByOffset.get(bodyFrames[i].recordOffset).next=frameByOffset.get(bodyFrames[i+1].recordOffset).id
 if(bodyFrames.length){const last=frameByOffset.get(bodyFrames.at(-1).recordOffset);last.autoPaginate=true}
 const byRecord=new Map(objects.map(o=>[o.recordOffset,o]))
 const pictures=native.pictureObjects.map((pic,i)=>({id:'native-picture-'+i,page:pic.master?null:'page-'+pic.page,
  type:'picture',x:pic.x*mm,y:pic.y*mm,w:pic.w*mm,h:pic.h*mm,rotation:0,
  fill:pic.fill??'none',stroke:'none',strokeWidth:0,src:dataURL(pic.bytes),imageFit:'fill',imageNatural:true,
  imageWidth:(pic.imageWidth??pic.w)*mm,imageHeight:(pic.imageHeight??pic.h)*mm,
  imageX:(pic.imageX??0)*mm,imageY:(pic.imageY??0)*mm,master:!!pic.master,
  wrap:pic.wrap??'none',wrapLeft:(pic.wrapLeft??0)*mm,wrapRight:(pic.wrapRight??0)*mm,
  wrapTop:(pic.wrapTop??0)*mm,wrapBottom:(pic.wrapBottom??0)*mm,nativeImageName:pic.name,recordOffset:pic.recordOffset}))
 const pageCount=native.nativePageCount||d.pages.length
 d.pages=Array.from({length:pageCount},(_,i)=>({id:'page-'+(i+1),content:{type:'doc',content:[{type:'paragraph'}]}}))
 const other=objects.filter(o=>!bodyFrames.some(f=>f.recordOffset===o.recordOffset))
 const ordered=[...objects.filter(o=>bodyFrames.some(f=>f.recordOffset===o.recordOffset)),...other,...pictures].sort((a,b)=>Number(!!a.master)-Number(!!b.master)||(a.page==null?Number.MAX_SAFE_INTEGER:Number(a.page.slice(5)))-(b.page==null?Number.MAX_SAFE_INTEGER:Number(b.page.slice(5)))||(a.recordOffset??0)-(b.recordOffset??0))
 // Keep the linked body chain contiguous in z-order; frames in the same page retain
 // their original object order relative to captions and placed pictures.
 d.objects=ordered
 d.settings.autoTextBox=false
 // Keep the decoded document story available for search, copy and legacy consumers;
 // the page canvas itself is driven by the native text-frame objects above.
 d.importReport.profile='Native stories and text-frame geometry recovered from InPage records; font metrics remain browser-rendered.'
 d.importReport.recoveredNativeStories=native.stories.length
 d.importReport.recoveredNativeTextFrames=objects.length
 return d
}

function dataURL(bytes){let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.slice(i,i+8192));return 'data:image/jpeg;base64,'+btoa(str)}

function nativeParagraphRuns(paragraphs,text){
 const runs=[];let searchFrom=0
 for(const paragraph of paragraphs||[]){
  if(!paragraph.text)continue
  const from=text.indexOf(paragraph.text,searchFrom)
  if(from<0)continue
  const align=paragraph.node?.attrs?.textAlign||paragraph.align
  if(['left','right','center','justify'].includes(align))runs.push({from,to:from+paragraph.text.length,align})
  searchFrom=from+paragraph.text.length
 }
 return runs
}
