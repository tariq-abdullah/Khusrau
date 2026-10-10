from pathlib import Path
p=Path('src/App.vue');s=p.read_text(encoding='utf-8').replace("checkpoint();rootFrame(objects.value,selectedObject.value.id).text=storyText.value", "checkpoint();const root=rootFrame(objects.value,selectedObject.value.id);if(root.runs)root.runs=rebaseRuns(root.runs,root.text||'',storyText.value,0);root.text=storyText.value")
p.write_text(s,encoding='utf-8')
