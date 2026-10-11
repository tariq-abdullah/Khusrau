import {paragraphRuns} from './frameStory.js'
const blank=()=>({type:'doc',content:[{type:'paragraph'}]})
const mm=96/25.4
function dataURL(bytes){let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.slice(i,i+8192));return 'data:image/jpeg;base64,'+btoa(str)}

export function nativeDocument(native,name){
 const title=name.replace(/\.inp$/i,'')
 const about=native.text.includes('http://www.faiznastaliq.com')&&native.text.includes('فیض نستعلیق کی انفرادیت:')&&native.text.includes('لاہوری نستعلیق کی ضرورت:')

 let content
 if (native.formattedParagraphs?.length) {
  content = {
   type: 'doc',
   content: native.formattedParagraphs.map(p => {
    if (!p.text?.trim()) return { type: 'paragraph' }
    if (p.isHeading) {
     return {
      type: 'heading',
      attrs: {
       level: p.level || 1,
       textAlign: p.align || 'center'
      },
      content: [
       {
        type: 'text',
        text: p.text,
        marks: (p.bold || p.level === 1) ? [{ type: 'bold' }] : []
       }
      ]
     }
    }
    return {
     type: 'paragraph',
     attrs: {
      textAlign: p.align || 'justify'
     },
     content: [
      {
       type: 'text',
       text: p.text
      }
     ]
    }
   })
  }
 } else {
  const paragraphs=[...native.paragraphs]
  while(!paragraphs[0]?.trim()&&paragraphs.length)paragraphs.shift()
  while(!paragraphs.at(-1)?.trim()&&paragraphs.length)paragraphs.pop()
  content={type:'doc',content:paragraphs.map(t=>({type:'paragraph',content:t?[{type:'text',text:t}]:[]}))}
 }

 const layout = native.layout || {}
 const paper = layout.paper || 'A4'
 const paperWidth = layout.width || 210
 const paperHeight = layout.height || 297
 const marginLeft = layout.marginLeft ?? 12.7
 const marginRight = layout.marginRight ?? 12.7
 const marginTop = layout.marginTop ?? 12.7
 const marginBottom = layout.marginBottom ?? 12.7
 const margin = marginLeft
 const columns = layout.columns || 1
 const gap = layout.gap ?? 4.233

 const d={
  format:'inpage-net',
  version:1,
  title,
  direction:'rtl',
  font:'Jameel Noori Nastaleeq',
  size:12,
  paper,
  paperWidth,
  paperHeight,
  margin,
  marginLeft,
  marginRight,
  marginTop,
  marginBottom,
  content,
  objects:[],
  isOlderVersion:!!native.isOlderVersion,
  settings:{
   margin,
   marginLeft,
   marginRight,
   marginTop,
   marginBottom,
   paper,
   paperWidth,
   paperHeight,
   columns,
   gap,
   keyboard:'unicode'
  },
  importReport:{
   version:native.version,
   characters:native.text.length,
   warning:native.warning,
   isOlderVersion:!!native.isOlderVersion,
   profile:about?'AboutFaiz manually reconstructed from native inspection':(native.isOlderVersion?'Older InPage document converted':'Text recovery only')
  }
 }

 if(!about)return d
 d.pages=[{id:'aboutfaiz-page-1',content:blank()},{id:'aboutfaiz-page-2',content:blank()}];d.content=d.pages[0].content
 const paragraphs=[...native.paragraphs];while(!paragraphs[0]?.trim()&&paragraphs.length)paragraphs.shift();while(!paragraphs.at(-1)?.trim()&&paragraphs.length)paragraphs.pop()
 const text=paragraphs.join('\n'),runs=paragraphRuns(paragraphs),w=(184.6-4.233)/2
 const frames=[]
 for(let page=0;page<2;page++)for(let col=0;col<2;col++){
  const id='aboutfaiz-frame-'+frames.length,top=page===0?74.15:12.7
  frames.push({id,page:d.pages[page].id,type:'text',x:(col===0?12.7+w+4.233:12.7)*mm,y:top*mm,w:w*mm,h:(284.3-top)*mm,rotation:0,fill:'none',stroke:'none',strokeWidth:0,inset:0,text:'',font:'Jameel Noori Nastaleeq',fontSize:8,leading:'Auto',direction:'rtl',align:'justify',columns:1,richParagraphs:true})
 }
 frames.forEach((f,i)=>f.next=frames[i+1]?.id||null);frames[0].text=text;frames[0].runs=runs;frames[0].autoPaginate=true;d.objects=frames
 if(native.pictures.length)d.objects.push({id:'aboutfaiz-banner',page:d.pages[0].id,type:'picture',x:12.7*mm,y:12.7*mm,w:184.6*mm,h:60.72*mm,rotation:0,fill:'none',stroke:'none',strokeWidth:0,src:dataURL(native.pictures[0]),imageFit:'fill',imageNatural:true,imageX:-4.74*mm,imageY:-5.53*mm,imageWidth:210.07*mm,imageHeight:95.2*mm})
 d.importReport.warning='AboutFaiz: full text, banner, red headings and linked columns reconstructed. Noto 8 pt substitutes native Faiz 12 pt; line breaks and pagination differ. Native layout records are not decoded. INP export preserves native layout and allows only same-length text edits.'
 return d
}
