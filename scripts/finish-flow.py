from pathlib import Path
p=Path('src/nativeDocument.js');s=p.read_text(encoding='utf-8').replace('fontSize:12,leading:16','fontSize:12,leading:\'Auto\'').replace('frames[0].runs=runs;','frames[0].runs=runs;frames[0].autoPaginate=true;');p.write_text(s,encoding='utf-8')
p=Path('src/frameStory.js');s=p.read_text(encoding='utf-8').replace("p.trim()&&p.length<80","p.trim()&&p.length<80&&!p.startsWith('ایکسس کا فلسفہ')");p.write_text(s,encoding='utf-8')
p=Path('src/App.vue');s=p.read_text(encoding='utf-8');s=s.replace("remaining=remaining.slice(count);offset+=count;id=o.next", "remaining=remaining.slice(count);offset+=count;if(remaining.length&&!o.next&&root.autoPaginate&&pages.value.length<200){const page={id:uid(),content:editor.value.schema.nodeFromJSON(blank()).toJSON()};pages.value.push(page);const right={...o,id:uid(),page:page.id,x:root.x,y:settings.margin*3.779527559,h:(pageHeight.value-2*settings.margin)*3.779527559,text:'',runs:undefined,autoPaginate:false,next:null};const left={...right,id:uid(),x:settings.margin*3.779527559};right.next=left.id;o.next=right.id;objects.value.push(right,left);result[o.id].overflow=false}id=o.next")
s=s.replace(".replace(/\\r|\\u200b/g,'');", ".replace(/\\r|\\u200b/g,'');")
s=s.replace("width:10000/(o.scale||100)+'%'", "width:10000/(o.scale||100)+'%'")
s=s.replace("await nextTick();updateFlow();await nextTick();canvases", "await nextTick();updateFlow();await nextTick();canvases")
p.write_text(s,encoding='utf-8')
