// Keep each column a distinct flow box so an obstacle in the left column cannot
// become a CSS float in the right column. The existing linked-story engine measures
// each box with its own page objects and master exclusions.
export function createNativeColumnFrames(d,native){
 const mm=96/25.4,s=d.settings,columns=s.columns||1
 const width=(d.paperWidth-s.marginLeft-s.marginRight-(columns-1)*s.gap)/columns
 const count=native.nativePageCount||d.pages.length,frames=[]
 const text=native.text.replace(/\r\n?/g,'\n')
 for(let page=1;page<=count;page++)for(let column=0;column<columns;column++){
  const ordinal=d.direction==='rtl'?columns-1-column:column
  frames.push({id:`native-column-${page}-${column}`,type:'text',page:'page-'+page,
   x:(s.marginLeft+ordinal*(width+s.gap))*mm,y:s.marginTop*mm,w:width*mm,h:(d.paperHeight-s.marginTop-s.marginBottom)*mm,
   columns:1,inset:0,font:d.font,fontSize:d.size,leading:'Auto',direction:d.direction,
   fill:'none',stroke:'none',strokeWidth:0,wrap:'none',text:'',rotation:0,
   richParagraphs:true,autoPaginate:false})
 }
 for(let i=0;i<frames.length-1;i++)frames[i].next=frames[i+1].id
 const root=frames[0]
 root.text=text;root.autoPaginate=true
 root.runs=native.characterRuns.map(run=>({...run,font:d.font,
  color:native.palette.find(c=>c.index===(run.nativeColorIndex??2))?.color||'#000000',
  leading:run.leading??run.fontSize*1.5}))
 d.pages=Array.from({length:count},(_,i)=>({id:'page-'+(i+1),content:{type:'doc',content:[{type:'paragraph'}]}}))
 d.objects=[...frames,...d.objects]
 d.settings.autoTextBox=false
 d.importReport.browserMeasuredPagination=true
 return d
}
