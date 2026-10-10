import { Extension, Mark, mergeAttributes } from '@tiptap/core'
export const Metrics = Mark.create({
 name:'metrics',
 addAttributes(){return {
  tracking:{default:0,parseHTML:e=>parseFloat(e.dataset.tracking)||0},
  scale:{default:100,parseHTML:e=>parseFloat(e.dataset.scale)||100},
  baseline:{default:0,parseHTML:e=>parseFloat(e.dataset.baseline)||0},
  decoration:{default:'None',parseHTML:e=>e.dataset.decoration||'None'},
  outline:{default:false,parseHTML:e=>e.dataset.outline==='true'},
 }},
 parseHTML(){return [{tag:'span[data-metrics]'}]},
 renderHTML({HTMLAttributes:a}){
  const line={None:'none',Single:'underline',Double:'underline',Overline:'overline',Box:'none'}[a.decoration]||'none'
  const style=`letter-spacing:${a.tracking/100}em;display:inline-block;transform:scaleX(${a.scale/100});transform-origin:center;vertical-align:${a.baseline}pt;text-decoration-line:${line};text-decoration-style:${a.decoration==='Double'?'double':'solid'};${a.decoration==='Box'?'border:1px solid currentColor;padding:0 2px;':''}${a.outline?'-webkit-text-stroke:.5px currentColor;-webkit-text-fill-color:transparent;':''}`
  return ['span',mergeAttributes({'data-metrics':'true','data-tracking':a.tracking,'data-scale':a.scale,'data-baseline':a.baseline,'data-decoration':a.decoration,'data-outline':a.outline,style}),0]
 }
})
export const ParagraphLayout=Extension.create({
 name:'paragraphLayout',
 addGlobalAttributes(){return [{types:['paragraph','heading'],attributes:{
  leading:{default:'Auto',parseHTML:e=>e.dataset.leading||'Auto',renderHTML:a=>({'data-leading':a.leading,style:`line-height:${a.leading==='Auto'?'2.1':a.leading+'pt'}`})},
  direction:{default:null,parseHTML:e=>e.getAttribute('dir'),renderHTML:a=>a.direction?{dir:a.direction}:{}},
  spaceBefore:{default:0,parseHTML:e=>parseFloat(e.style.marginTop)||0,renderHTML:a=>({style:`margin-top:${a.spaceBefore}pt`})},
  spaceAfter:{default:0,parseHTML:e=>parseFloat(e.style.marginBottom)||0,renderHTML:a=>({style:`margin-bottom:${a.spaceAfter}pt`})},
  indent:{default:0,parseHTML:e=>parseFloat(e.style.textIndent)||0,renderHTML:a=>({style:`text-indent:${a.indent}mm`})},
  beginIndent:{default:0,renderHTML:a=>({style:`padding-inline-start:${a.beginIndent}mm`})},
  endIndent:{default:0,renderHTML:a=>({style:`padding-inline-end:${a.endIndent}mm`})},
  fullJustify:{default:false,parseHTML:e=>e.style.textAlignLast==='justify',renderHTML:a=>({style:`text-align-last:${a.fullJustify?'justify':'auto'}`})},
 }},{types:['tableCell','tableHeader'],attributes:{backgroundColor:{default:null,parseHTML:e=>e.style.backgroundColor||null,renderHTML:a=>a.backgroundColor?{style:`background-color:${a.backgroundColor}`}:{}}}}]}
})
