import {paragraphRuns} from './frameStory.js'
const blank=()=>({type:'doc',content:[{type:'paragraph'}]})
const mm=96/25.4
function dataURL(bytes){let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.slice(i,i+8192));return 'data:image/jpeg;base64,'+btoa(str)}
export function nativeDocument(native,name){
 const title=name.replace(/\.inp$/i,''),about=native.text.includes('http://www.faiznastaliq.com')&&native.text.includes('فیض نستعلیق کی انفرادیت:')&&native.text.includes('لاہوری نستعلیق کی ضرورت:')
 const paragraphs=[...native.paragraphs];while(!paragraphs[0]?.trim()&&paragraphs.length)paragraphs.shift();while(!paragraphs.at(-1)?.trim()&&paragraphs.length)paragraphs.pop()
 const content={type:'doc',content:paragraphs.map(t=>({type:'paragraph',content:t?[{type:'text',text:t}]:[]}))}
 const d={format:'inpage-net',version:1,title,direction:'rtl',font:'Noto Nastaliq Urdu',size:12,paper:'A4',margin:12.7,content,objects:[],settings:{margin:12.7,paper:'A4',columns:1,gap:4.233,keyboard:'unicode'},importReport:{version:native.version,characters:native.text.length,warning:native.warning,profile:about?'AboutFaiz manually reconstructed from native inspection':'Text recovery only'}}
 if(!about)return d
 d.pages=[{id:'aboutfaiz-page-1',content:blank()},{id:'aboutfaiz-page-2',content:blank()}];d.content=d.pages[0].content
 const text=paragraphs.join('\n'),runs=paragraphRuns(paragraphs),w=(184.6-4.233)/2
 const frames=[]
 for(let page=0;page<2;page++)for(let col=0;col<2;col++){
  const id='aboutfaiz-frame-'+frames.length,top=page===0?74.15:12.7
  frames.push({id,page:d.pages[page].id,type:'text',x:(col===0?12.7+w+4.233:12.7)*mm,y:top*mm,w:w*mm,h:(284.3-top)*mm,rotation:0,fill:'none',stroke:'none',strokeWidth:0,inset:0,text:'',font:'Noto Nastaliq Urdu',fontSize:8,leading:'Auto',direction:'rtl',align:'justify',columns:1,richParagraphs:true})
 }
 frames.forEach((f,i)=>f.next=frames[i+1]?.id||null);frames[0].text=text;frames[0].runs=runs;frames[0].autoPaginate=true;d.objects=frames
 if(native.pictures.length)d.objects.push({id:'aboutfaiz-banner',page:d.pages[0].id,type:'picture',x:12.7*mm,y:12.7*mm,w:184.6*mm,h:60.72*mm,rotation:0,fill:'none',stroke:'none',strokeWidth:0,src:dataURL(native.pictures[0]),imageFit:'fill',imageNatural:true,imageX:-4.74*mm,imageY:-5.53*mm,imageWidth:210.07*mm,imageHeight:95.2*mm})
 d.importReport.warning='AboutFaiz: full text, banner, red headings and linked columns reconstructed. Noto 8 pt substitutes native Faiz 12 pt; line breaks and pagination differ. Native layout records are not decoded. INP export preserves native layout and allows only same-length text edits.'
 return d
}
