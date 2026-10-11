<script setup>
import {ref,reactive,computed,watch,onMounted,onBeforeUnmount,nextTick} from 'vue'
import {useEditor,EditorContent} from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import {TextStyleKit} from '@tiptap/extension-text-style'
import {TableKit} from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import {Metrics,ParagraphLayout} from './extensions'
import {keys,parseDocument} from './document'
import {tools,menus} from './controls'
import {normalizeRect,linkFrames,rootFrame,validateObjects,kashidaText,removeRecords,distToBoxBorder,findNearestTextBox} from './objects'
import Icon from './Icon.vue'
import Ribbon from './Ribbon.vue'
import ObjectRibbon from './ObjectRibbon.vue'
import NewDocumentDialog from './NewDocumentDialog.vue'
import StyleSheetDialog from './StyleSheetDialog.vue'
import PreferencesDialog from './PreferencesDialog.vue'
import KhusrauPreloader from './KhusrauPreloader.vue'
import {exclusionPolygons,insertExclusions} from './runaround'
import {Runaround,updateExclusions} from './RunaroundExtension'
import {readNative,storeNative,loadNative,storeWorkspace,loadWorkspace,documentFingerprint,unchangedNative,writeNativeText,createOlderInPageFile,createV3InPageFile} from './native'
import {nativeDocument} from './nativeDocument'
import {storySegments,populateStory,rebaseRuns} from './frameStory'
import {guidePoint,guideDrop,validGuides,snapToGuides} from './guides'
import {findTextMatches,textStatistics,pageInsertionIndex,dateFormats,duplicateOffsets} from './menuFeatures'
import {formatPageNumber,resolveMasterText,isObjectOnPage,isGuideOnPage,computeDefaultGrid,computeColumnGuides,resizeBox,MM_TO_PX} from './masterPage'
const uid=()=>crypto.randomUUID(),blank=()=>({type:'doc',content:[{type:'paragraph'}]})
const title=ref('Untitled-1'),message=ref('For Help, press F1'),menu=ref(''),dialog=ref(''),dirty=ref(false),revision=ref(0),tool=ref('edit'),selected=ref([]),pageIndex=ref(0),zoom=ref(100),file=ref(),imageFile=ref(),scroller=ref(),paperEl=ref(),previewRect=ref(null),flow=ref({}),documents=ref([]),activeDocument=ref(uid()),clipboard=ref(null),objectHistory=ref([]),objectFuture=ref([]),lastActionKind=ref('text'),indexTerms=ref([]),footnotes=ref([]),linkSource=ref(null),installEvent=ref(null)
const workspaceClosed=ref(false),windowLayout=ref('list'),isMasterPage=ref(false),masterSide=ref('right')
const showPreloader=ref(true),splashMode=ref('preloader')
const frameMatch=ref(null)
const customStyles=ref([]),styleName=ref(''),selectedStyle=ref('')
const wholeWord=ref(false),tabsMode=ref(false),dateChoices=dateFormats()
const rulerGuides=ref([]),guidePreview=ref(null)
const pageGuides=computed(()=>rulerGuides.value.filter(g=>isGuideOnPage(g,{currentPageId:pages.value[pageIndex.value]?.id,pageIndex:pageIndex.value,isFacing:settings.facing,isMaster:isMasterPage.value,masterSide:masterSide.value})))
const pages=ref([{id:uid(),content:blank()}]),objects=ref([])
const format=reactive({style:'Normal',font:'Jameel Noori Nastaleeq',latinFont:'Arial',size:12,leading:'Auto',baseline:0,tracking:0,scale:100,direction:'rtl',language:'Urdu',color:'#000000',decoration:'None',outline:false,superscript:false,kashida:'K-None'})
const settings=reactive({paper:'A4',orientation:'portrait',margin:13,columns:1,gap:8,rulers:true,guides:true,ribbon:true,tools:true,invisibles:false,indexEntries:false,snap:true,lockGuides:false,facing:false,wrap:true,hyphenation:false,tabSize:4,keyboard:'phonetic',spellcheck:false,borderWidth:0,borderColor:'#000000',grid:5})
const defaultsFormat={...format},defaultsSettings={...settings},baseStyle=reactive({font:'Jameel Noori Nastaleeq',size:12,color:'#000000'})
const documentFonts=computed(()=>{
  const s=new Set(['Jameel Noori Nastaleeq','Noto Nastaliq Urdu']);
  if(baseStyle.font)s.add(baseStyle.font);
  if(format.font)s.add(format.font);
  for(const o of objects.value){if(o.font)s.add(o.font)}
  for(const c of customStyles.value){if(c.font)s.add(c.font)}
  if(editor.value){try{editor.value.state.doc.descendants(n=>{if(n.marks)for(const m of n.marks)if(m.type.name==='textStyle'&&m.attrs?.fontFamily)s.add(m.attrs.fontFamily)})}catch{}}
  return Array.from(s)
})
const pageWidth=computed(()=>{const w=settings.paperWidth||(settings.paper==='A4'?210:settings.paper==='Letter'?215.9:settings.paper==='Legal'?215.9:settings.paper==='A5'?148:settings.paper==='B4'?250:settings.paper==='B5'?176:210);const h=settings.paperHeight||(settings.paper==='A4'?297:settings.paper==='Letter'?279.4:settings.paper==='Legal'?355.6:settings.paper==='A5'?210:settings.paper==='B4'?353:settings.paper==='B5'?250:297);return settings.orientation==='landscape'?Math.max(w,h):Math.min(w,h)}),pageHeight=computed(()=>{const w=settings.paperWidth||(settings.paper==='A4'?210:settings.paper==='Letter'?215.9:settings.paper==='Legal'?215.9:settings.paper==='A5'?148:settings.paper==='B4'?250:settings.paper==='B5'?176:210);const h=settings.paperHeight||(settings.paper==='A4'?297:settings.paper==='Letter'?279.4:settings.paper==='Legal'?355.6:settings.paper==='A5'?210:settings.paper==='B4'?353:settings.paper==='B5'?250:297);return settings.orientation==='landscape'?Math.min(w,h):Math.max(w,h)})
const defaultGridObject=computed(()=>computeDefaultGrid(pageWidth.value,pageHeight.value,settings,baseStyle,format))
const columnGuides=computed(()=>computeColumnGuides(defaultGridObject.value.w,settings.columns||1,(settings.gap||4.233)*MM_TO_PX))
const defaultPreferences = {
  app: {
    applicationType: 'ltr',
    marginGuidesColor: '#808080',
    userGuidesColor: '#0000ff',
    columnGuidesColor: '#808080',
    arrowMovement: 1,
    arrowWithControl: 0.1,
    greekTextBelow: 7,
    greekPictures: false,
    rightButtonAction: 'Floating Menu',
    rightButtonZoom: 100,
    logFileGenerate: true,
    logFilePath: '',
    autoSavePath: '',
    autoSaveEnabled: false,
    autoSaveMinutes: 10,
    autoSaveMaintainVersions: 1,
    allowCustomPostScript: false
  },
  doc: {
    unitGeneral: 'Millimeters',
    unitCharacter: 'Points',
    pasteboardAcross: 15,
    pasteboardDown: 25,
    snapDistance: 2,
    guidesPosition: 'Front',
    rulersVisible: true,
    rulerOriginAcross: 0,
    rulerOriginDown: 0,
    pageNumberStart: 1,
    pageNumberStyle: '1 2 3',
    viewPercent: 100
  },
  typo: {
    nastaliqFirstSpace: 0,
    nastaliqSubsequentSpace: 25,
    boxedAbove: 10,
    boxedBelow: 15,
    boxedText: 7,
    autoLineSpacing: 50,
    reduceLatinFontsize: 18,
    characterSpaceExtra: 20,
    underlinesShift: 40,
    underlinesWidth: 7,
    justPriorityNastaliq: 10,
    justPriorityLatin: 10,
    usePrinterWidths: false,
    autoKerning: true,
    autoKashida: true,
    footnoteFont: '',
    footnoteSize: 75,
    footnoteShift: 25
  },
  story: {
    storyFontSize: '12pt',
    printFontSize: '12pt',
    previewFontSize: '12pt',
    promptingSpeed: 'Low',
    printFooter: false
  },
  spelling: {
    ignoreUppercase: false,
    ignoreWithNumbers: false,
    dictLanguage: 'American English',
    spellLanguage: 'English'
  }
}

let savedPrefs = null
try {
  const raw = localStorage.getItem('inpage-preferences-default')
  if (raw) savedPrefs = JSON.parse(raw)
} catch (e) {}

const preferences = reactive({
  app: { ...defaultPreferences.app, ...(savedPrefs?.app || {}) },
  doc: { ...defaultPreferences.doc, ...(savedPrefs?.doc || {}) },
  typo: { ...defaultPreferences.typo, ...(savedPrefs?.typo || {}) },
  story: { ...defaultPreferences.story, ...(savedPrefs?.story || {}) },
  spelling: { ...defaultPreferences.spelling, ...(savedPrefs?.spelling || {}) }
})

const openSubmenu = ref('')
const prefKind = computed(() => {
  if (dialog.value === 'prefDoc') return 'doc'
  if (dialog.value === 'prefTypo') return 'typo'
  if (dialog.value === 'prefStory') return 'story'
  if (dialog.value === 'prefSpelling') return 'spelling'
  return 'app'
})

function saveDefaultPreferences({ kind, data }) {
  try {
    const raw = localStorage.getItem('inpage-preferences-default')
    const current = raw ? JSON.parse(raw) : {}
    current[kind] = JSON.parse(JSON.stringify(data))
    localStorage.setItem('inpage-preferences-default', JSON.stringify(current))
    message.value = 'Preferences saved as default'
  } catch (e) {}
}

let autoSaveInterval = null
function syncAutoSaveTimer() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval)
    autoSaveInterval = null
  }
  if (preferences.app.autoSaveEnabled && preferences.app.autoSaveMinutes > 0) {
    autoSaveInterval = setInterval(() => {
      autosave()
      maintainBackupVersions()
    }, preferences.app.autoSaveMinutes * 60 * 1000)
  }
}

function maintainBackupVersions() {
  const versions = Math.max(1, Math.min(10, preferences.app.autoSaveMaintainVersions || 1))
  try {
    for (let i = versions; i >= 1; i--) {
      const prevKey = `inpage-backup-B${String(i).padStart(2, '0')}`
      const olderKey = `inpage-backup-B${String(i + 1).padStart(2, '0')}`
      const existing = localStorage.getItem(prevKey)
      if (existing && i < versions) {
        localStorage.setItem(olderKey, existing)
      }
    }
    localStorage.setItem('inpage-backup-B01', JSON.stringify(snapshot()))
  } catch (e) {}
}

function onCanvasContextMenu(e) {
  if (preferences.app.rightButtonAction === 'Zoom') {
    e.preventDefault()
    const targetZoom = Number(preferences.app.rightButtonZoom) || 100
    zoom.value = zoom.value === targetZoom ? 100 : targetZoom
  }
}

