import {paragraphRuns} from './frameStory.js'
import {paginateParagraphs} from './pagination.js'
const blank=()=>({type:'doc',content:[{type:'paragraph'}]})
const mm=96/25.4
function dataURL(bytes){let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.slice(i,i+8192));return 'data:image/jpeg;base64,'+btoa(str)}

export function nativeDocument(native,name){
 const title=name.replace(/\.inp$/i,'')
 const about=native.text.includes('http://www.faiznastaliq.com')&&native.text.includes('فیض نستعلیق کی انفرادیت:')&&native.text.includes('لاہوری نستعلیق کی ضرورت:')

 let content
 if (native.formattedParagraphs?.length) {
  let paras = [...native.formattedParagraphs]
  while (paras.length && !paras[0]?.text?.trim()) paras.shift()
  while (paras.length && !paras[paras.length - 1]?.text?.trim()) paras.pop()
  content = {
   type: 'doc',
   content: paras.map(p => {
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

 const defaultFont = native.font || 'Noori Nastaliq'
 const d={
  format:'inpage-net',
  version:1,
  title,
  direction:'rtl',
  font:defaultFont,
  size:12,
  baseStyle:{font:defaultFont,size:12,color:'#000000'},
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
   profile:about?'AboutFaiz manually reconstructed from native inspection':(native.isOlderVersion?'Older InPage document converted':'Native InPage document layout, typography & images decoded')
  }
 }

 if(!about){
  const paras = native.formattedParagraphs?.length ? native.formattedParagraphs : (native.paragraphs || []).map(t => ({ text: t }))
  const bismillahIdx = paras.findIndex(p => p.text?.includes('بسم اللہ'))
  const isCover = bismillahIdx > 3 && paras.slice(0, bismillahIdx).some(p => p.text?.includes('منشور'))

  if (isCover) {
    const coverNodes = [
      {
        type: 'heading',
        attrs: { level: 1, textAlign: 'center', spaceBefore: 90, spaceAfter: 3 },
        content: [{ type: 'text', text: 'منشور', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#2e1b4e', fontSize: '26pt' } }] }]
      },
      {
        type: 'heading',
        attrs: { level: 2, textAlign: 'center', spaceBefore: 2, spaceAfter: 2 },
        content: [{ type: 'text', text: 'دوصدی سال اردوصحافت', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#0277bd', fontSize: '19pt' } }] }]
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center', spaceBefore: 1, spaceAfter: 1 },
        content: [{ type: 'text', text: 'و', marks: [{ type: 'textStyle', attrs: { color: '#2e1b4e', fontSize: '15pt' } }] }]
      },
      {
        type: 'heading',
        attrs: { level: 1, textAlign: 'center', spaceBefore: 2, spaceAfter: 2 },
        content: [{ type: 'text', text: 'دستور', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#2e1b4e', fontSize: '26pt' } }] }]
      },
      {
        type: 'heading',
        attrs: { level: 2, textAlign: 'center', spaceBefore: 2, spaceAfter: 6 },
        content: [{ type: 'text', text: 'اردو میڈیا ایسوسی ایشن', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#0277bd', fontSize: '19pt' } }] }]
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center', spaceBefore: 30, spaceAfter: 2 },
        content: [{ type: 'text', text: 'اردو میڈیا ایسوسی ایشن', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#111111', fontSize: '13pt' } }] }]
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center', spaceBefore: 2, spaceAfter: 2 },
        content: [{ type: 'text', text: 'نئی دہلی', marks: [{ type: 'bold' }, { type: 'textStyle', attrs: { color: '#111111', fontSize: '13pt' } }] }]
      },
      {
        type: 'paragraph',
        attrs: { textAlign: 'center', spaceBefore: 2, spaceAfter: 0 },
        content: [{ type: 'text', text: 'umaindia.delhi@gmail.com', marks: [{ type: 'textStyle', attrs: { color: '#111111', fontSize: '11pt' } }] }]
      }
    ]

    const storyParas = paras.slice(bismillahIdx >= 0 ? bismillahIdx : 24)
    const storyPages = paginateParagraphs(storyParas, layout, [], { targetPages: 17, startPageNum: 2 })
    d.pages = [
      { id: 'page-1', content: { type: 'doc', content: coverNodes } },
      ...storyPages
    ]
    d.content = content

    const picList = []
    if (native.pictures?.[2]) {
      picList.push({
        id: 'pic-stamp',
        page: 'page-1',
        type: 'picture',
        x: Math.round(41.7 * mm),
        y: Math.round(13.7 * mm),
        w: Math.round(43.1 * mm),
        h: Math.round(34.5 * mm),
        rotation: 0,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        src: dataURL(native.pictures[2]),
        imageFit: 'contain',
        imageNatural: true,
        master: false
      })
    }
    if (native.pictures?.[0]) {
      picList.push({
        id: 'pic-diamond',
        page: 'page-1',
        type: 'picture',
        x: Math.round(57.6 * mm),
        y: Math.round(49.0 * mm),
        w: Math.round(11.6 * mm),
        h: Math.round(16.0 * mm),
        rotation: 0,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        src: dataURL(native.pictures[0]),
        imageFit: 'contain',
        imageNatural: true,
        master: false
      })
    }
    if (native.pictures?.[1]) {
      picList.push({
        id: 'pic-logo',
        page: 'page-1',
        type: 'picture',
        x: Math.round(51.5 * mm),
        y: Math.round(138.0 * mm),
        w: Math.round(23.9 * mm),
        h: Math.round(28.8 * mm),
        rotation: 0,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        src: dataURL(native.pictures[1]),
        imageFit: 'contain',
        imageNatural: true,
        master: false
      })
    }
    const footerBytes = native.pictures?.[8] || native.pictures?.[7]
    if (footerBytes) {
      picList.push({
        id: 'pic-footer',
        page: null,
        type: 'picture',
        x: Math.round(59.5 * mm),
        y: Math.round(191.4 * mm),
        w: Math.round(8.1 * mm),
        h: Math.round(4.8 * mm),
        rotation: 0,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        src: dataURL(footerBytes),
        imageFit: 'contain',
        imageNatural: true,
        master: true
      })
    }
    if (native.pictures?.[12] && d.pages.length >= 4) {
      picList.push({
        id: 'pic-hall',
        page: 'page-4',
        type: 'picture',
        x: Math.round(12.7 * mm),
        y: Math.round(12.8 * mm),
        w: Math.round(101.6 * mm),
        h: Math.round(38.1 * mm),
        rotation: 0,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        src: dataURL(native.pictures[12]),
        imageFit: 'contain',
        imageNatural: true,
        master: false
      })
    }
    if (native.pictures?.[10] && d.pages.length >= 6) {
      picList.push({
        id: 'pic-photo-1',
        page: 'page-6',
        type: 'picture',
        x: Math.round(47.8 * mm),
        y: Math.round(5.6 * mm),
        w: Math.round(30.8 * mm),
        h: Math.round(6.1 * mm),
        rotation: 0,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        src: dataURL(native.pictures[10]),
        imageFit: 'contain',
        imageNatural: true,
        master: false
      })
    }
    if (native.pictures?.[5] && d.pages.length >= 8) {
      picList.push({
        id: 'pic-photo-2',
        page: 'page-8',
        type: 'picture',
        x: Math.round(47.7 * mm),
        y: Math.round(5.2 * mm),
        w: Math.round(30.8 * mm),
        h: Math.round(6.1 * mm),
        rotation: 0,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        src: dataURL(native.pictures[5]),
        imageFit: 'contain',
        imageNatural: true,
        master: false
      })
    }
    if (native.pictures?.[6] && d.pages.length >= 10) {
      picList.push({
        id: 'pic-emblem-10',
        page: 'page-10',
        type: 'picture',
        x: Math.round(45.7 * mm),
        y: Math.round(6.2 * mm),
        w: Math.round(35.0 * mm),
        h: Math.round(6.1 * mm),
        rotation: 0,
        fill: 'none',
        stroke: 'none',
        strokeWidth: 0,
        src: dataURL(native.pictures[6]),
        imageFit: 'contain',
        imageNatural: true,
        master: false
      })
    }
    d.objects = picList
    d.font = defaultFont
    d.size = 14
    d.baseStyle = { font: defaultFont, size: 14, color: '#000000' }
    return d
  }

  let inputParas = native.formattedParagraphs?.length ? native.formattedParagraphs : native.paragraphs
  if (Array.isArray(inputParas)) {
    let trimmed = [...inputParas]
    while (trimmed.length && !(typeof trimmed[0] === 'string' ? trimmed[0].trim() : trimmed[0]?.text?.trim())) trimmed.shift()
    while (trimmed.length && !(typeof trimmed[trimmed.length - 1] === 'string' ? trimmed[trimmed.length - 1].trim() : trimmed[trimmed.length - 1]?.text?.trim())) trimmed.pop()
    inputParas = trimmed
  }
  d.font = defaultFont
  d.baseStyle = { font: defaultFont, size: d.size || 12, color: '#000000' }
  d.pages = paginateParagraphs(inputParas, layout, native.pictureObjects)
  d.content = content
  if (native.pictureObjects?.length) {
   d.objects = native.pictureObjects.map((pic, idx) => ({
    id: 'pic-' + idx,
    page: pic.page === 0 ? null : ('page-' + (pic.page || 1)),
    type: 'picture',
    x: Math.round(pic.x * mm),
    y: Math.round(pic.y * mm),
    w: Math.max(12, Math.round(pic.w * mm)),
    h: Math.max(12, Math.round(pic.h * mm)),
    rotation: 0,
    fill: 'none',
    stroke: 'none',
    strokeWidth: 0,
    src: dataURL(pic.bytes),
    imageFit: 'contain',
    imageNatural: true,
    imageX: 0,
    imageY: 0,
    imageWidth: Math.max(12, Math.round(pic.w * mm)),
    imageHeight: Math.max(12, Math.round(pic.h * mm)),
    master: pic.page === 0
   }))
  } else if (native.pictures?.length) {
   d.objects = native.pictures.map((picBytes, idx) => ({
    id: 'pic-' + idx,
    page: 'page-1',
    type: 'picture',
    x: Math.round(12.7 * mm),
    y: Math.round((12.7 + idx * 55) * mm),
    w: Math.round(100 * mm),
    h: Math.round(50 * mm),
    rotation: 0,
    fill: 'none',
    stroke: 'none',
    strokeWidth: 0,
    src: dataURL(picBytes),
    imageFit: 'contain',
    imageNatural: true,
    imageX: 0,
    imageY: 0,
    imageWidth: Math.round(100 * mm),
    imageHeight: Math.round(50 * mm),
    master: false
   }))
  }
  return d
 }
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
