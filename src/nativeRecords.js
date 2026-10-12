// Decode bounded page/object records rather than matching JPEG directory order.
// InPage 3 stores page 1 as the master; document pages start at container page 2.
const UNITS_PER_MM=144000/25.4
export function readV3PageRecords(bytes,entries=[],palette=[]){
 const s=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes)
 const v=new DataView(s.buffer,s.byteOffset,s.byteLength)
 const images=new Map(entries.filter(e=>e.content?.[0]===255&&e.content?.[1]===216).map(e=>[e.name.replace(/^\*/,''),new Uint8Array(e.content)]))
 const records=[],textFrames=[],pages=new Set()
 // The object table precedes the story/format section (directory entry 3).
 const end=s.length>=42?Math.min(s.length,v.getUint32(36,true)||s.length):s.length
 for(let i=0;i+26<=end;i+=2){
  const type=v.getUint16(i,true),id=v.getUint16(i+2,true),parent=v.getUint32(i+4,true),length=v.getUint32(i+8,true)
  if(![1,3,5,6].includes(type)||id>500||parent<1||parent>201||length<10||length>65536||i+12+length>end)continue
  const flags=v.getUint16(i+12,true)
  if(type===1&&id===0&&flags===0x80&&v.getUint32(i+14,true)===0xffffffff&&v.getUint16(i+18,true)===0x82){pages.add(parent);continue}
  const standardHeader=flags===0x80&&v.getUint32(i+14,true)===0xffffffff&&v.getUint16(i+18,true)===0x82
  const extendedHeader=flags===0&&v.getUint16(i+14,true)===0x80&&v.getUint32(i+16,true)===0xffffffff&&v.getUint16(i+20,true)===0x82
  if(type===3&&flags===0x80){
   const stop=i+12+length,frame={id,parent,page:parent-1,master:parent===1,recordOffset:i}
   let attributes=i+18
   if(standardHeader){frame.storyId=v.getUint32(i+20,true);attributes=i+24}
   else {frame.inheritedId=v.getUint16(i+14,true);frame.inheritedParent=v.getUint16(i+16,true)}
   for(let j=attributes;j+6<=stop;j+=2){const tag=v.getUint16(j,true);if(tag>=0x7e00&&tag<=0x7e03)frame[['x','y','w','h'][tag-0x7e00]]=v.getInt32(j+2,true)/UNITS_PER_MM}
   textFrames.push(frame);i=stop-2;continue
  }
  if(type!==5||(!standardHeader&&!extendedHeader))continue
  const stop=i+12+length
  let name=null,nameEnd=0
  for(let j=i+26;j+14<stop;j+=2){
   if(v.getUint16(j,true)!==42||new TextDecoder('utf-16le').decode(s.subarray(j+2,j+14))!=='PPicts')continue
   let k=j+2;while(k+1<stop&&v.getUint16(k,true)!==0)k+=2
   name=new TextDecoder('utf-16le').decode(s.subarray(j+2,k));nameEnd=k+2;break
  }
  if(!name||!images.has(name))continue
  const geometry={},imageGeometry={},runaround={wrap:'box',wrapLeft:25.4/36,wrapRight:25.4/36,wrapTop:25.4/72,wrapBottom:25.4/72}
  let fillColorIndex=1
  // Box geometry follows the image reference and transform attributes.
  for(let j=nameEnd;j+4<=stop;j+=2){
   const tag=v.getUint16(j,true)
   if(tag>=0x7e00&&tag<=0x7e03&&j+6<=stop)geometry[['x','y','w','h'][tag-0x7e00]]=v.getInt32(j+2,true)/UNITS_PER_MM
   if(tag>=0x0501&&tag<=0x0504&&j+6<=stop)imageGeometry[['right','top','width','height'][tag-0x0501]]=v.getInt32(j+2,true)/UNITS_PER_MM
   if(tag===0x0508||tag===0x0509)imageGeometry[tag===0x0508?'scaleX':'scaleY']=v.getUint16(j+2,true)/1000
   if(tag===0x7e0f)runaround.wrap=v.getUint16(j+2,true)?'box':'none'
   if(tag===0x7e0e)fillColorIndex=v.getUint16(j+2,true)
   if(tag>=0x7e11&&tag<=0x7e14&&j+6<=stop)runaround[['wrapLeft','wrapTop','wrapRight','wrapBottom'][tag-0x7e11]]=v.getInt32(j+2,true)/UNITS_PER_MM
  }
  if(!['x','y','w','h'].every(k=>Number.isFinite(geometry[k]))||geometry.w<=0||geometry.h<=0)continue
  const imageWidth=(imageGeometry.width??geometry.w)*(imageGeometry.scaleX??1)
  const imageHeight=(imageGeometry.height??geometry.h)*(imageGeometry.scaleY??1)
  const imageX=geometry.w-imageWidth-(imageGeometry.right??0),imageY=imageGeometry.top??0
  const fill=fillColorIndex===0?'none':palette.find(c=>c.index===fillColorIndex)?.color??({1:'#ffffff',2:'#000000',3:'#808080',4:'#ff0000'})[fillColorIndex]??null
  records.push({name:'*'+name,bytes:images.get(name),...geometry,...runaround,fill,fillColorIndex,imageWidth,imageHeight,imageX,imageY,page:parent-1,master:parent===1,recordOffset:i})
  i=stop-2
 }
 const containerPages=[...pages].sort((a,b)=>a-b)
 for(const frame of textFrames){const master=textFrames.find(m=>m.master&&m.id===frame.inheritedId&&m.parent===frame.inheritedParent);if(master)for(const key of ['x','y','w','h'])frame[key]??=master[key]}
 return {pictureObjects:records,textFrames,pageCount:containerPages.length>1?containerPages.length-1:null,containerPages}
}