watch(() => preferences.doc.rulersVisible, (v) => {
  if (v !== undefined) settings.rulers = v
})
watch(() => preferences.doc.viewPercent, (v) => {
  if (v) zoom.value = Number(v) || 100
})
watch([() => preferences.app.autoSaveEnabled, () => preferences.app.autoSaveMinutes], () => {
  syncAutoSaveTimer()
})
const colors=ref([{name:'Black',value:'#000000'},{name:'White',value:'#ffffff'},{name:'Red',value:'#c00000'},{name:'Green',value:'#008000'},{name:'Blue',value:'#0000c0'},{name:'Yellow',value:'#ffcc00'}])
const forms=reactive({}),find=ref(''),replacement=ref(''),matchCase=ref(true),searchCursor=ref(0),storyText=ref(''),pasteText=ref(''),symbol=ref('﷽'),newColorName=ref(''),newColorValue=ref('#006666'),autoIndexText=ref('')
const objectDefaults=reactive({x:0,y:0,w:200,h:100,rotation:0,fill:'none',stroke:'#000000',strokeWidth:1,strokeStyle:'solid',wrap:'none',wrapGap:2.6667,wrapLeft:2.6667,wrapRight:2.6667,wrapTop:1.3333,wrapBottom:1.3333,columns:1,columnGap:(settings.gap??4.233)*MM_TO_PX,radius:24,pattern:'none'})
watch(()=>settings.gap,(g)=>{if(g!==undefined)objectDefaults.columnGap=g*MM_TO_PX},{immediate:true})
function objectColumnGuides(o){if(!o||(o.columns||1)<=1)return[];const inset=o.inset??5;const w=Math.max(10,o.w-2*inset);const gap=o.columnGap??((settings.gap??4.233)*MM_TO_PX);return computeColumnGuides(w,o.columns,gap)}
const pictureEditing=ref(false),nativeSource=ref(null),importReport=ref(null),exporting=ref(false)
let flowPending=false
let timer,drag=null,suspend=false,measure=null,saveEpoch=0
const editor=useEditor({extensions:[StarterKit,TextAlign.configure({types:['heading','paragraph'],defaultAlignment:'right'}),TextStyleKit,Metrics,ParagraphLayout,TableKit,Image,Runaround],content:blank(),editorProps:{attributes:{lang:'ur','aria-label':'Document text'},handleKeyDown(view,e){if(tool.value==='edit'&&settings.keyboard==='phonetic'&&format.language!=='English'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!e.isComposing&&keys[e.key]){e.preventDefault();view.dispatch(view.state.tr.insertText(keys[e.key]));return true}if(e.key==='Tab'){e.preventDefault();view.dispatch(view.state.tr.insertText('\t'));return true}return false}},onUpdate(){if(suspend)return;lastActionKind.value='text';pages.value[pageIndex.value].content=editor.value.getJSON();revision.value++;scheduleSave()},onSelectionUpdate(){syncFormat()}})
const selectedObject=computed(()=>selected.value[0]==='default-grid'?defaultGridObject.value:objects.value.find(o=>o.id===selected.value[0]))
const contextType=computed(()=>selectedObject.value?.type||(!['select','edit','rotate','link','unlink'].includes(tool.value)?tool.value:null))
const objectContext=computed(()=>contextType.value&&!(tool.value==='edit'&&['text','title'].includes(contextType.value)))
const contextObject=computed(()=>{const o=selectedObject.value||objectDefaults;return {...o,endX:o.x+o.w,endY:o.y+o.h}})
function setObjectProperty(key,value){
if(selected.value.includes('default-grid')){
checkpoint();
if(key==='columns'){
settings.columns=Math.max(1,Math.min(12,Math.round(Number(value)||1)));
}else if(key==='columnGap'){
settings.gap=Math.max(0,Math.min(100,(Number(value)||0)/MM_TO_PX));
}else if(key==='x'){
settings.marginLeft=Math.max(0,(Number(value)||0)/MM_TO_PX);
}else if(key==='y'){
settings.marginTop=Math.max(0,(Number(value)||0)/MM_TO_PX);
}else if(key==='w'){
const wMm=Math.max(10,(Number(value)||10)/MM_TO_PX);
settings.marginRight=Math.max(0,pageWidth.value-(settings.marginLeft??settings.margin)-wMm);
}else if(key==='h'){
const hMm=Math.max(10,(Number(value)||10)/MM_TO_PX);
settings.marginBottom=Math.max(0,pageHeight.value-(settings.marginTop??settings.margin)-hMm);
}else if(key==='strokeWidth'){
settings.borderWidth=Math.max(0,Math.min(20,Number(value)||0));
}else if(key==='stroke'){
settings.borderColor=value;
}else if(key==='fill'){
settings.fill=value;
}else if(key==='pattern'){
settings.pattern=value;
}
scheduleSave();
nextTick(updateFlow);
return;
}
const targets=selected.value.length?objects.value.filter(o=>selected.value.includes(o.id)&&!o.locked):[objectDefaults];if(selected.value.length)checkpoint();for(const o of targets){if(key==='shape'){if(o===objectDefaults){chooseTool(value);continue}o.type=o.type?.includes('picture')?(value==='rectangle'?'picture':value+'-picture'):value;continue}if(key==='endX'){o.w=Math.max(1,value-o.x);continue}if(key==='endY'){o.h=Math.max(1,value-o.y);continue}if(typeof value==='number'){const bounds={w:[12,10000],h:[12,10000],x:[0,10000],y:[0,10000],strokeWidth:[0,40],wrapGap:[0,200],columns:[1,6],columnGap:[0,200],radius:[0,1000],imageScaleX:[1,1000],imageScaleY:[1,1000]};if(bounds[key])value=Math.max(bounds[key][0],Math.min(bounds[key][1],value));if(key==='columns')value=Math.round(value)}o[key]=value;if(key==='wrapGap')for(const side of ['Left','Right','Top','Bottom'])o['wrap'+side]=value}scheduleSave();nextTick(updateFlow)}
function objectAction(action){const o=selectedObject.value;if(!o)return;if(action==='place')pickPicture(o);else if(action==='editText'){chooseTool('edit');nextTick(()=>paperEl.value?.querySelector('[data-object-id="'+o.id+'"] [data-frame-editor]')?.focus())}else if(action==='editPicture'){chooseTool('edit');pictureEditing.value=true}else if(action==='selectBox')chooseTool('select');else{checkpoint();Object.assign(o,{imageX:0,imageY:0,imageScaleX:100,imageScaleY:100,imageRotation:0,imageSkewX:0,imageSkewY:0,mirrorX:false,mirrorY:false,imageFit:action==='fillPicture'?'cover':'contain'});scheduleSave()}}
function pictureClip(o){return {clipPath:['ellipse','ellipse-picture'].includes(o.type)?'ellipse(49% 49% at 50% 50%)':['round','round-picture'].includes(o.type)?'inset(1% round '+(o.radius??24)+'px)':'inset(0)'}}
function pictureStyle(o){return {objectFit:o.imageFit||'contain',width:o.imageNatural?o.imageWidth+'px':undefined,height:o.imageNatural?o.imageHeight+'px':undefined,transform:`translate(${o.imageX||0}px,${o.imageY||0}px) rotate(${o.imageRotation||0}deg) skew(${Math.atan((o.imageSkewX||0)/100)*180/Math.PI}deg,${Math.atan((o.imageSkewY||0)/100)*180/Math.PI}deg) scale(${(o.mirrorX?-1:1)*(o.imageScaleX??100)/100},${(o.mirrorY?-1:1)*(o.imageScaleY??100)/100})`}}
function patternStyle(o){const color=o.stroke==='none'?'#000000':o.stroke;const gradient=angle=>`repeating-linear-gradient(${angle}deg,transparent 0 5px,${color} 5px 6px)`;return {backgroundImage:o.pattern==='cross'?gradient(0)+','+gradient(90):gradient(o.pattern==='horizontal'?0:o.pattern==='vertical'?90:45),...(o.type==='polygon'?{clipPath:'polygon(1% 1%,99% 1%,1% 99%,99% 99%)'}:pictureClip(o))}}
function frameExclusions(o){const inset=o.inset??5;return exclusionPolygons(objects.value.filter(a=>(a.page===o.page||a.master)&&objects.value.indexOf(a)>objects.value.indexOf(o)),{id:o.id,x:o.x+inset,y:o.y+inset,w:Math.max(10,o.w-2*inset),h:Math.max(1,o.h-2*inset)},{direction:o.direction||format.direction})}
function floatStyle(p){return {float:p.side,width:p.width+'px',height:p.height+'px',shapeOutside:p.shape}}
const pageObjects=computed(()=>objects.value.filter(o=>isObjectOnPage(o,{currentPageId:pages.value[pageIndex.value]?.id,pageIndex:pageIndex.value,isFacing:settings.facing,isMaster:isMasterPage.value,masterSide:masterSide.value})))
function toggleMasterPage(){isMasterPage.value=!isMasterPage.value;selected.value=[];if(isMasterPage.value){chooseTool('select');selected.value=['default-grid'];message.value='Master Page Mode — Default Text Box selected. Modify columns, margins, or dimensions in Object Ribbon or Format -> Object.'}else{chooseTool('edit');message.value='For Help, press F1'}nextTick(updateFlow)}
function switchMasterSide(side){if(!['left','right'].includes(side))return;masterSide.value=side;selected.value=[];nextTick(updateFlow)}
function formattedDocPageNumber(pageIdx=pageIndex.value){const start=Number(preferences.doc.pageNumberStart)||1;const num=pageIdx+start;return formatPageNumber(num,preferences.doc.pageNumberStyle||'1 2 3')}
function displayFrameText(o){const raw=flow.value[o.id]?.text||o.text||'';if(o.master&&!isMasterPage.value){return resolveMasterText(raw,pageIndex.value+(Number(preferences.doc.pageNumberStart)||1),preferences.doc.pageNumberStyle)}return raw}
function displayStoryParagraph(text,o){if(o.master&&!isMasterPage.value){return resolveMasterText(text||'',pageIndex.value+(Number(preferences.doc.pageNumberStart)||1),preferences.doc.pageNumberStyle)||'\u200b'}return text||'\u200b'}
const currentStory=computed(()=>selectedObject.value&&['text','title'].includes(selectedObject.value.type)?rootFrame(objects.value,selectedObject.value.id)?.text||'':editor.value?.getText()||'')
const storyStats=computed(()=>textStatistics(currentStory.value))
const wordCount=computed(()=>{revision.value;const text=pages.value.map(p=>jsonText(p.content)).join(' ')+' '+objects.value.filter(o=>!objects.value.some(a=>a.next===o.id)).map(o=>o.text||'').join(' ');return text.trim().split(/\s+/).filter(Boolean).length})
const titles={pdf:'Save as PDF',eps:'Export Page as EPS',native:'Export native INP',text:'Export All Text',exportPage:'Export Page',print:'Print',new:'New document',duplicate:'Duplicate',shortcuts:'Short Cuts',close:'Close document',exit:'Close workspace',saveAs:'Save As',character:'Character',paragraph:'Paragraph',hyphenation:'Hyphenation',borders:'Borders',tabs:'Tabs',sort:'Sort Text',table:'Insert Table',tableFormat:'Table Format',tableLayout:'Table Layout',object:'Object',runaround:'Runaround',inset:'Inset',master:'Master Page Objects',page:'Document',guideSettings:'Guides',styles:'Style Sheets',colors:'Define Colors',date:'Date & Time',insertPage:'Insert Page',deletePage:'Delete Page',pageNumber:'Page Number',indexEntry:'Index Entry',footnote:'Footnote',spelling:'Spelling',words:'Word Count',autoIndex:'Auto Index',symbols:'Symbols',pasteSpecial:'Paste Special',find:'Find and Replace',story:'Story Editor',preferences:'Preferences',prefApp:'Application Preferences',prefDoc:'Document Preferences',prefTypo:'Typographic Preferences',prefStory:'Story Editor Preferences',prefSpelling:'Spelling Preferences',documents:'Document List',help:'Help Topics',keyboard:'Keyboard Layout',about:'About Khusrau 5.0',error:'Unable to complete action',olderVersion:'Older Version File Converted'}
function jsonText(n){return n.text??(n.content||[]).map(jsonText).join(n.type==='doc'?'\n':'')}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function scheduleSave(){saveEpoch++;dirty.value=true;clearTimeout(timer);timer=setTimeout(autosave,450)}
function snapshot(){if(editor.value&&!suspend)pages.value[pageIndex.value].content=editor.value.getJSON();return {format:'inpage-net',version:1,title:title.value,direction:format.direction,font:baseStyle.font,size:baseStyle.size,paper:settings.paper,margin:settings.margin,content:pages.value[0].content,currentPage:pageIndex.value,pages:JSON.parse(JSON.stringify(pages.value)),objects:JSON.parse(JSON.stringify(objects.value)),customStyles:JSON.parse(JSON.stringify(customStyles.value)),rulerGuides:JSON.parse(JSON.stringify(rulerGuides.value)),preferences:JSON.parse(JSON.stringify(preferences)),baseStyle:{...baseStyle},textFormat:{...format},settings:{...settings},colors:JSON.parse(JSON.stringify(colors.value)),nativeSource:nativeSource.value,importReport:importReport.value,indexTerms:JSON.parse(JSON.stringify(indexTerms.value)),footnotes:JSON.parse(JSON.stringify(footnotes.value))}}
function autosave(){try{const stamp=saveEpoch,d=snapshot();const tab=documents.value.find(d=>d.id===activeDocument.value);if(tab){tab.title=title.value;tab.data=d}const value=JSON.parse(JSON.stringify({documents:documents.value,active:activeDocument.value,draft:d}));storeWorkspace(value).then(()=>{if(stamp===saveEpoch)dirty.value=false;if(!exporting.value)message.value='Saved on this device'},()=>{message.value='Device storage unavailable. Save a document file.'})}catch{message.value='Save a document file to preserve your work.'}nextTick(updateFlow)}
function apply(d){suspend=true;nativeSource.value=d.nativeSource||null;importReport.value=d.importReport||null;title.value=d.title||'Untitled';Object.assign(baseStyle,{font:d.font,size:d.size,color:'#000000'},d.baseStyle||{});Object.assign(format,defaultsFormat,{direction:d.direction,font:d.font,size:d.size},d.textFormat||{});Object.assign(settings,defaultsSettings,{paper:d.paper,margin:d.margin,paperWidth:d.paperWidth,paperHeight:d.paperHeight,marginTop:d.marginTop,marginBottom:d.marginBottom,marginLeft:d.marginLeft,marginRight:d.marginRight,autoTextBox:d.settings?.autoTextBox!==false},d.settings||{});if(d.preferences){for(const k in d.preferences){if(preferences[k])Object.assign(preferences[k],d.preferences[k])}}pages.value=d.pages?.length?d.pages:[{id:uid(),content:d.content}];pages.value=pages.value.map(p=>({...p,content:editor.value.schema.nodeFromJSON(p.content).toJSON()}));objects.value=d.objects?validateObjects(d.objects):[];customStyles.value=Array.isArray(d.customStyles)?d.customStyles:[];rulerGuides.value=validGuides(d.rulerGuides,pages.value);guidePreview.value=null;drag=null;colors.value=d.colors?.length?d.colors:colors.value;indexTerms.value=d.indexTerms||[];footnotes.value=d.footnotes||[];pageIndex.value=Math.max(0,Math.min(pages.value.length-1,d.currentPage||0));selected.value=[];editor.value.commands.setContent(pages.value[pageIndex.value].content);suspend=false;revision.value++;objectHistory.value=[];objectFuture.value=[];nextTick(updateFlow)}
function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name.replace(/[<>:"/\\|?*]/g,'_');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function save(){download(JSON.stringify(snapshot(),null,2),title.value+'.ipdoc','application/json');autosave()}
async function open(e){const f=e.target.files?.[0];if(!f)return;try{let d,sourceBytes,nativeParsed;if(/\.inp$/i.test(f.name)){sourceBytes=new Uint8Array(await f.arrayBuffer());nativeParsed=readNative(sourceBytes);d=nativeDocument(nativeParsed,f.name)}else if(/\.txt$/i.test(f.name)){const text=await f.text();d={format:'inpage-net',version:1,title:f.name.replace(/\.txt$/i,''),direction:'rtl',font:'Jameel Noori Nastaleeq',size:12,paper:'A4',margin:13,content:{type:'doc',content:text.split(/\r?\n/).map(t=>({type:'paragraph',content:t?[{type:'text',text:t}]:[]}))}}}else d=parseDocument(await f.text());if(importMode){const content=nativeParsed?nativeParsed.paragraphs.map(t=>({type:'paragraph',content:t?[{type:'text',text:t}]:[]})):d.content.content;editor.value.chain().focus().insertContent(content).run()}else{autosave();const id=uid();documents.value.push({id,title:d.title,data:d});activeDocument.value=id;apply(d);chooseTool('edit');await document.fonts.ready;updateFlow();nextTick(()=>editor.value?.commands.focus());if(sourceBytes){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',sourceBytes))).map(v=>v.toString(16).padStart(2,'0')).join('');await storeNative(hash,sourceBytes);const root=objects.value.find(o=>o.autoPaginate&&o.text);const rawStory=root?.text.replace(/\n/g,'\r'),position=rawStory?nativeParsed.text.indexOf(rawStory):-1;nativeSource.value={key:hash,name:f.name,version:nativeParsed.version,isOlderVersion:!!nativeParsed.isOlderVersion,baseline:documentFingerprint(snapshot()),storyId:position>=0?root.id:null,textRange:position>=0&&nativeParsed.range?{start:nativeParsed.range.start+position*2,end:nativeParsed.range.start+(position+rawStory.length)*2}:null}}if(nativeParsed?.isOlderVersion){const alertMsg='This file was created in an older version of this software and we have converted it for you. You can download it in older version by File -> Download for older InPage.';message.value=alertMsg;dialog.value='olderVersion'}}autosave()}catch(err){fail(err.message)}finally{e.target.value='';importMode=false}}
let importMode=false
function fail(text){message.value=text;dialog.value='error'}
function changePage(index){if(index<0||index>=pages.value.length)return;pages.value[pageIndex.value].content=editor.value.getJSON();pageIndex.value=index;selected.value=[];suspend=true;editor.value.commands.setContent(pages.value[index].content);suspend=false;revision.value++;autosave();nextTick(updateFlow)}
function createNewDocument(cfg){
autosave();
const id=uid();
const pageCount=Math.max(1,Math.min(200,Number(cfg.pages)||1));
const w=Number(cfg.width)||210;
const h=Number(cfg.height)||297;
const mLeft=Number(cfg.marginLeft)??12.7;
const mRight=Number(cfg.marginRight)??12.7;
const mTop=Number(cfg.marginTop)??12.7;
const mBottom=Number(cfg.marginBottom)??12.7;
const orient=cfg.orientation||'portrait';
const dir=cfg.direction||'rtl';
const cols=Math.max(1,Math.min(12,Number(cfg.columns)||1));
const gut=Math.max(0,Math.min(100,Number(cfg.gutter)||4.23));
const d={
format:'inpage-net',
version:1,
title:'Untitled-'+(documents.value.length+1),
font:'Jameel Noori Nastaleeq',
size:12,
paper:cfg.pagePreset?.startsWith('A4')?'A4':cfg.pagePreset?.startsWith('Letter')?'Letter':cfg.pagePreset||'A4',
paperWidth:w,
paperHeight:h,
direction:dir,
margin:mLeft,
marginLeft:mLeft,
marginRight:mRight,
marginTop:mTop,
marginBottom:mBottom,
settings:{
orientation:orient,
paper:cfg.pagePreset?.startsWith('A4')?'A4':cfg.pagePreset?.startsWith('Letter')?'Letter':cfg.pagePreset||'A4',
paperWidth:w,
paperHeight:h,
margin:mLeft,
marginLeft:mLeft,
marginRight:mRight,
marginTop:mTop,
marginBottom:mBottom,
columns:cols,
gap:gut,
autoTextBox:cfg.autoTextBox!==false,
doubleSided:!!cfg.doubleSided,
facing:!!cfg.facingPages
},
pages:Array.from({length:pageCount},()=>({id:uid(),content:blank()})),
content:blank(),
objects:[]
};
documents.value.push({id,title:d.title,data:d});
activeDocument.value=id;
apply(d);
dialog.value='';
autosave()
}
function newDocument(){
createNewDocument({
pagePreset:'A4 210x297mm',
width:210,
height:297,
orientation:forms.orientation||'portrait',
pages:Number(forms.pageCount)||1,
marginLeft:Number(forms.margin)||12.7,
marginRight:Number(forms.margin)||12.7,
marginTop:Number(forms.margin)||12.7,
marginBottom:Number(forms.margin)||12.7,
direction:forms.direction||'rtl',
columns:Number(forms.columns)||1,
gutter:Number(forms.gap)||4.23,
autoTextBox:true,
doubleSided:false,
facingPages:false
});
}
function switchDocument(id){if(id===activeDocument.value)return;autosave();const tab=documents.value.find(d=>d.id===id);if(tab){activeDocument.value=id;apply(tab.data);chooseTool('edit');nextTick(()=>editor.value?.commands.focus());autosave()}}
function exitWorkspace(){autosave();workspaceClosed.value=true;dialog.value=''}
async function closeDocument(){autosave();try{await storeNative('recovery-'+uid(),JSON.parse(JSON.stringify(snapshot())))}catch(e){fail('Could not preserve a recovery copy. Save the document before closing.');return;}documents.value=documents.value.filter(d=>d.id!==activeDocument.value);if(documents.value.length){activeDocument.value=documents.value[0].id;apply(documents.value[0].data)}else newDocument();dialog.value='';autosave()}
function syncFormat(){if(!editor.value||document.activeElement?.closest('.ribbon')&&document.activeElement.matches('input,select'))return;const style=editor.value.getAttributes('textStyle'),metric=editor.value.getAttributes('metrics');format.size=style.fontSize?parseFloat(style.fontSize):baseStyle.size;format.font=style.fontFamily||baseStyle.font;format.color=style.color||baseStyle.color;Object.assign(format,{tracking:metric.tracking||0,scale:metric.scale||100,baseline:metric.baseline||0,decoration:metric.decoration||'None',outline:!!metric.outline});format.style=editor.value.isActive('heading')?'Heading '+editor.value.getAttributes('heading').level:editor.value.isActive('blockquote')?'Quote':'Normal'}
function metrics(overrides={}){const existing=editor.value.getAttributes('metrics'),attrs={tracking:existing.tracking??0,scale:existing.scale??100,baseline:existing.baseline??0,decoration:existing.decoration??'None',outline:existing.outline??false,...overrides};editor.value.chain().focus().setMark('metrics',attrs).run()}
function frameFormat(key,value){const frames=objects.value.filter(o=>selected.value.includes(o.id)&&['text','title'].includes(o.type));if(!frames.length||key==='language')return false;checkpoint();for(const o of frames){if(key==='font'||key==='latinFont')o.font=value;else if(key==='size')o.fontSize=value;else if(key==='style'){o.fontSize={'Normal':12,'Heading 1':24,'Heading 2':18,'Heading 3':14,'Quote':12}[value]||12;o.bold=value.startsWith('Heading')}else if(key==='superscript')o.baseline=value?6:0;else if(key==='kashida'){const root=rootFrame(objects.value,o.id);root.text=kashidaText(root.text||'',value==='K-None'?0:value==='K-Special'?1:2)}else o[key]=value;if(key==='wrapGap')for(const side of ['Left','Right','Top','Bottom'])o['wrap'+side]=value}scheduleSave();nextTick(updateFlow);return true}
function setFormat(key,value){if(key==='style'){const style=customStyles.value.find(s=>s.name===value);if(style){applyCustomStyle(style);return;}}const numeric=['size','baseline','tracking','scale'];if(numeric.includes(key)){value=parseFloat(value);if(!Number.isFinite(value))return;const limits={size:[6,144],baseline:[-100,100],tracking:[-50,200],scale:[10,300]};value=Math.max(limits[key][0],Math.min(limits[key][1],value))}if(key==='leading')value=/^auto$/i.test(value)?'Auto':Math.max(1,Math.min(300,parseFloat(value)||12));format[key]=value;if(frameFormat(key,value))return;const c=editor.value.chain().focus();if(key==='style'){if(value.startsWith('Heading'))c.setHeading({level:Number(value.slice(-1))}).run();else if(value==='Quote')c.toggleBlockquote().run();else c.setParagraph().run()}else if(key==='size')c.setFontSize(value+'pt').run();else if(key==='font'||key==='latinFont')c.setFontFamily(value).run();else if(key==='color')c.setColor(value).run();else if(key==='leading')c.updateAttributes('paragraph',{leading:value}).updateAttributes('heading',{leading:value}).run();else if(key==='language'){setDirection(value==='English'?'ltr':'rtl');editor.value.setOptions({editorProps:{attributes:{lang:{Urdu:'ur',English:'en',Arabic:'ar',Persian:'fa'}[value],'aria-label':'Document text',spellcheck:String(settings.spellcheck)}}})}else if(key==='superscript'){format.baseline=value?6:0;metrics({baseline:format.baseline})}else if(key==='kashida'){const {from,to}=editor.value.state.selection;if(from===to){message.value='Select a word to apply or remove Kashida.';return}const text=editor.value.state.doc.textBetween(from,to,'\n');c.insertContent({type:'text',text:kashidaText(text,value==='K-None'?0:value==='K-Special'?1:2)}).run()}else metrics({[key]:value});format[key]=value;scheduleSave()}
function saveCustomStyle(){const name=styleName.value.trim();if(!name||['Normal','Heading 1','Heading 2','Heading 3','Quote'].includes(name)){message.value='Choose a unique style name.';return;}const record={name,font:format.font,size:format.size,color:format.color,leading:format.leading,direction:format.direction};const old=customStyles.value.find(s=>s.name===name);if(old)Object.assign(old,record);else customStyles.value.push(record);selectedStyle.value=name;scheduleSave()}
function applyCustomStyle(style){if(!style)return;checkpoint();const font=style.urduFont||style.font||format.font;const latinFont=style.latinFont||format.latinFont;const size=style.size||format.size;const color=style.color||format.color;const leading=style.lineHeight||style.leading||format.leading;const lang=style.language||format.language;const dir=style.direction||(style.charAlignment==='Latin'||lang==='English'?'ltr':'rtl');setFormat('font',font);if(latinFont)setFormat('latinFont',latinFont);setFormat('size',size);setFormat('color',color);setFormat('leading',leading);setFormat('language',lang);setDirection(dir);if(style.alignment)align(style.alignment==='center'?'center':style.alignment==='full'?'full':style.alignment==='justify'?'justify':style.alignment==='left'?'left':'right');const c=editor.value.chain().focus();if(style.bold!==undefined){if(style.bold)c.setBold().run();else c.unsetBold().run()}if(style.italics!==undefined){if(style.italics)c.setItalic().run();else c.unsetItalic().run()}const tracking=style.spacing!==undefined?style.spacing:(style.tracking??0);const scale=style.scaling!==undefined?style.scaling:(style.scale??100);const baseline=style.baselineShift!==undefined?style.baselineShift:(style.baseline??0);const decoration=style.style||style.decoration||'None';const outline=!!style.outline;metrics({tracking,scale,baseline,decoration,outline});const firstLine=style.firstLineIndent??style.indent??0;const beginIndent=style.beginningIndent??style.beginIndent??0;const endIndent=style.endIndent??0;const spaceBefore=style.spaceBefore??0;const spaceAfter=style.spaceAfter??0;let borderAboveVal=null;if(style.borderAbove&&style.borderAbove!=='None'){const width=style.borderAbove==='Hairline'?'1px':style.borderAbove;const sType=(style.borderAboveStyle||'solid').toLowerCase();borderAboveVal=`${width} ${sType} currentColor`}let borderBelowVal=null;if(style.borderBelow&&style.borderBelow!=='None'){const width=style.borderBelow==='Hairline'?'1px':style.borderBelow;const sType=(style.borderBelowStyle||'solid').toLowerCase();borderBelowVal=`${width} ${sType} currentColor`}editor.value.chain().focus().updateAttributes('paragraph',{indent:firstLine,beginIndent,endIndent,spaceBefore,spaceAfter,borderAbove:borderAboveVal,borderBelow:borderBelowVal}).updateAttributes('heading',{indent:firstLine,beginIndent,endIndent,spaceBefore,spaceAfter,borderAbove:borderAboveVal,borderBelow:borderBelowVal}).run();format.style=style.name;scheduleSave()}
function setDirection(dir){format.direction=dir;if(selectedObject.value&&['text','title'].includes(selectedObject.value.type)){checkpoint();for(const o of objects.value.filter(o=>selected.value.includes(o.id)))o.direction=dir;scheduleSave();return;}editor.value.chain().focus().updateAttributes('paragraph',{direction:dir}).updateAttributes('heading',{direction:dir}).setTextAlign(dir==='rtl'?'right':'left').run();scheduleSave()}
function align(a){if(selectedObject.value&&['text','title'].includes(selectedObject.value.type)){checkpoint();for(const o of objects.value.filter(o=>selected.value.includes(o.id)))o.align=a==='full'?'justify':a;scheduleSave();return}editor.value.chain().focus().setTextAlign(a==='full'?'justify':a).updateAttributes('paragraph',{fullJustify:a==='full'}).updateAttributes('heading',{fullJustify:a==='full'}).run();scheduleSave()}
function character(cmd){if(selectedObject.value&&['text','title'].includes(selectedObject.value.type)){checkpoint();for(const o of objects.value.filter(o=>selected.value.includes(o.id)))o[cmd]=!o[cmd];scheduleSave();return}editor.value.chain().focus()[cmd==='bold'?'toggleBold':'toggleItalic']().run()}
function checkpoint(){const snapshot=JSON.stringify(objects.value);const last=objectHistory.value[objectHistory.value.length-1];if(last&&JSON.stringify(last)===snapshot)return;lastActionKind.value='object';objectHistory.value.push(JSON.parse(snapshot));if(objectHistory.value.length>80)objectHistory.value.shift();objectFuture.value=[]}
function objectUndo(redo=false){const source=redo?objectFuture:objectHistory,target=redo?objectHistory:objectFuture;if(!source.value.length)return;const currentStr=JSON.stringify(objects.value);let nextState=source.value.pop();while(nextState&&JSON.stringify(nextState)===currentStr&&source.value.length){nextState=source.value.pop()}if(!nextState||JSON.stringify(nextState)===currentStr)return;target.value.push(JSON.parse(currentStr));objects.value=nextState;selected.value=[];lastActionKind.value='object';scheduleSave();nextTick(updateFlow)}
function performUndo(){if(document.activeElement?.closest('[data-frame-editor]')){document.execCommand?.('undo');return}if(document.activeElement?.closest('.tiptap')){editor.value?.chain().focus().undo().run();return}if(selected.value.length&&objectHistory.value.length){objectUndo();return}if(lastActionKind.value==='object'&&objectHistory.value.length){objectUndo();return}if(editor.value?.can().undo()){editor.value.chain().focus().undo().run();return}if(objectHistory.value.length){objectUndo();return}}
function performRedo(){if(document.activeElement?.closest('[data-frame-editor]')){document.execCommand?.('redo');return}if(document.activeElement?.closest('.tiptap')){editor.value?.chain().focus().redo().run();return}if(selected.value.length&&objectFuture.value.length){objectUndo(true);return}if(lastActionKind.value==='object'&&objectFuture.value.length){objectUndo(true);return}if(editor.value?.can().redo()){editor.value.chain().focus().redo().run();return}if(objectFuture.value.length){objectUndo(true);return}}
const toolShortcuts={select:'Ctrl+1',edit:'Ctrl+2',rotate:'Ctrl+3',link:'Ctrl+4',unlink:'Ctrl+5'}
const toolTooltip=reactive({visible:false,label:'',shortcut:'',pos:'right',top:0,left:0})
function showTooltipForElement(el){
  if(!el||typeof el.getAttribute!=='function')return;
  const label=el.getAttribute('data-tooltip');
  if(!label)return;
  const r=el.getBoundingClientRect();
  const shortcut=el.getAttribute('data-shortcut')||(el.dataset?.toolId?toolShortcuts[el.dataset.toolId]:'');
  let pos=el.getAttribute('data-tooltip-pos');
  if(!pos){
    if(el.closest('aside'))pos='right';
    else if(el.closest('.pagebar, footer'))pos='top';
    else pos='bottom';
  }
  toolTooltip.label=label;
  toolTooltip.shortcut=shortcut||'';
  toolTooltip.pos=pos;
  if(pos==='right'){
    toolTooltip.top=r.top+r.height/2;
    toolTooltip.left=r.right+7;
  }else if(pos==='top'){
    toolTooltip.top=r.top-6;
    toolTooltip.left=Math.max(60,Math.min(window.innerWidth-60,r.left+r.width/2));
  }else{
    toolTooltip.top=r.bottom+6;
    toolTooltip.left=Math.max(60,Math.min(window.innerWidth-60,r.left+r.width/2));
  }
  toolTooltip.visible=true;
}
function showToolTooltip(e,label,id){
  const el=e.currentTarget||e.target;
  if(id)el.dataset.toolId=id;
  if(label)el.setAttribute('data-tooltip',label);
  showTooltipForElement(el);
}
function hideToolTooltip(){toolTooltip.visible=false}
function handlePointerOver(e){
  const el=e.target?.closest?.('[data-tooltip]');
  if(el)showTooltipForElement(el);
}
function handlePointerOut(e){
  const target=e.target?.closest?.('[data-tooltip]');
  const related=e.relatedTarget?.closest?.('[data-tooltip]');
  if(!related||related!==target){
    toolTooltip.visible=false;
  }
}
function chooseTool(id){pictureEditing.value=false;if(!['edit','select','rotate','link','unlink'].includes(id))selected.value=[];tool.value=id;linkSource.value=null;editor.value.setEditable(id==='edit');message.value={select:'Click an object; drag to move. Shift-click selects multiple objects.',edit:'Click text to edit; double-click a picture frame to place an image.',rotate:'Select an object, then drag to rotate.',link:'Click the source text box, then the destination text box.',unlink:'Click a text box to disconnect its link.'}[id]||'Drag on the page to create '+tools.find(t=>t[0]===id)?.[1].toLowerCase()}
function point(e){return guidePoint(e.clientX,e.clientY,paperEl.value.getBoundingClientRect(),zoom.value)}
function pointerDown(e){if(e.button!==0||e.target.closest('.canvas-object')||e.target.closest('.master-default-grid'))return;const p=point(e),borderTol=Math.max(8,Math.min(20,10/(zoom.value/100)));if(tool.value==='select'){const candidateTextBoxes=pageObjects.value.filter(a=>['text','title'].includes(a.type)&&(!a.master||isMasterPage.value));if(candidateTextBoxes.length){const {nearest,distance}=findNearestTextBox(p,candidateTextBoxes);if(nearest&&distance<=borderTol){if(e.shiftKey){selected.value=selected.value.includes(nearest.id)?selected.value.filter(id=>id!==nearest.id):[...selected.value,nearest.id]}else{selected.value=nearest.group?objects.value.filter(a=>a.group===nearest.group).map(a=>a.id):[nearest.id]}Object.assign(format,{font:nearest.font||baseStyle.font,size:nearest.fontSize||baseStyle.size,leading:nearest.leading||'Auto',color:nearest.color||'#000000'});if(!nearest.locked){drag={kind:'move',start:p,initial:objects.value.filter(a=>selected.value.includes(a.id)).map(a=>({...a})),center:{x:nearest.x+nearest.w/2,y:nearest.y+nearest.h/2},started:false,snapshot:JSON.parse(JSON.stringify(objects.value))}}e.preventDefault();return}}if(e.target.closest('.text-boundary')||e.target.closest('.tiptap')||e.target.closest('.ProseMirror')){chooseTool('edit');nextTick(()=>editor.value?.commands.focus());return}selected.value=[];return}if(tool.value==='edit'){selected.value=[];return}if(['rotate','link','unlink'].includes(tool.value))return;drag={kind:'create',start:p};previewRect.value={x:p.x,y:p.y,w:1,h:1};e.preventDefault()}
function selectDefaultGrid(e){if(e.button!==0||!isMasterPage.value)return;const p=point(e),borderTol=Math.max(8,Math.min(20,10/(zoom.value/100))),d=distToBoxBorder(p,defaultGridObject.value);if(d>borderTol)return;if(tool.value==='edit')chooseTool('select');selected.value=['default-grid'];message.value='Default Text Box selected. Modify columns, margins, or dimensions in Object Ribbon or Format -> Object.';if(!settings.lockGuides){drag={kind:'move',handle:null,isDefaultGrid:true,start:p,initial:[{...defaultGridObject.value}],started:false,snapshot:JSON.parse(JSON.stringify(objects.value))};e.preventDefault()}}
function objectDown(e,o){if(e.button!==0)return;if(!isMasterPage.value&&o.master)return;if(e.target.closest('.resize-handle'))return;const p=point(e),borderTol=Math.max(8,Math.min(20,10/(zoom.value/100)));if(tool.value==='link'){if(!linkSource.value){if(o.type!=='text'){message.value='Select an ordinary text frame.';return}linkSource.value=o.id;selected.value=[o.id];message.value='Click the destination text frame.'}else{try{checkpoint();const root=rootFrame(objects.value,linkSource.value);linkFrames(objects.value,linkSource.value,o.id);root.text=(root.text||'')+(o.text?'\n'+o.text:'');o.text='';linkSource.value=null;scheduleSave();nextTick(updateFlow)}catch(err){fail(err.message)}}return}if(tool.value==='unlink'){unlink(o);return}if(['text','title'].includes(o.type)){const candidateTextBoxes=pageObjects.value.filter(a=>['text','title'].includes(a.type)&&(!a.master||isMasterPage.value));const {nearest,distance}=findNearestTextBox(p,candidateTextBoxes);if(nearest&&distance<=borderTol){const target=nearest;if(e.shiftKey){selected.value=selected.value.includes(target.id)?selected.value.filter(id=>id!==target.id):[...selected.value,target.id];return}selected.value=target.group?objects.value.filter(a=>a.group===target.group).map(a=>a.id):[target.id];Object.assign(format,{font:target.font||baseStyle.font,size:target.fontSize||baseStyle.size,leading:target.leading||'Auto',color:target.color||'#000000',tracking:target.tracking||0,scale:target.scale||100,baseline:target.baseline||0,decoration:target.decoration||'None',outline:target.outline||false});if(target.locked){message.value='This object is locked.';return}drag={kind:tool.value==='rotate'?'rotate':'move',start:p,initial:objects.value.filter(a=>selected.value.includes(a.id)).map(a=>({...a})),center:{x:target.x+target.w/2,y:target.y+target.h/2},started:false,snapshot:JSON.parse(JSON.stringify(objects.value))};e.preventDefault();return}if(tool.value==='edit'){if(!o.locked&&(!o.master||isMasterPage.value)){const frameEl=e.currentTarget?.querySelector?.('[data-frame-editor]');if(frameEl&&document.activeElement!==frameEl){frameEl.focus()}}return}if(tool.value==='select'){if(e.target.closest('[data-frame-editor]')){chooseTool('edit');nextTick(()=>{const frameEl=e.currentTarget?.querySelector?.('[data-frame-editor]');frameEl?.focus()});return}selected.value=[];return}return}pictureEditing.value=tool.value==='edit'&&o.type.includes('picture');if(e.shiftKey){selected.value=selected.value.includes(o.id)?selected.value.filter(id=>id!==o.id):[...selected.value,o.id];return}if(!selected.value.includes(o.id))selected.value=o.group?objects.value.filter(a=>a.group===o.group).map(a=>a.id):[o.id];if(tool.value==='edit'){if(o.type.includes('picture')&&o.src&&!o.locked){drag={kind:'picture',start:p,initial:[{...o}],started:false,snapshot:JSON.parse(JSON.stringify(objects.value))};e.preventDefault()}return}if(o.locked){message.value='This object is locked.';return}drag={kind:tool.value==='rotate'?'rotate':'move',start:p,initial:objects.value.filter(a=>selected.value.includes(a.id)).map(a=>({...a})),center:{x:o.x+o.w/2,y:o.y+o.h/2},started:false,snapshot:JSON.parse(JSON.stringify(objects.value))};e.preventDefault()}
function rulerDown(e,axis,guide=null){if(e.button!==0||settings.lockGuides)return;if(!isMasterPage.value&&guide?.master)return;e.preventDefault();e.stopPropagation();settings.guides=true;const p=point(e);drag={kind:'rulerGuide',axis,id:guide?.id,page:isMasterPage.value?null:pages.value[pageIndex.value].id,master:isMasterPage.value,side:isMasterPage.value?(settings.facing?masterSide.value:'both'):undefined};guidePreview.value={id:guide?.id,axis,position:guide?.position??(axis==='horizontal'?p.y:p.x)};e.currentTarget.setPointerCapture?.(e.pointerId)}
function cancelDrag(){if(drag?.kind==='rulerGuide'){drag=null;guidePreview.value=null}}
function guideDown(e,side){if(settings.lockGuides)return;drag={kind:'guide',side};e.preventDefault()}
function resizeDown(e,o,handle='se'){if(o.locked)return;selected.value=[o.id];drag={kind:'resize',handle,isDefaultGrid:o.id==='default-grid',start:point(e),initial:[{...o}],started:false,snapshot:JSON.parse(JSON.stringify(objects.value))};e.preventDefault()}
function pointerMove(e){if(!drag)return;const p=point(e);if(drag.kind==='rulerGuide'){guidePreview.value={id:drag.id,axis:drag.axis,position:drag.axis==='horizontal'?p.y:p.x};return}if(drag.kind==='guide'){if(!settings.lockGuides){const px=drag.side==='left'?p.x:drag.side==='right'?pageWidth.value*3.7795-p.x:drag.side==='top'?p.y:pageHeight.value*3.7795-p.y;settings.margin=Math.max(5,Math.min(60,Math.round(px/3.7795)))}return;}if(drag.kind==='create'){previewRect.value=normalizeRect(drag.start.x,drag.start.y,p.x,p.y);return}const dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.started&&drag.snapshot&&(Math.abs(dx)>0.5||Math.abs(dy)>0.5)){const last=objectHistory.value[objectHistory.value.length-1];if(!last||JSON.stringify(last)!==JSON.stringify(drag.snapshot)){lastActionKind.value='object';objectHistory.value.push(drag.snapshot);if(objectHistory.value.length>80)objectHistory.value.shift();objectFuture.value=[]}drag.started=true}for(const a of drag.initial){if(drag.kind==='resize'){if(drag.isDefaultGrid){const resized=resizeBox(a,drag.handle||'se',dx,dy,20,20);settings.marginLeft=Math.round(resized.x/MM_TO_PX*10)/10;settings.marginTop=Math.round(resized.y/MM_TO_PX*10)/10;settings.marginRight=Math.max(0,Math.round((pageWidth.value-settings.marginLeft-(resized.w/MM_TO_PX))*10)/10);settings.marginBottom=Math.max(0,Math.round((pageHeight.value-settings.marginTop-(resized.h/MM_TO_PX))*10)/10)}else{const o=objects.value.find(o=>o.id===a.id);if(!o||o.locked)continue;const resized=resizeBox(a,drag.handle||'se',dx,dy,20,20);o.x=resized.x;o.y=resized.y;o.w=resized.w;o.h=resized.h}}else if(drag.isDefaultGrid){const newX=Math.max(0,a.x+dx);const newY=Math.max(0,a.y+dy);settings.marginLeft=Math.round(newX/MM_TO_PX*10)/10;settings.marginTop=Math.round(newY/MM_TO_PX*10)/10;settings.marginRight=Math.max(0,Math.round((pageWidth.value-settings.marginLeft-(a.w/MM_TO_PX))*10)/10);settings.marginBottom=Math.max(0,Math.round((pageHeight.value-settings.marginTop-(a.h/MM_TO_PX))*10)/10)}else{const o=objects.value.find(o=>o.id===a.id);if(!o||o.locked)continue;if(drag.kind==='picture'){o.imageX=(a.imageX||0)+dx;o.imageY=(a.imageY||0)+dy}else if(drag.kind==='rotate')o.rotation=Math.round(Math.atan2(p.y-drag.center.y,p.x-drag.center.x)*180/Math.PI+90);else{const grid=settings.snap?settings.grid:1;o.x=Math.max(0,Math.round((a.x+dx)/grid)*grid);o.y=Math.max(0,Math.round((a.y+dy)/grid)*grid);if(settings.snap&&settings.guides){const snapTol=((Number(preferences.doc.snapDistance)||2)*96/25.4)/(zoom.value/100);o.x=snapToGuides(o.x,o.w,pageGuides.value.filter(g=>g.axis==='vertical').map(g=>g.position),snapTol);o.y=snapToGuides(o.y,o.h,pageGuides.value.filter(g=>g.axis==='horizontal').map(g=>g.position),snapTol)}}}}if(!flowPending){flowPending=true;requestAnimationFrame(()=>{flowPending=false;updateFlow()})}}
function pointerUp(e){if(!drag)return;if(drag.kind==='rulerGuide'){const p=point(e),inside=guideDrop(p,pageWidth.value*96/25.4,pageHeight.value*96/25.4),index=rulerGuides.value.findIndex(g=>g.id===drag.id);if(inside&&!settings.lockGuides){const g={id:drag.id||uid(),page:drag.page,master:drag.master,side:drag.side,axis:drag.axis,position:drag.axis==='horizontal'?p.y:p.x};if(index<0)rulerGuides.value.push(g);else rulerGuides.value[index]=g}else if(index>=0&&!settings.lockGuides)rulerGuides.value.splice(index,1);drag=null;guidePreview.value=null;scheduleSave();return;}if(drag.kind==='create'){const rect=previewRect.value;if(rect&&rect.w>=12&&rect.h>=12){checkpoint();const isMaster=isMasterPage.value;const o={id:uid(),page:isMaster?null:pages.value[pageIndex.value].id,master:isMaster,masterSide:isMaster?(settings.facing?masterSide.value:'both'):undefined,...objectDefaults,type:tool.value,...rect,rotation:objectDefaults.rotation,columnGap:(settings.gap??4.233)*MM_TO_PX,inset:5,text:'',locked:false};objects.value.push(o);selected.value=[o.id];message.value=isMaster?'Master object created. It will repeat across '+(settings.facing?(masterSide.value==='left'?'left (even) pages.':'right (odd) pages.'):'all pages.'):'Object created. Use the selection tool to move or resize it.'}}drag=null;previewRect.value=null;scheduleSave();nextTick(updateFlow)}
function updateFlow(){updateExclusions(editor.value,exclusionPolygons(pageObjects.value,{x:settings.margin*3.779527559,y:settings.margin*3.779527559,w:(pageWidth.value-2*settings.margin)*3.779527559,h:(pageHeight.value-2*settings.margin)*3.779527559},{direction:format.direction}));if(!measure){measure=document.createElement('div');measure.className='flow-measure';document.body.appendChild(measure)}const result={};for(const root of objects.value.filter(o=>['text','title'].includes(o.type)&&!objects.value.some(a=>a.next===o.id))){let id=root.id,remaining=root.text||'',offset=0;const seen=new Set();while(id&&!seen.has(id)){seen.add(id);const o=objects.value.find(a=>a.id===id);if(!o)break;const isMultiCol=(o.columns||1)>1;Object.assign(measure.style,{width:Math.max(10,o.w/((o.scale||100)/100)-2*(o.inset||5))+'px',height:isMultiCol?Math.max(10,o.h-2*(o.inset||5))+'px':'',fontFamily:o.font||baseStyle.font,fontSize:(o.fontSize||baseStyle.size)+'pt',lineHeight:o.leading&&o.leading!=='Auto'?o.leading+'pt':'2.1',direction:o.direction||format.direction,columnCount:String(o.columns||1),columnGap:(o.columnGap??((settings.gap??4.233)*MM_TO_PX))+'px',columnFill:'auto',orphans:'1',widows:'1',fontWeight:o.bold?'bold':'normal',fontStyle:o.italic?'italic':'normal',letterSpacing:(o.tracking||0)/100+'em',textAlign:o.align||'right',textIndent:(o.indent||0)+'mm',paddingInlineStart:(o.beginIndent||0)+'mm',paddingInlineEnd:(o.endIndent||0)+'mm'});let low=0,high=remaining.length;while(low<high){const mid=Math.ceil((low+high)/2);measure.replaceChildren();insertExclusions(measure,frameExclusions(o));if(o.richParagraphs)populateStory(measure,remaining.slice(0,mid),offset,root.runs||[],o);else measure.append(document.createTextNode(remaining.slice(0,mid)));let fits=false;if(isMultiCol){const range=document.createRange();range.selectNodeContents(measure);const rects=range.getClientRects(),box=measure.getBoundingClientRect();let overflow=false;for(let ri=0;ri<rects.length;ri++){const r=rects[ri];if(r.left<box.left-2||r.right>box.right+2||r.bottom>box.bottom+2){overflow=true;break}}fits=!overflow}else fits=measure.scrollHeight<=o.h-2*(o.inset||5);if(fits)low=mid;else high=mid-1}let count=low;if(count<remaining.length){const space=remaining.lastIndexOf(' ',count);if(space>count/2)count=space+1}result[o.id]={text:remaining.slice(0,count),offset,root:root.id,overflow:!o.next&&count<remaining.length};remaining=remaining.slice(count);offset+=count;if(remaining.length&&!o.next&&root.autoPaginate&&pages.value.length<200){const page={id:uid(),content:editor.value.schema.nodeFromJSON(blank()).toJSON()};pages.value.push(page);const right={...o,id:uid(),page:page.id,x:root.x,y:settings.margin*3.779527559,h:(pageHeight.value-2*settings.margin)*3.779527559,text:'',runs:undefined,autoPaginate:false,next:null};const left={...right,id:uid(),x:settings.margin*3.779527559};right.next=left.id;o.next=right.id;objects.value.push(right,left);result[o.id].overflow=false}id=o.next}}flow.value=result}
function frameInput(e,o){if(e.target.getAttribute('contenteditable')!=='true')return;const segment=flow.value[o.id],root=rootFrame(objects.value,o.id);if(!root)return;const text=e.target.innerText.replace(/\r|\u200b/g,'');if(text===(segment?.text||''))return;checkpoint();if(root.runs)root.runs=rebaseRuns(root.runs,segment?.text||'',text,segment?.offset||0);root.text=(root.text||'').slice(0,segment?.offset||0)+text+(root.text||'').slice((segment?.offset||0)+(segment?.text.length||0));scheduleSave()}
function selectFrameText(frame){if(!frame)return false;if(tool.value!=='edit')chooseTool('edit');frame.setAttribute('contenteditable','true');frame.focus();let ok=false;try{ok=document.execCommand('selectAll')}catch{}const sel=window.getSelection();if((!ok||!sel?.toString()?.length)&&sel){const range=document.createRange();range.selectNodeContents(frame);sel.removeAllRanges();sel.addRange(range)}return true}
function unlink(o){checkpoint();const next=objects.value.find(a=>a.id===o.next);if(next){const root=rootFrame(objects.value,o.id),offset=flow.value[next.id]?.offset||0;next.text=(root.text||'').slice(offset);root.text=(root.text||'').slice(0,offset);o.next=null}else{const prev=objects.value.find(a=>a.next===o.id);if(prev){const root=rootFrame(objects.value,prev.id),offset=flow.value[o.id]?.offset||0;o.text=(root.text||'').slice(offset);root.text=(root.text||'').slice(0,offset);prev.next=null}}scheduleSave();nextTick(updateFlow)}
async function readPicture(e){const f=e.target.files?.[0];if(!f)return;try{if(!['image/png','image/jpeg','image/webp','image/gif'].includes(f.type))throw Error('Choose a PNG, JPEG, WebP or GIF image.');if(f.size>5*1024*1024)throw Error('Choose an image smaller than 5 MB.');const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(f)});if(selectedObject.value?.type.includes('picture')){checkpoint();selectedObject.value.src=data;scheduleSave()}else editor.value.chain().focus().setImage({src:data,alt:f.name}).run();message.value='Picture placed'}catch(err){fail(err.message)}finally{e.target.value=''}}
function frameKey(e){if(settings.keyboard!=='phonetic'||format.language==='English'||e.ctrlKey||e.altKey||e.metaKey||e.isComposing||!keys[e.key])return;e.preventDefault();const selection=window.getSelection();if(!selection.rangeCount)return;const range=selection.getRangeAt(0);range.deleteContents();const node=document.createTextNode(keys[e.key]);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range)}
function pickPicture(o){selected.value=[o.id];imageFile.value.click()}
function findMatches(){if(selectedObject.value&&['text','title'].includes(selectedObject.value.type))return findTextMatches(rootFrame(objects.value,selectedObject.value.id)?.text||'',find.value,{matchCase:matchCase.value,wholeWord:wholeWord.value});const matches=[];editor.value.state.doc.descendants((node,pos)=>{if(node.isText)for(const m of findTextMatches(node.text,find.value,{matchCase:matchCase.value,wholeWord:wholeWord.value}))matches.push({from:pos+m.from,to:pos+m.to})});return matches}
function findNext(){const matches=findMatches(),next=matches.find(m=>m.from>=searchCursor.value)||matches[0];if(!next){message.value='No matches found';return}if(selectedObject.value&&['text','title'].includes(selectedObject.value.type)){frameMatch.value=next;const root=rootFrame(objects.value,selectedObject.value.id),frame=objects.value.find(o=>flow.value[o.id]?.root===root.id&&flow.value[o.id].offset<=next.from&&flow.value[o.id].offset+(flow.value[o.id].text?.length||0)>next.from);if(frame){if(frame.page!==pages.value[pageIndex.value].id)changePage(pages.value.findIndex(p=>p.id===frame.page));selected.value=[frame.id];nextTick(()=>paperEl.value?.querySelector('[data-object-id="'+frame.id+'"]')?.scrollIntoView({block:'nearest'}));}}else editor.value.chain().setTextSelection(next).scrollIntoView().run();searchCursor.value=next.to;message.value=matches.length+' matches on this page'}
function replaceAll(){const matches=findMatches();if(selectedObject.value&&['text','title'].includes(selectedObject.value.type)){const root=rootFrame(objects.value,selectedObject.value.id);checkpoint();for(const m of [...matches].reverse()){const before=root.text;root.text=before.slice(0,m.from)+replacement.value+before.slice(m.to);if(root.runs)root.runs=rebaseRuns(root.runs,before,root.text,0)}scheduleSave();nextTick(updateFlow);message.value='Replaced '+matches.length+' matches in this story';return;}const tr=editor.value.state.tr;for(const m of matches.reverse())tr.insertText(replacement.value,m.from,m.to);editor.value.view.dispatch(tr);message.value='Replaced '+matches.length+' matches'}
function replaceOne(){if(selectedObject.value&&['text','title'].includes(selectedObject.value.type)){const root=rootFrame(objects.value,selectedObject.value.id),m=frameMatch.value;if(m&&findTextMatches(root.text.slice(m.from,m.to),find.value,{matchCase:matchCase.value}).length){checkpoint();const before=root.text;root.text=before.slice(0,m.from)+replacement.value+before.slice(m.to);if(root.runs)root.runs=rebaseRuns(root.runs,before,root.text,0);searchCursor.value=m.from+replacement.value.length;scheduleSave();nextTick(updateFlow)}frameMatch.value=null;findNext();return;}const {from,to}=editor.value.state.selection;if(editor.value.state.doc.textBetween(from,to)===find.value){editor.value.chain().insertContent(replacement.value).run();searchCursor.value=from+replacement.value.length}findNext()}
async function copy(cut=false){if(selected.value.length){clipboard.value={kind:'objects',data:JSON.parse(JSON.stringify(objects.value.filter(o=>selected.value.includes(o.id))))};if(cut)removeObjects();message.value='Objects copied';return}const {from,to}=editor.value.state.selection,text=editor.value.state.doc.textBetween(from,to,'\n');if(!text)return;clipboard.value={kind:'text',data:text};try{await navigator.clipboard.writeText(text)}catch{message.value='Copied inside this app; system clipboard access is unavailable.'}if(cut)editor.value.chain().focus().deleteSelection().run()}
function duplicateObjects(data,offsetX=12,offsetY=12){checkpoint();const mapping=new Map(data.map(o=>[o.id,uid()])),copied=data.map(o=>({...o,id:mapping.get(o.id),page:pages.value[pageIndex.value].id,x:o.x+offsetX,y:o.y+offsetY,next:mapping.get(o.next)||null,group:o.group?mapping.get(data.find(a=>a.group===o.group)?.id):null,locked:false}));objects.value.push(...copied);selected.value=copied.map(o=>o.id);scheduleSave()}
async function paste(){if(clipboard.value?.kind==='objects'){duplicateObjects(clipboard.value.data);return}let text;try{text=await navigator.clipboard.readText()}catch{text=clipboard.value?.data}if(typeof text==='string'&&text)editor.value.chain().focus().insertContent({type:'text',text}).run();else{pasteText.value='';dialog.value='pasteSpecial'}}
function removeObjects(){if(selected.value.includes('default-grid')){message.value='The default text box cannot be deleted.';return}const ids=new Set(selected.value.filter(id=>!objects.value.find(o=>o.id===id)?.locked));if(!ids.size){message.value='Unlock objects before deleting them.';return}checkpoint();objects.value=removeRecords(objects.value,ids);selected.value=[];scheduleSave()}
function fit(){zoom.value=Math.max(25,Math.min(200,Math.floor((scroller.value.clientWidth-70)/(pageWidth.value*3.7795)*100)))}
function openDialog(name){if(name==='about'){splashMode.value='about';showPreloader.value=true;return}dialog.value=name;const o=selectedObject.value;Object.assign(forms,{paper:settings.paper,orientation:settings.orientation,direction:format.direction,pageCount:1,insertPlacement:'after',duplicateRows:2,duplicateColumns:1,rowGap:0,columnGap:0,margin:settings.margin,marginLeft:settings.marginLeft??settings.margin??12.7,marginRight:settings.marginRight??settings.margin??12.7,marginTop:settings.marginTop??settings.margin??12.7,marginBottom:settings.marginBottom??settings.margin??12.7,columns:settings.columns,gap:settings.gap,rows:3,cols:3,width:(o?.w||200)*25.4/96,height:(o?.h||100)*25.4/96,x:(o?.x||0)*25.4/96,y:(o?.y||0)*25.4/96,dontPrint:o?.dontPrint||false,objectDirection:o?.direction||format.direction,objectGap:o?.columnGap!==undefined?(o.columnGap*25.4/96):(settings.gap??4.233),radius:o?.radius!==undefined?(o.radius*25.4/96):6.35,objectLocked:o?.locked||false,objectPattern:o?.pattern||'none',rotation:o?.rotation||0,fill:o?.fill||'none',stroke:o?.stroke||'#000000',strokeWidth:o?.strokeWidth??1,inset:o?.inset??5,wrap:o?.wrap||'none',wrapLeft:(o?.wrapLeft??o?.wrapGap??2.6667)/3.779527559,wrapRight:(o?.wrapRight??o?.wrapGap??2.6667)/3.779527559,wrapTop:(o?.wrapTop??o?.wrapGap??1.3333)/3.779527559,wrapBottom:(o?.wrapBottom??o?.wrapGap??1.3333)/3.779527559,master:o?.master||false,fontSize:o?.fontSize||format.size,objectColumns:o?.columns||1,spaceBefore:o?.spaceBefore??editor.value.getAttributes('paragraph').spaceBefore??0,spaceAfter:o?.spaceAfter??editor.value.getAttributes('paragraph').spaceAfter??0,indent:o?.indent??editor.value.getAttributes('paragraph').indent??0,beginIndent:o?.beginIndent??editor.value.getAttributes('paragraph').beginIndent??0,endIndent:o?.endIndent??editor.value.getAttributes('paragraph').endIndent??0,paragraphAlign:o?(o.align||(o.direction==='ltr'?'left':'right')):(editor.value.getAttributes('paragraph').textAlign||'right'),paragraphLeading:o?.leading||editor.value.getAttributes('paragraph').leading||'Auto',tabSize:settings.tabSize,grid:settings.grid,borderWidth:settings.borderWidth,borderColor:settings.borderColor,sortDirection:'ascending',dateFormat:dateChoices[0],insertCount:1,pageNumber:pageIndex.value+1,indexTerm:editor.value.state.doc.textBetween(editor.value.state.selection.from,editor.value.state.selection.to),footnote:'',hyphenation:settings.hyphenation,spellcheck:settings.spellcheck,keyboard:settings.keyboard,newTitle:title.value,exportScope:'range',exportFrom:pageIndex.value+1,exportTo:pageIndex.value+1,pdfFilename:title.value+'.pdf',pdfMirror:false,pdfError:''});if(name==='story')storyText.value=o&&['text','title'].includes(o.type)?rootFrame(objects.value,o.id)?.text||'':editor.value.getText();if(name==='autoIndex')autoIndexText.value=indexTerms.value.map(t=>t.term).join('\n')}
function disabled(cmd){if(exporting.value)return true;if(cmd==='undo')return !objectHistory.value.length&&!editor.value?.can().undo();if(cmd==='redo')return !objectFuture.value.length&&!editor.value?.can().redo();if(selected.value.includes('default-grid')){if(['object','lock'].includes(cmd))return false;if(['duplicate','clear','copy','cut','group','ungroup','inset','runaround','master','topmost','back','front'].includes(cmd))return true;}if(['duplicate','clear','copy','cut'].includes(cmd))return !selected.value.length&&editor.value?.state.selection.empty;if(cmd==='inset')return !selectedObject.value||!['text','title'].includes(selectedObject.value.type);if(cmd==='place')return !selectedObject.value?.type.includes('picture');if(['topmost','back','front','lock','object','runaround','inset','master'].includes(cmd))return !selected.value.length;if(cmd==='group')return selected.value.length<2;if(cmd==='ungroup')return !selectedObject.value?.group;if(['tableFormat','tableLayout','splitTable'].includes(cmd))return !editor.value?.isActive('table');return false}
function checked(cmd){return {ribbon:!settings.ribbon,tools:!settings.tools,rulers:!settings.rulers,guides:!settings.guides,invisibles:settings.invisibles,indexEntries:settings.indexEntries,snap:settings.snap,lockGuides:settings.lockGuides,facing:settings.facing,wrap:settings.wrap}[cmd]}
async function action(cmd){menu.value='';if(disabled(cmd))return;const c=()=>editor.value.chain().focus(),toggle={ribbon:'ribbon',tools:'tools',rulers:'rulers',guides:'guides',invisibles:'invisibles',indexEntries:'indexEntries',snap:'snap',lockGuides:'lockGuides',facing:'facing',wrap:'wrap'};if(toggle[cmd]){settings[toggle[cmd]]=!settings[toggle[cmd]];scheduleSave();return}if(cmd.startsWith('zoom')){zoom.value=Number(cmd.slice(4));return}switch(cmd){case 'about':splashMode.value='about';showPreloader.value=true;break;case 'new':openDialog('new');break;case 'close':case 'exit':openDialog(cmd);break;case 'open':importMode=false;file.value.click();break;case 'import':importMode=true;file.value.click();break;case 'save':save();break;case 'downloadOlderInPage':await downloadOlderInPage();break;case 'text':case 'exportPage':case 'pdf':case 'eps':case 'native':openDialog(cmd);break;case 'print':openDialog('print');break;case 'undo':performUndo();break;case 'redo':performRedo();break;case 'cut':await copy(true);break;case 'copy':await copy();break;case 'paste':await paste();break;case 'clear':selected.value.length?removeObjects():c().deleteSelection().run();break;case 'duplicate':openDialog('duplicate');break;case 'tabs':tabsMode.value=!tabsMode.value;break;case 'all':{let frame=document.activeElement?.closest?.('[data-frame-editor]');if(!frame&&selected.value.length===1){const selObj=objects.value.find(o=>o.id===selected.value[0]);if(selObj&&['text','title'].includes(selObj.type)){frame=paperEl.value?.querySelector?.('[data-object-id="'+selObj.id+'"] [data-frame-editor]')}}if(frame&&selectFrameText(frame)){break}if((tool.value==='select'||!editor.value?.isFocused)&&!selected.value.length){chooseTool('select');selected.value=pageObjects.value.map(o=>o.id)}else if(tool.value==='select'&&selected.value.length>1){selected.value=pageObjects.value.map(o=>o.id)}else c().selectAll().run();break;}case 'topmost':case 'front':case 'back':checkpoint();objects.value=[...objects.value.filter(o=>cmd==='back'?selected.value.includes(o.id):!selected.value.includes(o.id)),...objects.value.filter(o=>cmd==='back'?!selected.value.includes(o.id):selected.value.includes(o.id))];scheduleSave();break;case 'lock':checkpoint();if(selected.value.includes('default-grid')){settings.lockGuides=!settings.lockGuides;message.value=settings.lockGuides?'Default grid locked':'Default grid unlocked';scheduleSave();break}const nextLock=!objects.value.filter(o=>selected.value.includes(o.id)).every(o=>o.locked);for(const o of objects.value.filter(o=>selected.value.includes(o.id)))o.locked=nextLock;scheduleSave();break;case 'group':{checkpoint();const group=uid();for(const o of objects.value.filter(o=>selected.value.includes(o.id)))o.group=group;scheduleSave();break}case 'ungroup':checkpoint();for(const o of objects.value.filter(o=>selected.value.includes(o.id)))o.group=null;scheduleSave();break;case 'fit':fit();break;case 'picture':case 'place':imageFile.value.click();break;case 'pageNumber':if(isMasterPage.value){insertPlain('#');message.value='Page number marker (#) inserted'}else openDialog('pageNumber');break;case 'splitTable':splitTable();break;case 'generateIndex':generateIndex();break;case 'toc':generateTOC();break;case 'nextDocument':{const i=documents.value.findIndex(d=>d.id===activeDocument.value);switchDocument(documents.value[(i+1)%documents.value.length]?.id);break}case 'cascade':windowLayout.value='cascade';dialog.value='documents';break;case 'tile':windowLayout.value='tile';dialog.value='documents';break;case 'documents':windowLayout.value='list';dialog.value='documents';break;default:openDialog(cmd)}}
function insertPlain(text){if(!text)return;if(selectedObject.value&&['text','title'].includes(selectedObject.value.type)){const root=rootFrame(objects.value,selectedObject.value.id);checkpoint();root.text=(root.text||'')+text;scheduleSave();nextTick(updateFlow);message.value='Inserted at the end of the selected story.'}else editor.value.chain().focus().insertContent({type:'text',text}).run()}
function splitTable(){const {selection,doc}=editor.value.state;let depth=selection.$from.depth;while(depth>0&&selection.$from.node(depth).type.name!=='table')depth--;if(!depth)return;const table=selection.$from.node(depth),start=selection.$from.before(depth),rowIndex=selection.$from.index(depth);if(rowIndex<1){message.value='Select a cell below the first row to split the table.';return}const rows=table.toJSON().content;editor.value.chain().focus().insertContentAt({from:start,to:start+table.nodeSize},[{type:'table',content:rows.slice(0,rowIndex)},{type:'paragraph'},{type:'table',content:rows.slice(rowIndex)}]).run()}
function applyDialog(){const name=dialog.value;switch(name){case 'saveAs':title.value=forms.newTitle||'Untitled';save();break;case 'page':settings.paper=forms.paper;settings.orientation=forms.orientation;if(!settings.lockGuides){settings.marginLeft=Math.max(0,Math.min(100,Number(forms.marginLeft)||Number(forms.margin)||12.7));settings.marginRight=Math.max(0,Math.min(100,Number(forms.marginRight)||Number(forms.margin)||12.7));settings.marginTop=Math.max(0,Math.min(100,Number(forms.marginTop)||Number(forms.margin)||12.7));settings.marginBottom=Math.max(0,Math.min(100,Number(forms.marginBottom)||Number(forms.margin)||12.7));settings.margin=settings.marginLeft;}settings.columns=Math.max(1,Math.min(12,Number(forms.columns)||1));settings.gap=Math.max(0,Math.min(50,Number(forms.gap)||4.233));break;case 'duplicate':{const data=JSON.parse(JSON.stringify(objects.value.filter(o=>selected.value.includes(o.id))));if(data.length){const rows=Math.max(1,Math.min(20,Number(forms.duplicateRows)||1)),cols=Math.max(1,Math.min(20,Number(forms.duplicateColumns)||1));for(const p of duplicateOffsets(data,rows,cols,(Number(forms.rowGap)||0)*96/25.4,(Number(forms.columnGap)||0)*96/25.4))duplicateObjects(data,p.x,p.y)}else{const {from,to}=editor.value.state.selection,content=editor.value.state.doc.slice(from,to).content.toJSON();editor.value.chain().focus().insertContentAt(to,content).run()}break}case 'paragraph':{const attrs={spaceBefore:Number(forms.spaceBefore)||0,spaceAfter:Number(forms.spaceAfter)||0,indent:Number(forms.indent)||0,beginIndent:Number(forms.beginIndent)||0,endIndent:Number(forms.endIndent)||0,leading:forms.paragraphLeading==='Auto'?'Auto':Math.max(1,Number(forms.paragraphLeading)||12),textAlign:forms.paragraphAlign};const frames=objects.value.filter(o=>selected.value.includes(o.id)&&['text','title'].includes(o.type));if(frames.length){checkpoint();for(const o of frames)Object.assign(o,attrs,{align:attrs.textAlign,richParagraphs:true})}else editor.value.chain().focus().updateAttributes('paragraph',attrs).updateAttributes('heading',attrs).run();break}case 'hyphenation':settings.hyphenation=forms.hyphenation;break;case 'borders':settings.borderWidth=Math.max(0,Math.min(20,Number(forms.borderWidth)||0));settings.borderColor=forms.borderColor;break;case 'tabs':settings.tabSize=Math.max(1,Math.min(16,Number(forms.tabSize)||4));break;case 'sort':{const paragraphs=editor.value.getJSON().content||[],sortable=paragraphs.filter(n=>n.type==='paragraph');sortable.sort((a,b)=>jsonText(a).localeCompare(jsonText(b),'ur')*(forms.sortDirection==='descending'?-1:1));let i=0;editor.value.commands.setContent({type:'doc',content:paragraphs.map(n=>n.type==='paragraph'?sortable[i++]:n)});break}case 'table':editor.value.chain().focus().insertTable({rows:Math.max(1,Math.min(30,Number(forms.rows)||3)),cols:Math.max(1,Math.min(12,Number(forms.cols)||3)),withHeaderRow:true}).run();break;case 'tableFormat':editor.value.chain().focus().setCellAttribute('backgroundColor',forms.fill==='none'?null:forms.fill).run();break;case 'object':case 'runaround':case 'inset':case 'master':{if(name==='object'&&selected.value.includes('default-grid')){checkpoint();const newX=Math.max(0,Number(forms.x)||0);const newY=Math.max(0,Number(forms.y)||0);const newW=Math.max(10,Number(forms.width)||20);const newH=Math.max(10,Number(forms.height)||20);settings.marginLeft=newX;settings.marginTop=newY;settings.marginRight=Math.max(0,pageWidth.value-newX-newW);settings.marginBottom=Math.max(0,pageHeight.value-newY-newH);settings.columns=Math.max(1,Math.min(12,Number(forms.objectColumns)||1));settings.gap=Math.max(0,Math.min(100,Number(forms.objectGap)||4.233));settings.borderWidth=Math.max(0,Math.min(20,Number(forms.strokeWidth)||0));settings.borderColor=forms.stroke||'#000000';settings.fill=forms.fill||'none';settings.pattern=forms.objectPattern||'none';break;}checkpoint();for(const o of objects.value.filter(o=>selected.value.includes(o.id))){if(name==='object')Object.assign(o,{x:Math.max(0,(Number(forms.x)||0)*96/25.4),y:Math.max(0,(Number(forms.y)||0)*96/25.4),w:Math.max(20,(Number(forms.width)||20)*96/25.4),h:Math.max(20,(Number(forms.height)||20)*96/25.4),dontPrint:forms.dontPrint,locked:forms.objectLocked,direction:forms.objectDirection,columnGap:Math.max(0,(forms.objectGap!==''&&forms.objectGap!==undefined?Number(forms.objectGap):(settings.gap??4.233))*96/25.4),pattern:forms.objectPattern,rotation:Number(forms.rotation)||0,fill:forms.fill,stroke:forms.stroke,strokeWidth:Math.max(0,Number(forms.strokeWidth)||0),fontSize:Math.max(6,Number(forms.fontSize)||12),columns:Math.max(1,Math.min(6,Number(forms.objectColumns)||1)),...(forms.radius!==undefined?{radius:Math.max(0,Number(forms.radius)||0)*96/25.4}:{})});if(name==='runaround'){o.wrap=forms.wrap;for(const side of ['Left','Right','Top','Bottom'])o['wrap'+side]=Math.max(0,Math.min(50,Number(forms['wrap'+side])||0))*3.779527559}if(name==='inset')o.inset=Math.max(0,Number(forms.inset)||0);if(name==='master'){o.master=forms.master;if(o.master&&!o.masterSide)o.masterSide=settings.facing?masterSide.value:'both'}}break}case 'guideSettings':settings.grid=Math.max(1,Math.min(100,Number(forms.grid)||5));break;case 'date':insertPlain(forms.dateFormat);break;case 'insertPage':{const count=Math.max(1,Math.min(20,Number(forms.insertCount)||1));pages.value[pageIndex.value].content=editor.value.getJSON();const at=pageInsertionIndex(pageIndex.value,pages.value.length,forms.insertPlacement);pages.value.splice(at,0,...Array.from({length:count},()=>({id:uid(),content:blank()})));pageIndex.value=at;suspend=true;editor.value.commands.setContent(pages.value[at].content);suspend=false;selected.value=[];break}case 'deletePage':if(pages.value.length===1){editor.value.commands.clearContent();objects.value=objects.value.filter(o=>o.page!==pages.value[0].id)}else{const id=pages.value[pageIndex.value].id;pages.value.splice(pageIndex.value,1);objects.value=objects.value.filter(o=>o.page!==id);pageIndex.value=Math.min(pageIndex.value,pages.value.length-1);suspend=true;editor.value.commands.setContent(pages.value[pageIndex.value].content);suspend=false}break;case 'pageNumber':if(isMasterPage.value)insertPlain('#');else insertPlain(forms.pageNumber?String(Math.max(1,Number(forms.pageNumber)||1)):formattedDocPageNumber());break;case 'indexEntry':if(forms.indexTerm.trim())indexTerms.value.push({term:forms.indexTerm.trim(),page:pageIndex.value+1});break;case 'footnote':if(forms.footnote.trim()){const n=footnotes.value.length+1;footnotes.value.push({number:n,text:forms.footnote,page:pages.value[pageIndex.value].id});insertPlain('['+n+']')}break;case 'autoIndex':{indexTerms.value=[];for(const term of autoIndexText.value.split('\n').map(t=>t.trim()).filter(Boolean))pages.value.forEach((p,i)=>{if((jsonText(p.content)+' '+objects.value.filter(o=>o.page===p.id).map(o=>flow.value[o.id]?.text||o.text||'').join(' ')).includes(term))indexTerms.value.push({term,page:i+1})});message.value='Indexed '+indexTerms.value.length+' entries';break}case 'pasteSpecial':if(pasteText.value)insertPlain(pasteText.value);break;case 'story':if(selectedObject.value&&['text','title'].includes(selectedObject.value.type)){checkpoint();const root=rootFrame(objects.value,selectedObject.value.id);if(root.runs)root.runs=rebaseRuns(root.runs,root.text||'',storyText.value,0);root.text=storyText.value}else editor.value.commands.setContent({type:'doc',content:storyText.value.split('\n').map(t=>({type:'paragraph',content:t?[{type:'text',text:t}]:[]}))});break;case 'preferences':settings.keyboard=forms.keyboard;settings.spellcheck=forms.spellcheck;editor.value.setOptions({editorProps:{attributes:{lang:format.language==='English'?'en':'ur',spellcheck:String(settings.spellcheck),'aria-label':'Document text'}}});break;case 'spelling':settings.spellcheck=true;editor.value.setOptions({editorProps:{attributes:{spellcheck:'true',lang:format.language==='English'?'en':'ur','aria-label':'Document text'}}});editor.value.commands.focus();break}dialog.value='';revision.value++;autosave();nextTick(updateFlow)}
function generateIndex(){const terms=new Map();for(const t of indexTerms.value){if(!terms.has(t.term))terms.set(t.term,new Set());terms.get(t.term).add(t.page)}const lines=[...terms].sort((a,b)=>a[0].localeCompare(b[0],'ur')).map(([term,p])=>term+' … '+[...p].join(', '));if(!lines.length){message.value='Add index entries or use Auto Index first.';return}editor.value.chain().focus().insertContent(lines.map(text=>({type:'paragraph',content:[{type:'text',text}]}))).run()}
function generateTOC(){pages.value[pageIndex.value].content=editor.value.getJSON();const lines=[];pages.value.forEach((p,i)=>{for(const n of p.content.content||[])if(n.type==='heading')lines.push(jsonText(n)+' … '+(i+1))});if(!lines.length){message.value='Apply heading styles before generating a table of contents.';return}editor.value.chain().focus().insertContent(lines.map(text=>({type:'paragraph',content:[{type:'text',text}]}))).run()}

function getExportParagraphs(){if(editor.value)pages.value[pageIndex.value].content=editor.value.getJSON();const paragraphs=[];for(const p of pages.value){if(p.content?.content){for(const node of p.content.content){const text=jsonText(node).trim();if(!text)continue;paragraphs.push({text,align:node.attrs?.textAlign||(node.type==='heading'?'center':'justify'),isHeading:node.type==='heading',level:node.attrs?.level||(node.type==='heading'?1:undefined)})}}}if(!paragraphs.length){for(const o of objects.value){if(o.text?.trim()){paragraphs.push({text:o.text.trim(),align:o.align||'right',isHeading:false})}}}return paragraphs.length?paragraphs:pages.value.map(p=>jsonText(p.content)).join('\n\n')}
function getExportLayout(){return {width:settings.paperWidth||(settings.paper==='A4'?210:settings.paper==='Letter'?215.9:210),height:settings.paperHeight||(settings.paper==='A4'?297:settings.paper==='Letter'?279.4:297),marginLeft:settings.marginLeft??settings.margin??12.7,marginRight:settings.marginRight??settings.margin??12.7,marginTop:settings.marginTop??settings.margin??12.7,marginBottom:settings.marginBottom??settings.margin??12.7,columns:settings.columns||1,gap:settings.gap??4.233}}
async function exportNative(){try{const d=snapshot();let bytes=null;if(nativeSource.value?.key){try{bytes=await loadNative(nativeSource.value.key)}catch{}}const unchanged=unchangedNative(d);let outputBytes=null;if(bytes&&unchanged&&nativeSource.value?.version===3){outputBytes=bytes;message.value='Exported original native InPage v3 bytes.'}else if(bytes&&d.nativeSource?.textRange&&nativeSource.value?.version===3){try{outputBytes=writeNativeText(d,bytes);message.value='Exported same-length Unicode text edits into the original native layout.'}catch{}}if(!outputBytes){const exportContent=getExportParagraphs(),layout=getExportLayout();outputBytes=createV3InPageFile(exportContent,layout);message.value='Exported document as InPage v3 Unicode (.inp) file.'}const filename=(title.value||'Untitled').replace(/\.inp$/i,'')+'.inp';download(outputBytes,filename,'application/octet-stream')}catch(e){fail(e.message)}}
async function downloadOlderInPage(){try{const d=snapshot();let bytes=null;if(nativeSource.value?.key){try{bytes=await loadNative(nativeSource.value.key)}catch{}}const unchanged=unchangedNative(d);let outputBytes=null;if(bytes&&unchanged&&nativeSource.value?.isOlderVersion){outputBytes=bytes;message.value='Exported original older InPage bytes.'}if(!outputBytes){const exportContent=getExportParagraphs(),layout=getExportLayout();outputBytes=createOlderInPageFile(exportContent,layout);message.value='Exported document for older InPage (v1/v2) format.'}const filename=(title.value||'Untitled').replace(/\.inp$/i,'')+'.inp';download(outputBytes,filename,'application/octet-stream')}catch(e){fail(e.message)}}
async function exportDocument(kind,scope='all',options={}){if(exporting.value)return;const {capturePaper,makePDF,makeEPS}=await import('./pageExport');exporting.value=true;const original=pageIndex.value,selection=[...selected.value];try{updateFlow();if(Object.values(flow.value).some(f=>f.overflow))throw Error('Text overflows a frame. Resize it or link another frame before exporting.');selected.value=[];const canvases=[];const indices=kind==='eps'||scope==='current'||scope==='selected'?[original]:scope==='range'?pages.value.map((_,i)=>i).filter(i=>i>=options.from-1&&i<=options.to-1):pages.value.map((_,i)=>i);for(const i of indices){changePage(i);selected.value=[];message.value='Rendering page '+(i+1)+' of '+pages.value.length;await nextTick();updateFlow();await nextTick();canvases.push(await capturePaper(paperEl.value,pageWidth.value,pageHeight.value,{selectedIds:scope==='selected'?selection:null,mirror:options.mirror}))}if(kind==='pdf')download(makePDF(canvases,pageWidth.value,pageHeight.value,title.value),options.filename||title.value+'.pdf','application/pdf');else download(makeEPS(canvases[0],pageWidth.value,pageHeight.value),title.value+'-page-'+(original+1)+'.eps','application/postscript');message.value=kind==='pdf'?'Exported '+canvases.length+' page(s) as PDF (raster pages).':'Exported this page as EPS (raster RGB).'}catch(e){fail(e.message)}finally{changePage(original);selected.value=selection;exporting.value=false}}
function frameStory(o){const segment=flow.value[o.id],root=rootFrame(objects.value,o.id);return storySegments(segment?.text||'',segment?.offset||0,root?.runs||[])}

async function exportPage(){const styles=Array.from(document.querySelectorAll('style')).map(s=>s.textContent).join('\n');download('<!doctype html><html lang="ur"><meta charset="utf-8"><title>'+escapeHTML(title.value)+'</title><style>'+styles+'\n.paper{zoom:1!important;margin:0!important}.resize-handle,.ruler-guide,.margin-guide{display:none!important}</style><body>'+paperEl.value.outerHTML+'</body></html>',title.value+'-page-'+(pageIndex.value+1)+'.html','text/html;charset=utf-8');message.value='Exported current page as HTML; web font needs the local server.'}
async function confirmFileExport(){const kind=dialog.value;const from=Number(forms.exportFrom),to=Number(forms.exportTo);if(kind==='pdf'){if(!forms.pdfFilename?.trim()){forms.pdfError='Enter a filename.';return}if(forms.exportScope==='range'&&(!Number.isInteger(from)||!Number.isInteger(to)||from<1||to<from||to>pages.value.length)){forms.pdfError='Enter a valid page range from 1 to '+pages.value.length+'.';return}if(forms.exportScope==='selected'&&!selected.value.length){forms.pdfError='Select objects before exporting.';return}}dialog.value='';if(kind==='pdf'||kind==='eps')await exportDocument(kind,forms.exportScope,{from,to,mirror:forms.pdfMirror,filename:forms.pdfFilename?.replace(/\.pdf$/i,'')+'.pdf'});else if(kind==='native')await exportNative();else if(kind==='exportPage')await exportPage();else if(kind==='text'){pages.value[pageIndex.value].content=editor.value.getJSON();download(pages.value.map(p=>jsonText(p.content)).join('\n\f\n')+'\n'+objects.value.filter(o=>o.text).map(o=>o.text).join('\n'),title.value+'.txt','text/plain;charset=utf-8')}}
function printDoc(){const s=document.createElement('style');s.textContent='@media print{@page{size:'+settings.paper+';margin:0}}';document.head.appendChild(s);window.addEventListener('afterprint',()=>s.remove(),{once:true});window.print();message.value='Prints the displayed page. Navigate to other pages to print them.'}
function shortcut(e){
const key=e.key,lowerKey=key?.toLowerCase(),ctrl=e.ctrlKey||e.metaKey,alt=e.altKey,shift=e.shiftKey;
if(key==='Escape'){
if(drag?.kind==='rulerGuide'){cancelDrag();e.preventDefault();return}
if(dialog.value){dialog.value='';e.preventDefault();return}
if(menu.value){menu.value='';e.preventDefault();return}
if(selected.value.length){selected.value=[];e.preventDefault();return}
if(tool.value!=='edit'){chooseTool('edit');e.preventDefault();return}
if(document.activeElement&&document.activeElement!==document.body){document.activeElement.blur();e.preventDefault();return}
}
if(dialog.value){
if(key==='Enter'&&!e.target.matches('textarea')){
if(['saveAs','duplicate','page','insertPage','deletePage','pageNumber','footnote','find'].includes(dialog.value)){e.preventDefault();applyDialog();return}
}
return
}
if(key==='F12'||(alt&&lowerKey==='r'&&!ctrl)){
e.preventDefault();
if(ctrl)openDialog('documents');
else if(alt)openDialog('page');
else action('ribbon');
return;
}
if((alt&&key==='Enter')||(ctrl&&lowerKey==='m'&&!alt&&!shift)){
e.preventDefault();toggleMasterPage();return;
}
if(ctrl&&key==='3'){
if(isMasterPage.value||e.target.closest('[data-frame-editor]')){
e.preventDefault();if(isMasterPage.value){insertPlain('#');message.value='Page number marker (#) inserted'}else{insertPlain(formattedDocPageNumber())}return;
}
}
if((ctrl||alt)&&key==='F6'||(ctrl&&alt&&lowerKey==='tab')){
e.preventDefault();action('nextDocument');return;
}
if(((ctrl||alt)&&key==='F4')||(ctrl&&alt&&lowerKey==='w')||(ctrl&&lowerKey==='q')){
e.preventDefault();openDialog('close');return;
}
if((alt&&(key==='Insert'||key==='Ins'))||(alt&&lowerKey==='p'&&!ctrl)||(ctrl&&alt&&lowerKey==='p')){
e.preventDefault();openDialog('insertPage');return;
}
if(alt&&(key==='Delete'||key==='Del'||key==='Backspace')){
e.preventDefault();openDialog('deletePage');return;
}
if(ctrl&&(key===' '||key==='Spacebar')){
e.preventDefault();setFormat('language',format.language==='English'?'Urdu':'English');return;
}
if(ctrl&&lowerKey==='s'){
e.preventDefault();if(alt||shift)openDialog('saveAs');else save();return;
}
if(ctrl&&lowerKey==='p'&&!alt){
e.preventDefault();openDialog('print');return;
}
if(ctrl&&lowerKey==='f'&&!alt){
e.preventDefault();openDialog('find');return;
}
const isInput=e.target.matches('input,textarea,select');
if((ctrl&&lowerKey==='n'&&!alt)||(alt&&lowerKey==='n'&&!isInput)){
e.preventDefault();action('new');return;
}
if(ctrl&&lowerKey==='o'&&!alt){
e.preventDefault();action('open');return;
}
if(ctrl&&alt&&lowerKey==='o'){
e.preventDefault();action('toc');return;
}
if(ctrl&&shift&&!alt){
const match=customStyles.value.find(s=>s.keyEquivalent&&s.keyEquivalent.toLowerCase()===lowerKey);
if(match){e.preventDefault();applyCustomStyle(match);message.value='Applied style sheet: '+match.name;return;}
}
if((ctrl&&lowerKey==='t'&&!alt)||(ctrl&&shift&&lowerKey==='t')||(alt&&lowerKey==='t'&&!isInput)){
e.preventDefault();action('styles');return;
}
if(ctrl&&alt&&lowerKey==='t'){
e.preventDefault();action('tabs');return;
}
if(ctrl&&alt&&lowerKey==='i'){
e.preventDefault();openDialog('indexEntry');return;
}
if(ctrl&&alt&&lowerKey==='g'){
e.preventDefault();action('group');return;
}
if(ctrl&&alt&&lowerKey==='u'){
e.preventDefault();action('ungroup');return;
}
if(ctrl&&lowerKey==='g'&&!alt){
e.preventDefault();action('paragraph');return;
}
if(ctrl&&lowerKey==='h'&&!alt){
e.preventDefault();action('character');return;
}
if(ctrl&&lowerKey==='u'&&!alt){
e.preventDefault();action('lock');return;
}
if(ctrl&&lowerKey==='y'&&!alt&&!shift){
e.preventDefault();action('import');return;
}
if(ctrl&&alt&&lowerKey==='y'){
e.preventDefault();openDialog('text');return;
}
if(ctrl&&lowerKey==='l'&&!alt){
e.preventDefault();action('spelling');return;
}
if(ctrl&&(key==='.'||key==='>')){
e.preventDefault();action('symbols');return;
}
if(ctrl&&lowerKey==='d'&&!alt){
e.preventDefault();action('duplicate');return;
}
if(ctrl&&['1','2','3','4','5'].includes(key)){
e.preventDefault();chooseTool(['select','edit','rotate','link','unlink'][Number(key)-1]);return;
}
const fKeys={F1:'help',F2:'story',F5:'fit',F6:'zoom50',F7:'zoom100',F8:'zoom200',F9:'snap'};
if(!ctrl&&!alt&&fKeys[key]){
e.preventDefault();action(fKeys[key]);return;
}
if(ctrl&&(key==='0'||key==='NumPad0')){
e.preventDefault();action('fit');return;
}
if(ctrl&&lowerKey==='z'){
if(isInput||e.target.closest('[data-frame-editor]')){
return;
}
e.preventDefault();
if(shift)performRedo();
else performUndo();
return;
}
if(ctrl&&lowerKey==='a'){
if(isInput)return;
e.preventDefault();
let frame=e.target.closest?.('[data-frame-editor]')||document.activeElement?.closest?.('[data-frame-editor]');
if(!frame&&selected.value.length===1){
const selObj=objects.value.find(o=>o.id===selected.value[0]);
if(selObj&&['text','title'].includes(selObj.type)){
frame=paperEl.value?.querySelector?.('[data-object-id="'+selObj.id+'"] [data-frame-editor]')
}
}
if(frame&&selectFrameText(frame)){
return;
}
if(e.target.closest?.('.tiptap')||(tool.value==='edit'&&editor.value?.isFocused)){
editor.value?.chain().focus().selectAll().run();
return;
}
chooseTool('select');
selected.value=pageObjects.value.map(o=>o.id);
return;
}
if(selected.value.length&&!isInput){
if(ctrl&&lowerKey==='c'){e.preventDefault();action('copy');return;}
if(ctrl&&lowerKey==='x'){e.preventDefault();action('cut');return;}
if(ctrl&&lowerKey==='v'){e.preventDefault();action('paste');return;}
if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)){
e.preventDefault();checkpoint();
const stepMm=ctrl?(Number(preferences.app.arrowWithControl)||0.1):(Number(preferences.app.arrowMovement)||1);
const stepPx=stepMm*96/25.4;
const dx=key==='ArrowLeft'?-stepPx:key==='ArrowRight'?stepPx:0;
const dy=key==='ArrowUp'?-stepPx:key==='ArrowDown'?stepPx:0;
for(const id of selected.value){const o=objects.value.find(o=>o.id===id);if(o&&!o.locked){o.x=Math.max(0,o.x+dx);o.y=Math.max(0,o.y+dy)}}
scheduleSave();nextTick(updateFlow);return;
}
}
if((key==='Delete'||key==='Del'||(key==='Backspace'&&!isInput&&!e.target.closest('[data-frame-editor]'))&&selected.value.length)){
e.preventDefault();removeObjects();return;
}
}
function installReady(e){e.preventDefault();installEvent.value=e}async function install(){await installEvent.value?.prompt();installEvent.value=null}
function beforeUnload(e){if(dirty.value){autosave();if(dirty.value){e.preventDefault();e.returnValue=''}}}
onMounted(async()=>{try{const stored=await loadWorkspace();if(stored){documents.value=stored.documents||[];activeDocument.value=stored.active;apply(parseDocument(JSON.stringify(stored.draft)))}const raw=stored?null:localStorage.getItem('inpage-net-draft');if(raw)apply(parseDocument(raw));if(!stored){const tabs=JSON.parse(localStorage.getItem('inpage-net-tabs')||'[]');documents.value=Array.isArray(tabs)?tabs:[];}let current=documents.value.find(d=>d.id===activeDocument.value)||documents.value.find(d=>d.title===title.value);if(!current){current={id:activeDocument.value,title:title.value,data:snapshot()};documents.value.push(current)}activeDocument.value=current.id}catch{message.value='Stored draft could not be restored';documents.value=[{id:activeDocument.value,title:title.value,data:snapshot()}]}window.addEventListener('keydown',shortcut);window.addEventListener('beforeunload',beforeUnload);window.addEventListener('beforeinstallprompt',installReady);window.addEventListener('pointermove',pointerMove);window.addEventListener('pointerup',pointerUp);window.addEventListener('pointercancel',cancelDrag);document.addEventListener('pointerover',handlePointerOver);document.addEventListener('pointerout',handlePointerOut);document.fonts.ready.then(updateFlow);nextTick(updateFlow)})
onBeforeUnmount(()=>{clearTimeout(timer);window.removeEventListener('keydown',shortcut);window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('beforeinstallprompt',installReady);window.removeEventListener('pointermove',pointerMove);window.removeEventListener('pointerup',pointerUp);window.removeEventListener('pointercancel',cancelDrag);document.removeEventListener('pointerover',handlePointerOver);document.removeEventListener('pointerout',handlePointerOut);measure?.remove();editor.value?.destroy()})
</script>
<template>
<div class="app" @click="menu='';openSubmenu=''">
<KhusrauPreloader v-model="showPreloader" :mode="splashMode" />
<div v-if="workspaceClosed" class="closed-workspace"><h1>Khusrau 5.0</h1><p>Urdu Publishing Suite • Developed by Tariq Abdullah</p><button @click="workspaceClosed=false">Reopen workspace</button></div>
<nav aria-label="Application menu"><img src="/icon.svg" alt=""/><div v-for="(items,label) in menus" :key="label" class="menu"><button :class="{open:menu===label}" @click.stop="menu=menu===label?'':label;openSubmenu=''">{{label}}</button><div v-if="menu===label" class="dropdown" role="menu"><template v-for="(item,i) in items" :key="i"><hr v-if="!item"/><div v-else-if="item[3]" class="menu-item-with-submenu" @mouseenter="openSubmenu=item[1]" @mouseleave="openSubmenu=''"><button role="menuitem" class="has-submenu" :disabled="disabled(item[1])" @click.stop="openSubmenu=openSubmenu===item[1]?'':item[1]"><span class="check">{{checked(item[1])?'✓':''}}</span><span>{{item[0]}}</span><span class="submenu-arrow">▶</span></button><div v-if="openSubmenu===item[1]" class="submenu-flyout" role="menu"><button v-for="sub in item[3]" :key="sub[1]" role="menuitem" :disabled="disabled(sub[1])" @mousedown.prevent @click="action(sub[1])"><span class="check">{{checked(sub[1])?'✓':''}}</span><span>{{sub[0]}}</span><small>{{sub[2]||''}}</small></button></div></div><button v-else role="menuitem" :disabled="disabled(item[1])" @mousedown.prevent @click="action(item[1])"><span class="check">{{checked(item[1])?'✓':''}}</span><span>{{item[0].startsWith('Hide ')?(settings[{ribbon:'ribbon',tools:'tools',rulers:'rulers',guides:'guides'}[item[1]]]?'Hide ':'Show ')+item[0].slice(5):item[0]}}</span><small>{{item[2]}}</small></button></template></div></div><span class="app-title" @click="action('about')" title="About Khusrau 5.0" style="cursor:pointer">Khusrau 5.0 — [{{title}}]</span><button v-if="installEvent" @click="install">Install</button></nav>
<ObjectRibbon v-if="settings.ribbon&&objectContext" :object="contextObject" :type="contextType" :colors="colors" :content="pictureEditing" @change="setObjectProperty" @action="objectAction"/><Ribbon v-else-if="settings.ribbon" :document-fonts="documentFonts" :styles="customStyles" :format="format" :editor="editor" :colors="colors" @format="setFormat" @align="align" @direction="setDirection" @character="character"/>
<div v-if="importReport" class="import-report" role="note"><div class="import-report-text">{{importReport.warning}} <span>{{importReport.characters}} source characters.</span></div><button type="button" class="import-report-dismiss" title="Dismiss message" aria-label="Dismiss message" @click="importReport = null">×</button></div>
<main><aside v-if="settings.tools" aria-label="Tool strip" @mouseleave="hideToolTooltip"><button v-for="[id,label,icon] in tools" :key="id" :aria-label="label" :data-tooltip="label" :data-tool-id="id" :data-shortcut="toolShortcuts[id]" :class="{active:tool===id}" @mouseenter="showToolTooltip($event,label,id)" @mouseleave="hideToolTooltip" @click="chooseTool(id);hideToolTooltip()"><Icon :name="icon"/></button></aside>
<Teleport to="body">
  <div v-if="toolTooltip.visible" class="tool-strip-tooltip" :class="'pos-'+(toolTooltip.pos||'right')" :style="{top:toolTooltip.top+'px',left:toolTooltip.left+'px'}" role="tooltip">
    <span class="tooltip-arrow"></span>
    <span class="tooltip-text">{{toolTooltip.label}}</span>
    <kbd v-if="toolTooltip.shortcut" class="tooltip-shortcut">{{toolTooltip.shortcut}}</kbd>
  </div>
