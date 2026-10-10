from pathlib import Path
p=Path('src/App.vue');s=p.read_text(encoding='utf-8').replace('storySegments,populateStory','storySegments,populateStory,rebaseRuns').replace("import {capturePaper,makePDF,makeEPS} from './pageExport'\n",'')
s=s.replace("font:format.font,size:baseStyle.size", "font:baseStyle.font,size:baseStyle.size")
s=s.replace("function closeDocument(){autosave();localStorage.setItem('inpage-net-closed-backup',JSON.stringify(snapshot()));", "async function closeDocument(){autosave();try{await storeNative('recovery-'+uid(),JSON.parse(JSON.stringify(snapshot())))}catch(e){fail('Could not preserve a recovery copy. Save the document before closing.');return;}")
s=s.replace("async function exportDocument(kind){if(exporting.value)return;exporting.value=true;", "async function exportDocument(kind){if(exporting.value)return;const {capturePaper,makePDF,makeEPS}=await import('./pageExport');exporting.value=true;")
a=s.index('function frameInput(e,o)');b=s.index('\nfunction unlink',a)
s=s[:a]+'''function frameInput(e,o){if(e.target.getAttribute('contenteditable')!=='true')return;const segment=flow.value[o.id],root=rootFrame(objects.value,o.id);if(!root)return;const text=e.target.innerText.replace(/\\r|\\u200b/g,'');if(text===(segment?.text||''))return;checkpoint();if(root.runs)root.runs=rebaseRuns(root.runs,segment?.text||'',text,segment?.offset||0);root.text=(root.text||'').slice(0,segment?.offset||0)+text+(root.text||'').slice((segment?.offset||0)+(segment?.text.length||0));scheduleSave()}'''+s[b:]
p.write_text(s,encoding='utf-8')
