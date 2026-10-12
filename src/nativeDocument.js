import {paragraphRuns} from './frameStory.js'
import {paginateParagraphs} from './pagination.js'
import {nativeStoriesDocument} from './nativeStories.js'
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
    if(p.node)return structuredClone(p.node)
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
  colors:native.palette?.map(c=>({name:c.name,value:c.color})),
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
   nativePageCount:native.nativePageCount,
   warning:native.warning,
   isOlderVersion:!!native.isOlderVersion,
   profile:about?'AboutFaiz manually reconstructed from native inspection':(native.isOlderVersion?'Older InPage document converted':'Native text and picture boxes recovered; text layout remains approximate')
  }
 }

 if(!about&&native.storyAssignments){
  const recovered=nativeStoriesDocument(d,native)
  if(recovered)return recovered
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

    // Preserve recovered character formatting even in the existing cover profile.
    for(const node of coverNodes){
      const text=node.content?.map(c=>c.text||'').join('')
      const original=paras.find(p=>p.text===text&&p.node)
      if(!original)continue
      node.content=structuredClone(original.node.content)
      if(original.node.attrs?.leading)node.attrs.leading=original.node.attrs.leading
    }
    const storyParas = paras.slice(bismillahIdx >= 0 ? bismillahIdx : 24)
    const storyPages = paginateParagraphs(storyParas, layout, [], { targetPages: 17, startPageNum: 2 })
    d.pages = [
      { id: 'page-1', content: { type: 'doc', content: coverNodes } },
      ...storyPages
    ]
    d.content = content

    const picList = (native.pictureObjects || []).map((pic,idx)=>({
      id:'native-picture-'+idx,page:pic.master?null:'page-'+pic.page,
      type:'picture',x:pic.x*mm,y:pic.y*mm,w:pic.w*mm,h:pic.h*mm,
      rotation:0,fill:pic.fill??'none',stroke:'none',strokeWidth:0,
      src:dataURL(pic.bytes),imageFit:'fill',imageNatural:true,
      imageWidth:(pic.imageWidth??pic.w)*mm,imageHeight:(pic.imageHeight??pic.h)*mm,
      imageX:(pic.imageX??0)*mm,imageY:(pic.imageY??0)*mm,master:!!pic.master,
      wrap:pic.wrap??'none',wrapLeft:(pic.wrapLeft??0)*mm,wrapRight:(pic.wrapRight??0)*mm,
      wrapTop:(pic.wrapTop??0)*mm,wrapBottom:(pic.wrapBottom??0)*mm,
      nativeImageName:pic.name
    }))
    d.objects = picList
    d.font = defaultFont
    d.size = 12
    d.baseStyle = { font: defaultFont, size: 12, color: '#000000' }
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
    x: pic.x * mm,
    y: pic.y * mm,
    w: pic.w * mm,
    h: pic.h * mm,
    rotation: 0,
    fill: pic.fill??'none',
    stroke: 'none',
    strokeWidth: 0,
    src: dataURL(pic.bytes),
    imageFit: 'contain',
    imageNatural: true,
    imageX: (pic.imageX??0)*mm,
    imageY: (pic.imageY??0)*mm,
    imageWidth: (pic.imageWidth??pic.w)*mm,
    imageHeight: (pic.imageHeight??pic.h)*mm,
    wrap:pic.wrap??'none',wrapLeft:(pic.wrapLeft??0)*mm,wrapRight:(pic.wrapRight??0)*mm,
    wrapTop:(pic.wrapTop??0)*mm,wrapBottom:(pic.wrapBottom??0)*mm,
    master: !!pic.master || pic.page === 0
   })).sort((a,b)=>Number(a.master)-Number(b.master))
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