</Teleport>
<div class="workarea">
<div v-if="tabsMode" class="tabs-ribbon ribbon" role="region" aria-label="Tabs ribbon"><label data-tooltip="Default tab stop spacing">Default stop (spaces)<input type="number" min="1" max="16" v-model.number="settings.tabSize" @change="scheduleSave"/></label><button data-tooltip="Done editing tabs" @click="tabsMode=false">Done</button><span>Tab inserts a tab character. Explicit aligned tab stops remain unsupported.</span></div>
<div v-if="settings.rulers" class="horizontal-ruler" aria-label="Horizontal ruler" title="Drag onto the page to add a horizontal guide" @pointerdown="rulerDown($event,'horizontal')"><span v-for="n in 50" :style="{left:((n-1)*75.59 + (Number(preferences.doc.rulerOriginAcross)||0)*3.7795)*zoom/100+'px'}">{{340-(n-1)*20}}</span></div>
<div class="canvas-row"><div v-if="settings.rulers" class="vertical-ruler" aria-label="Vertical ruler" title="Drag onto the page to add a vertical guide" @pointerdown="rulerDown($event,'vertical')"><span v-for="n in 50" :style="{top:((n-1)*75.59 + (Number(preferences.doc.rulerOriginDown)||0)*3.7795)*zoom/100+'px'}">{{(n-1)*20}}</span></div>
<div ref="scroller" class="scroll" :class="{drawing:!['edit','select'].includes(tool)}"><div class="page-spread" :class="{facing:settings.facing}" :style="{paddingLeft:(preferences.doc.pasteboardAcross||15)+'%',paddingRight:(preferences.doc.pasteboardAcross||15)+'%',paddingBottom:(preferences.doc.pasteboardDown||25)+'mm'}">
<div ref="paperEl" class="paper" :class="{guides:settings.guides,invisibles:settings.invisibles,'master-mode':isMasterPage}" :style="{width:pageWidth+'mm',minHeight:pageHeight+'mm',paddingTop:(settings.marginTop??settings.margin)+'mm',paddingBottom:(settings.marginBottom??settings.margin)+'mm',paddingLeft:(settings.marginLeft??settings.margin)+'mm',paddingRight:(settings.marginRight??settings.margin)+'mm',zoom:zoom/100}" @pointerdown="pointerDown" @contextmenu="onCanvasContextMenu">
<div v-if="isMasterPage" class="master-page-banner" aria-label="Master Page indicator"><span class="master-badge">M</span><span>Master Page {{ settings.facing ? (masterSide === 'left' ? '— Left (Even Pages)' : '— Right (Odd Pages)') : '— All Pages' }}</span><span class="master-hint">(Objects placed here repeat across pages. Use # in a Title Text Box for page numbers)</span></div>
<div v-if="isMasterPage" class="master-default-grid" :class="{selected:selected.includes('default-grid')}" :style="{left:defaultGridObject.x+'px',top:defaultGridObject.y+'px',width:defaultGridObject.w+'px',height:defaultGridObject.h+'px',zIndex:60,backgroundColor:defaultGridObject.fill!=='none'?defaultGridObject.fill:undefined,border:defaultGridObject.strokeWidth?defaultGridObject.strokeWidth+'pt solid '+defaultGridObject.stroke:undefined}" @pointerdown.stop="selectDefaultGrid($event)" @dblclick.stop="openDialog('object')">
  <div v-if="columnGuides.length" class="column-guides">
    <div v-for="g in columnGuides" :key="g.index" class="column-divider" :style="{left:g.left+'px',width:g.width+'px'}">
      <div class="col-line left" :style="{background:preferences.app.columnGuidesColor}"></div>
      <div class="col-line right" :style="{background:preferences.app.columnGuidesColor}"></div>
    </div>
  </div>
  <template v-if="selected.includes('default-grid')&&!settings.lockGuides">
    <button v-for="h in ['nw','n','ne','w','e','sw','s','se']" :key="h" class="resize-handle" :class="'handle-'+h" :aria-label="'Resize '+h" @pointerdown.stop="resizeDown($event,defaultGridObject,h)"></button>
  </template>
</div>
<div class="text-boundary" :class="{'multi-column':(settings.columns||1)>1}" :style="{height:(settings.columns||1)>1?defaultGridObject.h+'px':undefined,minHeight:defaultGridObject.h+'px',border:settings.borderWidth?settings.borderWidth+'pt solid '+settings.borderColor:undefined,backgroundColor:settings.fill!=='none'?settings.fill:undefined}" @pointerdown="tool==='edit'&&nextTick(()=>editor?.commands.focus())">
<EditorContent v-if="editor&&settings.autoTextBox!==false&&!isMasterPage" :editor="editor" :dir="format.direction" :style="{height:(settings.columns||1)>1?'100%':undefined,fontFamily:baseStyle.font,fontSize:baseStyle.size+'pt',color:baseStyle.color,'--editor-columns':settings.columns||1,'--editor-gap':(settings.gap||4.233)+'mm',tabSize:settings.tabSize,whiteSpace:settings.wrap?'pre-wrap':'pre',hyphens:settings.hyphenation?'auto':'none'}"/>
</div>
<svg class="link-layer" v-if="['link','unlink'].includes(tool)" width="100%" height="100%"><template v-for="o in pageObjects.filter(o=>o.next)"><line v-if="objects.find(a=>a.id===o.next)" :x1="o.x+o.w" :y1="o.y+o.h" :x2="objects.find(a=>a.id===o.next).x" :y2="objects.find(a=>a.id===o.next).y" stroke="#1468bb" stroke-width="1.5" stroke-dasharray="4 3"/></template></svg>
<div v-for="(o,index) in pageObjects" :key="o.id" class="canvas-object" :class="{selected:selected.includes(o.id),locked:o.locked,textframe:['text','title'].includes(o.type),pictureframe:o.type.includes('picture'),nonprinting:o.dontPrint,'master-object':o.master,'master-background':o.master&&!isMasterPage}" :data-object-id="o.id" :data-object-type="o.type" :style="{left:o.x+'px',top:o.y+'px',width:o.w+'px',height:o.h+'px',transform:'rotate('+o.rotation+'deg)',zIndex:index+2}" @pointerdown.stop="objectDown($event,o)" @dblclick.stop="o.type.includes('picture')?pickPicture(o):['text','title'].includes(o.type)?objectAction('editText'):tool==='select'?openDialog('object'):null">
<svg class="object-shape" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none"><defs><marker :id="'arrow-'+o.id" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" :fill="o.stroke"/></marker></defs><ellipse v-if="o.type==='ellipse'||o.type==='ellipse-picture'" cx="50" cy="50" rx="49" ry="49" :fill="o.fill" :stroke="o.stroke" :stroke-width="o.strokeWidth*1.333333" :stroke-dasharray="o.strokeStyle==='dash'?'8 4':o.strokeStyle==='dot'?'1 3':undefined" vector-effect="non-scaling-stroke"/><line v-else-if="o.type==='line'" x1="1" y1="1" x2="99" y2="99" :marker-start="o.startArrow==='arrow'?'url(#arrow-'+o.id+')':undefined" :marker-end="o.endArrow==='arrow'?'url(#arrow-'+o.id+')':undefined" :stroke="o.stroke" :stroke-width="o.strokeWidth*1.333333" :stroke-dasharray="o.strokeStyle==='dash'?'8 4':o.strokeStyle==='dot'?'1 3':undefined" vector-effect="non-scaling-stroke"/><polygon v-else-if="o.type==='polygon'" points="1,1 99,1 1,99 99,99" :fill="o.fill" :stroke="o.stroke" :stroke-width="o.strokeWidth*1.333333" :stroke-dasharray="o.strokeStyle==='dash'?'8 4':o.strokeStyle==='dot'?'1 3':undefined" vector-effect="non-scaling-stroke"/><rect v-else x=".5" y=".5" width="99" height="99" :rx="o.type.includes('round')?Math.min(49,(o.radius??24)/o.w*100):0" :fill="o.fill" :stroke="o.stroke" :stroke-width="o.strokeWidth*1.333333" :stroke-dasharray="o.strokeStyle==='dash'?'8 4':o.strokeStyle==='dot'?'1 3':undefined" vector-effect="non-scaling-stroke"/><path v-if="o.type.includes('picture')&&!o.src" :d="o.type==='ellipse-picture'?'M15 15L85 85M85 15L15 85':'M0 0L100 100M100 0L0 100'" :stroke="o.stroke" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>
<div v-if="o.pattern&&o.pattern!=='none'" class="object-pattern" :style="patternStyle(o)"></div><div v-if="o.src" class="picture-clip" :style="pictureClip(o)"><div v-if="preferences.app.greekPictures" class="object-pattern" :style="patternStyle(o)"></div><img v-else class="placed-picture" :src="o.src" alt="Placed picture" draggable="false" :style="pictureStyle(o)"/></div>
<div v-if="['text','title'].includes(o.type)&&(o.columns||1)>1&&settings.guides" class="column-guides" :style="{left:(o.inset??5)+'px',top:(o.inset??5)+'px',width:Math.max(10,o.w-2*(o.inset??5))+'px',bottom:(o.inset??5)+'px'}">
  <div v-for="g in objectColumnGuides(o)" :key="g.index" class="column-divider" :style="{left:g.left+'px',width:g.width+'px'}">
    <div class="col-line left" :style="{background:preferences.app.columnGuidesColor}"></div>
    <div class="col-line right" :style="{background:preferences.app.columnGuidesColor}"></div>
  </div>
</div>
<div v-if="['text','title'].includes(o.type)" data-frame-editor tabindex="-1" :contenteditable="tool==='edit'&&!o.locked&&(!o.master||isMasterPage)" :aria-label="o.type==='title'?'Title frame text':'Text frame text'" :class="['frame-text',{'greeked-text':(o.fontSize||baseStyle.size)<preferences.app.greekTextBelow}]" :dir="o.direction||format.direction" :style="{padding:o.inset+'px',fontFamily:o.font||baseStyle.font,fontSize:(o.fontSize||baseStyle.size)+'pt',columnCount:o.columns||1,columnGap:(o.columnGap??((settings.gap??4.233)*MM_TO_PX))+'px',columnFill:'auto',orphans:1,widows:1,color:o.color||'#000000',fontWeight:o.bold?'bold':'normal',fontStyle:o.italic?'italic':'normal',lineHeight:o.leading&&o.leading!=='Auto'?o.leading+'pt':(1+(Number(preferences.typo.autoLineSpacing)||50)/100).toFixed(2),fontKerning:preferences.typo.autoKerning?'normal':'none',textUnderlineOffset:(preferences.typo.underlinesShift/10)+'px',textDecorationThickness:Math.max(1,preferences.typo.underlinesWidth/10)+'px',letterSpacing:(o.tracking||0)/100+'em',textAlign:o.align||(format.direction==='rtl'?'right':'left'),textIndent:(o.indent||0)+'mm',paddingInlineStart:((o.inset||0)+(o.beginIndent||0)*96/25.4)+'px',paddingInlineEnd:((o.inset||0)+(o.endIndent||0)*96/25.4)+'px',width:10000/(o.scale||100)+'%',transform:'translateY('+(-(o.baseline||0))+'pt) scaleX('+((o.scale||100)/100)+')',transformOrigin:'top left',textDecorationLine:o.decoration==='Overline'?'overline':['Single','Double'].includes(o.decoration)?'underline':'none',textDecorationStyle:o.decoration==='Double'?'double':'solid',WebkitTextStroke:o.outline?'.5px currentColor':undefined,WebkitTextFillColor:o.outline?'transparent':undefined}" @blur="frameInput($event,o)" @keydown="frameKey($event)"><span v-for="(p,i) in frameExclusions(o)" :key="i" class="runaround-float" contenteditable="false" aria-hidden="true" :style="floatStyle(p)"></span><template v-if="o.richParagraphs"><div v-for="(p,i) in frameStory(o)" :key="i" class="story-paragraph" :style="{color:p.color||o.color||'#000000',marginTop:(o.spaceBefore||0)+'pt',marginBottom:(o.spaceAfter||0)+'pt'}">{{displayStoryParagraph(p.text,o)}}</div></template><span v-else>{{displayFrameText(o)}}</span></div>
<span v-if="flow[o.id]?.overflow" class="overflow-indicator" title="Text overflows this frame; link another frame or resize">+</span><span v-if="o.locked" class="lock-indicator">▣</span><template v-if="selected.includes(o.id)&&!o.locked"><button v-for="h in ['nw','n','ne','w','e','sw','s','se']" :key="h" class="resize-handle" :class="'handle-'+h" :aria-label="'Resize '+h" @pointerdown.stop="resizeDown($event,o,h)"></button></template>
</div>
<div v-if="previewRect" class="draw-preview" :style="{left:previewRect.x+'px',top:previewRect.y+'px',width:previewRect.w+'px',height:previewRect.h+'px'}"></div>
<template v-if="settings.guides">
<div v-for="g in pageGuides" :key="g.id" class="ruler-guide" :class="[g.axis,{locked:settings.lockGuides}]" :data-guide-id="g.id" :aria-label="g.axis+' guide'" :title="settings.lockGuides?'Guides locked':'Drag to move; drag off the page to remove'" :style="{[g.axis==='horizontal'?'top':'left']:(guidePreview?.id===g.id?guidePreview.position:g.position)+'px',visibility:guidePreview?.id===g.id?'hidden':undefined,borderColor:preferences.app.userGuidesColor,backgroundColor:preferences.app.userGuidesColor,zIndex:preferences.doc.guidesPosition==='Behind'?1:50}" @pointerdown.stop="rulerDown($event,g.axis,g)"></div>
<div v-if="guidePreview" class="ruler-guide preview" :class="guidePreview.axis" :style="{[guidePreview.axis==='horizontal'?'top':'left']:guidePreview.position+'px'}"></div>
</template>
<div v-if="settings.guides" class="margin-guide" :style="{top:(settings.marginTop??settings.margin)+'mm',bottom:(settings.marginBottom??settings.margin)+'mm',left:(settings.marginLeft??settings.margin)+'mm',right:(settings.marginRight??settings.margin)+'mm',borderColor:preferences.app.marginGuidesColor,color:preferences.app.marginGuidesColor,zIndex:preferences.doc.guidesPosition==='Behind'?1:(isMasterPage?20:50)}"><div v-for="side in ['left','right','top','bottom']" class="guide-grip" :class="[side,{locked:settings.lockGuides}]" :title="settings.lockGuides?'Guides locked':'Drag margin guide'" @pointerdown.stop="guideDown($event,side)"></div><div v-if="columnGuides.length&&!isMasterPage" class="column-guides"><div v-for="g in columnGuides" :key="g.index" class="column-divider" :style="{left:g.left+'px',width:g.width+'px'}"><div class="col-line left" :style="{background:preferences.app.columnGuidesColor}"></div><div class="col-line right" :style="{background:preferences.app.columnGuidesColor}"></div></div></div></div>
<div v-if="settings.indexEntries" class="index-panel"><span v-for="t in indexTerms.filter(t=>t.page===pageIndex+1)">{{t.term}}</span></div>
<div class="footnotes" :dir="format.direction"><p v-for="n in footnotes.filter(n=>n.page===pages[pageIndex].id)">{{n.number}}. {{n.text}}</p></div>
</div>
<div v-if="settings.facing&&pages.length>1&&!isMasterPage" class="facing-preview" :style="{width:pageWidth+'mm',minHeight:pageHeight+'mm',padding:settings.margin+'mm',zoom:zoom/100}" @click="changePage((pageIndex+1)%pages.length)"><small>Page {{(pageIndex+1)%pages.length+1}} — click to edit</small><div :dir="format.direction" :style="{fontFamily:format.font,fontSize:format.size+'pt',whiteSpace:'pre-wrap'}">{{jsonText(pages[(pageIndex+1)%pages.length].content)}}</div></div>
</div></div></div></div></main>
<div v-if="documents.length>1" class="document-tabs"><button v-for="d in documents" :class="{active:d.id===activeDocument}" @click="switchDocument(d.id)">{{d.title}}</button></div>
<div class="pagebar"><button class="master-toggle-btn" :class="{active:isMasterPage}" @click="toggleMasterPage" data-tooltip="Master page editor" data-shortcut="Alt+Enter">M</button><button aria-label="Previous page" data-tooltip="Previous page" data-shortcut="Page Up" :disabled="isMasterPage ? (!settings.facing || masterSide === 'left') : pageIndex === 0" @click="isMasterPage ? switchMasterSide('left') : changePage(pageIndex-1)">&lt;</button><span class="page-indicator" data-tooltip="Current page / Total pages">{{ isMasterPage ? (settings.facing ? (masterSide === 'left' ? 'L' : 'R') : 'M') : (pageIndex+1)+'/'+pages.length }}</span><button aria-label="Next page" data-tooltip="Next page" data-shortcut="Page Down" :disabled="isMasterPage ? (!settings.facing || masterSide === 'right') : pageIndex === pages.length-1" @click="isMasterPage ? switchMasterSide('right') : changePage(pageIndex+1)">&gt;</button><input aria-label="Zoom" data-tooltip="Zoom percentage" :value="zoom+'%'" @change="zoom=Math.max(25,Math.min(300,parseFloat($event.target.value)||100))"/><button data-tooltip="Fit in window" data-shortcut="Ctrl+F5" @click="fit">◀</button></div>
<footer><span role="status">{{message}}</span><span class="status">{{wordCount}} words · {{selected.length?selected.length+' selected · ':''}}{{format.language}} · {{dirty?'Unsaved':'Local draft'}}</span></footer>
<input hidden ref="file" type="file" accept=".ipdoc,.txt,.inp" @change="open"/><input hidden ref="imageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" @change="readPicture"/>
<NewDocumentDialog v-if="dialog==='new'" @create="createNewDocument" @close="dialog=''" @help="openDialog('help')"/>
<StyleSheetDialog v-else-if="dialog==='styles'" :styles="customStyles" :colors="colors" :active-style-name="format.style" @apply="applyCustomStyle" @update:styles="customStyles=$event;scheduleSave()" @close="dialog=''" @help="openDialog('help')"/>
<PreferencesDialog v-else-if="['prefApp','prefDoc','prefTypo','prefStory','prefSpelling','preferences'].includes(dialog)" :kind="prefKind" :colors="colors" v-model="preferences" @save-default="saveDefaultPreferences" @close="dialog=''" @help="openDialog('help')"/>
<div v-else-if="dialog" class="overlay" @click.self="dialog=''"><section class="dialog" :class="{'pdf-dialog':dialog==='pdf'}" role="dialog" aria-modal="true" :aria-label="titles[dialog]||dialog"><h2>{{titles[dialog]||dialog}}</h2><div class="dialog-body">
<template v-if="['close','exit'].includes(dialog)"><p>Close the current document? A recovery copy will be kept on this device.</p><button @click="save">Save current document</button><button @click="dialog==='exit'?exitWorkspace():closeDocument()">Close document</button></template>
<template v-else-if="dialog==='duplicate'"><label>Rows<input v-model="forms.duplicateRows" type="number" min="1" max="20"/></label><label>Columns<input v-model="forms.duplicateColumns" type="number" min="1" max="20"/></label><label>Row spacing (mm)<input v-model="forms.rowGap" type="number"/></label><label>Column spacing (mm)<input v-model="forms.columnGap" type="number"/></label><p>Rows and columns include the original selection.</p></template>
<template v-else-if="dialog==='pdf'"><div class="pdf-options"><label><input type="checkbox" v-model="forms.pdfMirror"/>Mirror</label><label title="Vector glyph outlines are not yet implemented"><input type="checkbox" disabled/>Export all Text as Curves</label></div><div class="pdf-range-actions"><fieldset><legend>Export Range</legend><label><input type="radio" v-model="forms.exportScope" value="selected" :disabled="!selected.length"/>Selected Objects</label><label><input type="radio" v-model="forms.exportScope" value="all"/>All Pages</label><div class="pdf-range"><label><input type="radio" v-model="forms.exportScope" value="range"/>Pages</label><label>From:<input type="number" aria-label="From page" v-model="forms.exportFrom" :disabled="forms.exportScope!=='range'"/></label><label>To:<input type="number" aria-label="To page" v-model="forms.exportTo" :disabled="forms.exportScope!=='range'"/></label></div></fieldset><div class="pdf-buttons"><button @click="confirmFileExport">OK</button><button @click="dialog=''">Cancel</button></div></div><label class="pdf-filename">Filename:<input aria-label="PDF filename" v-model="forms.pdfFilename"/></label><label title="Browsers cannot open a download folder"><input type="checkbox" disabled/>Show in Folder</label><p class="pdf-note">The browser saves the PDF to your download location. Use its Downloads list to show the file in its folder.</p><p class="pdf-note">Text-as-curves export is not implemented. This exporter currently produces raster PDF pages.</p><p v-if="forms.pdfError" role="alert">{{forms.pdfError}}</p></template>
<template v-else-if="['eps','native','text','exportPage'].includes(dialog)"><p>Document: {{title}}</p><p>File: {{title}}{{dialog==='pdf'?'.pdf':dialog==='eps'?'-page-'+(pageIndex+1)+'.eps':dialog==='native'?'.inp':dialog==='text'?'.txt':'-page-'+(pageIndex+1)+'.html'}}</p><label v-if="dialog==='pdf'">Pages<select v-model="forms.exportScope"><option value="all">All pages ({{pages.length}})</option><option value="current">Current page ({{pageIndex+1}})</option></select></label><p v-if="dialog==='pdf'">PDF pages preserve the displayed layout as raster images.</p><p v-else-if="dialog==='eps'">Exports the current page as a raster RGB EPS image.</p><p v-else-if="dialog==='native'">Exports document layout and text as native InPage v3 Unicode (.inp) format.</p><p v-else-if="dialog==='exportPage'">Exports the current page as HTML.</p><p v-else>Exports document text as UTF-8.</p><button @click="confirmFileExport">{{dialog==='pdf'?'Save PDF':'Export file'}}</button></template>
<template v-else-if="dialog==='print'"><p>Page {{pageIndex+1}} of {{pages.length}} · {{settings.paper}} · {{settings.orientation}}</p><button @click="dialog='';setTimeout(printDoc,100)">Print current page</button><button @click="dialog='';exportDocument('pdf')">Save all pages as PDF</button><p>Printer and copy settings are provided by the browser print dialog. For all pages, save the PDF and print it from your PDF viewer.</p></template>
<template v-else-if="dialog==='saveAs'"><label>Document name <input v-model="forms.newTitle" aria-label="Document name"/></label><p>Saved as an .ipdoc file. Native export preserves the original layout. Same-length Unicode text edits are experimental; new native layouts are not supported.</p></template>
<template v-else-if="dialog==='character'"><Ribbon :document-fonts="documentFonts" :styles="customStyles" :format="format" :editor="editor" :colors="colors" @format="setFormat" @align="align" @direction="setDirection" @character="character"/><p>Select text before applying character formatting. Changes apply immediately.</p></template>
<template v-else-if="dialog==='paragraph'"><div class="form-grid"><label>Alignment<select v-model="forms.paragraphAlign"><option v-for="a in ['left','center','right','justify']">{{a}}</option></select></label><label>Line height (pt or Auto)<input v-model="forms.paragraphLeading"/></label><label>Beginning indent (mm)<input v-model="forms.beginIndent" type="number"/></label><label>End indent (mm)<input v-model="forms.endIndent" type="number"/></label><label>First-line indent (mm)<input v-model="forms.indent" type="number"/></label><label>Space before (pt)<input v-model="forms.spaceBefore" type="number"/></label><label>Space after (pt)<input v-model="forms.spaceAfter" type="number"/></label></div></template>
<template v-else-if="dialog==='page'"><div class="form-grid"><label>Orientation<select v-model="forms.orientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label>Paper<select v-model="forms.paper"><option v-for="p in ['A4','Letter','Legal','A5','B4','B5']" :key="p">{{p}}</option></select></label><label>Left margin (mm)<input v-model="forms.marginLeft" type="number" min="0" max="100" :disabled="settings.lockGuides"/></label><label>Right margin (mm)<input v-model="forms.marginRight" type="number" min="0" max="100" :disabled="settings.lockGuides"/></label><label>Top margin (mm)<input v-model="forms.marginTop" type="number" min="0" max="100" :disabled="settings.lockGuides"/></label><label>Bottom margin (mm)<input v-model="forms.marginBottom" type="number" min="0" max="100" :disabled="settings.lockGuides"/></label><label>Columns<input v-model="forms.columns" type="number" min="1" max="12"/></label><label>Column gap (mm)<input v-model="forms.gap" type="number" min="0" max="50"/></label></div><p>Pages are managed manually using Insert → Page and the page navigator.</p></template>
<template v-else-if="dialog==='hyphenation'"><label><input v-model="forms.hyphenation" type="checkbox"/>Automatic browser hyphenation</label><p>Uses the browser's language dictionary. Urdu dictionary availability depends on the browser.</p></template>
<template v-else-if="dialog==='borders'"><label>Border width (pt)<input v-model="forms.borderWidth" type="number" min="0" max="20"/></label><label>Border color<input v-model="forms.borderColor" type="color"/></label></template>
<template v-else-if="dialog==='tabs'"><label>Tab width (spaces)<input v-model="forms.tabSize" type="number" min="1" max="16"/></label><p>Tab inserts a tab character in document text.</p></template>
<template v-else-if="dialog==='sort'"><label>Paragraph order<select v-model="forms.sortDirection"><option value="ascending">Ascending</option><option value="descending">Descending</option></select></label><p>Sorts ordinary paragraphs on this page using Urdu collation, preserving their formatting.</p></template>
<template v-else-if="dialog==='table'"><label>Rows<input v-model="forms.rows" type="number" min="1" max="30"/></label><label>Columns<input v-model="forms.cols" type="number" min="1" max="12"/></label><p>The first row is a header row.</p></template>
<template v-else-if="dialog==='tableFormat'"><label>Selected-cell background<select v-model="forms.fill"><option value="none">None</option><option v-for="c in colors" :value="c.value">{{c.name}}</option></select></label><button @mousedown.prevent @click="editor.chain().focus().toggleHeaderRow().run()">Toggle header row</button><button @mousedown.prevent @click="editor.chain().focus().toggleHeaderColumn().run()">Toggle header column</button></template>
<template v-else-if="dialog==='tableLayout'"><div class="button-grid"><button @mousedown.prevent @click="editor.chain().focus().addRowBefore().run()">Row before</button><button @mousedown.prevent @click="editor.chain().focus().addRowAfter().run()">Row after</button><button @mousedown.prevent @click="editor.chain().focus().addColumnBefore().run()">Column before</button><button @mousedown.prevent @click="editor.chain().focus().addColumnAfter().run()">Column after</button><button @mousedown.prevent @click="editor.chain().focus().deleteRow().run()">Delete row</button><button @mousedown.prevent @click="editor.chain().focus().deleteColumn().run()">Delete column</button><button @mousedown.prevent @click="editor.chain().focus().mergeCells().run()">Merge selected cells</button><button @mousedown.prevent @click="editor.chain().focus().splitCell().run()">Split cell</button><button @mousedown.prevent @click="splitTable()">Split table at current row</button></div></template>
<template v-else-if="dialog==='object'"><div class="form-grid"><label>Across (mm)<input v-model="forms.x" type="number"/></label><label>Down (mm)<input v-model="forms.y" type="number"/></label><label>Width (mm)<input v-model="forms.width" type="number" min="5"/></label><label>Height (mm)<input v-model="forms.height" type="number" min="5"/></label><label>Rotation (°)<input v-model="forms.rotation" type="number"/></label><label>Stroke width<input v-model="forms.strokeWidth" type="number" min="0"/></label><label>Fill<select v-model="forms.fill"><option value="none">None</option><option v-for="c in colors" :value="c.value">{{c.name}}</option></select></label><label>Stroke<input v-model="forms.stroke" type="color"/></label><label>Text size (pt)<input v-model="forms.fontSize" type="number" min="6" max="144"/></label><label>Text columns<input v-model="forms.objectColumns" type="number" min="1" max="6"/></label><label>Gutter (mm)<input v-model="forms.objectGap" type="number"/></label><label v-if="selectedObject?.type?.includes('round')">Border radius (mm)<input v-model="forms.radius" type="number" min="0"/></label><label>Direction<select v-model="forms.objectDirection"><option value="rtl">Right to left</option><option value="ltr">Left to right</option></select></label><label>Hatch<select v-model="forms.objectPattern"><option v-for="pattern in ['none','horizontal','vertical','diagonal','cross']">{{pattern}}</option></select></label><label><input v-model="forms.objectLocked" type="checkbox"/>Lock</label><label><input v-model="forms.dontPrint" type="checkbox"/>Don’t print</label></div></template>
<template v-else-if="dialog==='runaround'"><label>Text runaround<select v-model="forms.wrap"><option value="none">None</option><option value="box">Box runaround</option><option value="shape">Shape runaround</option><option value="top-bottom">Above and below</option><option value="left">Text on right</option><option value="right">Text on left</option></select></label><div class="form-grid"><label v-for="side in ['Left','Top','Right','Bottom']">{{side}} offset (mm)<input type="number" min="0" max="50" step=".01" v-model="forms['wrap'+side]" :aria-label="'Runaround '+side.toLowerCase()+' offset'"/></label></div><p>Text follows the available side of the object and resumes at full width below it. Shape runaround follows ellipse contours.</p></template>
<template v-else-if="dialog==='inset'"><label>Text inset (px)<input v-model="forms.inset" type="number" min="0"/></label></template>
<template v-else-if="dialog==='master'"><label><input v-model="forms.master" type="checkbox"/>Repeat selected objects on every page</label></template>
<template v-else-if="dialog==='guideSettings'"><label>Snap grid (px)<input v-model="forms.grid" type="number" min="1" max="100"/></label><label><input v-model="settings.snap" type="checkbox"/>Snap objects to grid</label><label><input v-model="settings.guides" type="checkbox"/>Show guides</label><label><input v-model="settings.lockGuides" type="checkbox"/>Lock guides</label><p>Drag from the top or side ruler to create a guide. Drag a guide off the page to remove it. Margin guides are set in Document → Margins.</p></template>
<template v-else-if="dialog==='colors'"><div class="color-list"><button v-for="c in colors" @mousedown.prevent @click="setFormat('color',c.value)"><span :style="{background:c.value}"></span>{{c.name}}</button></div><label>Color name<input v-model="newColorName"/></label><label>Color<input v-model="newColorValue" type="color"/></label><button :disabled="!newColorName.trim()" @click="colors.push({name:newColorName.trim(),value:newColorValue});newColorName='';scheduleSave()">Add color</button></template>
<template v-else-if="dialog==='date'"><label>Available formats<select v-model="forms.dateFormat"><option v-for="date in dateChoices">{{date}}</option></select></label><p>{{forms.dateFormat}}</p></template>
<template v-else-if="dialog==='insertPage'"><label>Placement<select v-model="forms.insertPlacement"><option value="after">After current page</option><option value="before">Before current page</option><option value="end">End of document</option></select></label><label>Number of pages<input v-model="forms.insertCount" type="number" min="1" max="20"/></label></template>
<template v-else-if="dialog==='deletePage'"><p>Delete page {{pageIndex+1}} and its objects? The remaining pages will be retained.</p></template>
<template v-else-if="dialog==='pageNumber'"><label>Page number<input v-model="forms.pageNumber" type="number" min="1"/></label><p>Inserts the number at the text cursor.</p></template>
<template v-else-if="dialog==='indexEntry'"><label>Index term<input v-model="forms.indexTerm"/></label><p>Adds an entry referring to page {{pageIndex+1}}.</p></template>
<template v-else-if="dialog==='footnote'"><label>Footnote<textarea v-model="forms.footnote" dir="rtl"/></label></template>
<template v-else-if="dialog==='find'"><label>Find<input v-model="find" @input="searchCursor=0"/></label><label>Replace with<input v-model="replacement"/></label><label><input v-model="matchCase" type="checkbox"/>Match case</label><label><input v-model="wholeWord" type="checkbox"/>Match whole word</label><div class="button-row"><button @mousedown.prevent @click="findNext">Find next</button><button @mousedown.prevent @click="replaceOne">Replace</button><button @mousedown.prevent @click="replaceAll">Replace all</button></div><p>{{message}}</p></template>
<template v-else-if="dialog==='story'"><p>{{selectedObject&&['text','title'].includes(selectedObject.type)? 'Edits the complete text story for this frame chain.':'Edits the current page as plain text. Applying this replaces its rich formatting.'}}</p><textarea class="story-editor" v-model="storyText" :dir="format.direction" aria-label="Story text" :style="{ fontSize: preferences.story.storyFontSize || '12pt' }"/></template>
<template v-else-if="dialog==='pasteSpecial'"><p>Paste Unicode text below. Formatting is removed.</p><textarea v-model="pasteText" aria-label="Paste text" :dir="format.direction"/></template>
<template v-else-if="dialog==='autoIndex'"><p>Enter one term per line. All pages are searched for these terms.</p><textarea v-model="autoIndexText" aria-label="Index terms" dir="rtl"/></template>
<template v-else-if="dialog==='symbols'"><div class="symbols"><button v-for="s in ['﷽','ﷺ','ؑ','ؓ','ؒ','۞','۩','٭','،','؛','؟','ـ','ء','ً','ٌ','ٍ','َ','ُ','ِ','ّ','ْ','٪','۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','©','®','™','•','—']" @mousedown.prevent @click="insertPlain(s)">{{s}}</button></div><p>Click a symbol to insert at the text cursor.</p></template>
<template v-else-if="dialog==='spelling'"><p>Enable the browser's spelling checker for the current language. It underlines recognized errors in editable text; suggestions are available from the browser's context menu.</p><p>An Urdu dictionary is not bundled yet.</p></template>
<template v-else-if="dialog==='words'"><dl><dt>Words</dt><dd>{{wordCount}}</dd><dt>Pages</dt><dd>{{pages.length}}</dd><dt>Page objects</dt><dd>{{objects.length}}</dd><dt>Story words</dt><dd>{{storyStats.words}}</dd><dt>Story characters</dt><dd>{{storyStats.characters}}</dd><dt>Story paragraphs</dt><dd>{{storyStats.paragraphs}}</dd></dl></template>
<template v-else-if="dialog==='documents'"><div class="document-list" :class="windowLayout"><button v-for="(d,i) in documents" :style="windowLayout==='cascade'?{left:i*22+'px',top:i*26+'px',zIndex:i+1}:{}" @click="switchDocument(d.id);dialog=''"><b>{{d.title}} — {{d.data.pages?.length||1}} page(s)</b><span v-if="windowLayout!=='list'" dir="rtl">{{jsonText(d.data.content).slice(0,200)}}</span></button></div><p>{{message}}</p></template>
<template v-else-if="dialog==='shortcuts'"><dl><template v-for="item in Object.values(menus).flat().filter(i=>i?.[2])"><dt>{{item[0]}}</dt><dd>{{item[2]}}</dd></template></dl></template>
<template v-else-if="dialog==='keyboard'"><p>Phonetic input uses Latin keys while the language is Urdu, Arabic or Persian. Ctrl+Space toggles Urdu/English.</p><div class="key-grid"><span v-for="(value,key) in keys"><kbd>{{key}}</kbd> {{value}}</span></div></template>
<template v-else-if="dialog==='help'"><p>Use the hand tool to edit text, or select a frame/drawing tool and drag on the page. The arrow tool moves objects; its corner handle resizes them. Shift-click selects more than one object.</p><p>The rotation tool rotates objects by dragging. The linking tool connects two ordinary text frames; overflowing text flows to the second. F2 opens the complete story. Unlink disconnects a chain.</p><p>Insert → Page adds pages. Format → Object changes dimensions, color and text columns. Format → Document changes margins and columns. Right-click text for browser spelling suggestions.</p><p>Ctrl+1…5 selects the first five tools. F5 fits the page; F6/F7/F8 select 50/100/200% zoom. F9 toggles snapping.</p></template>
<template v-else-if="dialog==='about'"><p><b>Khusrau 5.0 — Urdu Publishing Suite</b></p><p>Developed by Tariq Abdullah</p><p>Unicode text, Nastaleeq typography, drawing objects, linked text frames, tables, picture frames, typography controls, and high-performance font streaming for over 600 Urdu typefaces.</p></template>
<template v-else-if="dialog==='olderVersion'"><p>This file was created in an older version of this software and we have converted it for you. You can download it in older version by File -&gt; Download for older InPage.</p></template>
<template v-else-if="dialog==='error'"><p>{{message}}</p></template>
</div><div class="dialog-actions"><button v-if="!['new','close','exit','find','symbols','colors','styles','character','tableLayout','documents','help','pdf','eps','native','text','exportPage','print','shortcuts','keyboard','about','words','error','olderVersion'].includes(dialog)" @click="applyDialog">{{dialog==='saveAs'?'Save':dialog==='deletePage'?'Delete page':'Apply'}}</button><button @click="dialog='';autosave()">Close</button></div></section></div>
</div>
</template>

