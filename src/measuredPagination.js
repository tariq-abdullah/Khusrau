import {DOMSerializer} from '@tiptap/pm/model'
import {splitInlineContent} from './richSplit.js'
import {exclusionPolygons,insertExclusions} from './runaround.js'
import {toTiptapNode} from './pagination.js'
import {createNativeColumnFrames} from './nativeColumnFrames.js'

// The fit callback measures the actual editor schema, fonts and column geometry.
// Splitting retains every character and mark, including paragraph continuations.
export function paginateMeasured(nodes,fits,{startPage=1,maxPages=200}={}){
 const pending=structuredClone(nodes),pages=[]
 let current=[]
 while(pending.length){
  if(pages.length>=maxPages)throw Error('The imported story exceeds the supported page limit.')
  const node=pending[0],page=startPage+pages.length
  if(fits([...current,node],page)){current.push(pending.shift());continue}
  const text=(node.content||[]).map(c=>c.text||'').join('')
  let lo=0,hi=text.length
  while(lo<hi){const mid=Math.ceil((lo+hi)/2),[part]=splitInlineContent(node.content,mid)
   if(fits([...current,{...node,content:part}],page))lo=mid;else hi=mid-1
  }
  if(lo>0&&lo<text.length){
   const word=text.lastIndexOf(' ',lo-1)
   if(word>=0&&word+1>lo/2)lo=word+1
   if(lo>0&&/[\uD800-\uDBFF]/.test(text[lo-1]))lo--
   const [head,tail]=splitInlineContent(node.content,lo)
   current.push({...node,content:head});pending[0]={...node,content:tail}
  }else if(!current.length)throw Error('A native text item cannot fit inside the page margins.')
  pages.push({id:'page-'+page,content:{type:'doc',content:current}});current=[]
 }
 if(current.length)pages.push({id:'page-'+(startPage+pages.length),content:{type:'doc',content:current}})
 return pages
}

export async function measureNativePages(d,native,schema){
 // This profile already uses explicit linked frames, with their own measured flow.
 if(d.objects?.some(o=>o.type==='text'))return d
 if(d.settings.columns>1&&native.characterRuns?.length)return createNativeColumnFrames(d,native)
 await document.fonts.load('12pt "'+d.font+'"')
 await document.fonts.ready
 const paras=native.formattedParagraphs||[],coverIndex=paras.findIndex(p=>p.text?.includes('بسم اللہ'))
 const hasCover=coverIndex>3&&paras.slice(0,coverIndex).some(p=>p.text?.includes('منشور'))
 const source=(hasCover?paras.slice(coverIndex):paras).map(p=>p.node?structuredClone(p.node):toTiptapNode(p))
 while(source.length&&!source[0].content?.length)source.shift()
 while(source.length&&!source.at(-1).content?.length)source.pop()
 if(!source.length)return d
 const mm=96/25.4,settings=d.settings,w=(d.paperWidth-settings.marginLeft-settings.marginRight)*mm,h=(d.paperHeight-settings.marginTop-settings.marginBottom)*mm
 const wrapper=document.createElement('div'),root=document.createElement('div')
 wrapper.className='text-boundary'+(settings.columns>1?' multi-column':'')
 Object.assign(wrapper.style,{position:'fixed',left:'-20000px',top:'0',width:w+'px',height:h+'px',fontFamily:d.font,fontSize:d.size+'pt',direction:d.direction,visibility:'hidden',pointerEvents:'none'})
 root.className='tiptap ProseMirror'
 Object.assign(root.style,{minHeight:'0',height:h+'px',width:w+'px',whiteSpace:'pre-wrap',columnCount:String(settings.columns||1),columnGap:settings.gap+'mm'})
 wrapper.style.setProperty('--editor-columns',String(settings.columns||1));wrapper.style.setProperty('--editor-gap',settings.gap+'mm')
 wrapper.style.setProperty('--auto-line-spacing',String(1+(d.preferences?.typo?.autoLineSpacing??50)/100))
 wrapper.append(root);document.body.append(wrapper)
 const serializer=DOMSerializer.fromSchema(schema)
 try{
  const fits=(nodes,page)=>{
   root.replaceChildren()
   const box={x:settings.marginLeft*mm,y:settings.marginTop*mm,w,h}
   insertExclusions(root,exclusionPolygons(d.objects.filter(o=>o.master||o.page==='page-'+page),box,{direction:d.direction}))
   root.append(serializer.serializeFragment(schema.nodeFromJSON({type:'doc',content:nodes}).content))
   // ProseMirror inserts a trailing <br> into empty text blocks. The schema
   // serializer omits that view-only node, so reproduce its line box here.
   for(const block of root.querySelectorAll('p,h1,h2,h3'))if(!block.childNodes.length)block.append(document.createElement('br'))
   if(nodes.at(-1)?.type==='heading'){
    const trailing=document.createElement('p');trailing.style.lineHeight='var(--auto-line-spacing,2.1)';trailing.append(document.createElement('br'));root.append(trailing)
   }
   const bounds=root.getBoundingClientRect(),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT)
   for(const block of root.querySelectorAll('p,h1,h2,h3'))if(!block.textContent&&block.getBoundingClientRect().bottom>bounds.bottom+1)return false
   while(walker.nextNode()){
    if(!walker.currentNode.textContent||walker.currentNode.parentElement?.closest('.runaround-float'))continue
    const range=document.createRange();range.selectNodeContents(walker.currentNode)
    for(const r of range.getClientRects())if(r.left<bounds.left-1||r.right>bounds.right+1||r.bottom>bounds.bottom+1)return false
   }
   return true
  }
  const pages=paginateMeasured(source,fits,{startPage:hasCover?2:1})
  d.pages=hasCover?[d.pages[0],...pages]:pages
  d.importReport.browserMeasuredPagination=true
  return d
 }finally{wrapper.remove()}
}
