<script setup>
import inpageFonts from './inpage-fonts.json'
const englishFonts=inpageFonts.filter(f=>f.latinCharacters>=50&&f.arabicCharacters<10&&!f.legacy)
const urduFonts=inpageFonts.filter(f=>!f.legacy&&f.arabicCharacters>=10).sort((a,b)=>(a.fullName||a.family).localeCompare(b.fullName||b.family))
import Icon from './Icon.vue'
import UrduFontSelect from './UrduFontSelect.vue'
import EnglishFontSelect from './EnglishFontSelect.vue'
import {reactive} from 'vue'
const props=defineProps({format:Object,editor:Object,colors:Array,styles:Array,documentFonts:Array,exporting:Boolean,exportMessage:String})
const emit=defineEmits(['format','align','direction','character','about'])
const drafts=reactive({})
function update(k,e){const value=drafts[k]??e.target.value;emit('format',k,value);delete drafts[k]}
function commit(k,e){if(k in drafts)update(k,e)}
</script>
<template>
<section class="ribbon" aria-label="Text formatting ribbon">
<div class="ribbon-brand-card" data-tooltip="Khusrau 5.0 • Developed by Tariq Abdullah" title="Khusrau 5.0 — Urdu Publishing Suite" @click="emit('about')">
  <div class="ribbon-brand-emblem">
    <span class="ribbon-emblem-urdu">خسرو</span>
    <span class="ribbon-emblem-sub">Kh</span>
  </div>
  <div class="ribbon-brand-info">
    <div class="ribbon-brand-title-row">
      <span class="ribbon-brand-name">Khusrau</span>
      <span class="ribbon-version-badge">5.0</span>
    </div>
    <span class="ribbon-brand-suite">Urdu Publishing Suite</span>
  </div>
</div>
<div class="ribbon-brand-divider" aria-hidden="true"></div>
<div class="ribbon-controls">
<div class="ribbon-row">
<select class="style-field" :value="format.style" aria-label="Style sheet" data-tooltip="Style sheet" data-shortcut="Ctrl+T" @change="update('style',$event)"><option>Normal</option><option>Heading 1</option><option>Heading 2</option><option>Heading 3</option><option>Quote</option><option v-for="s in styles||[]">{{s.name}}</option></select>
<label class="metric leading-field" data-tooltip="Line spacing (Leading)"><Icon name="leading"/><input aria-label="Line spacing" :value="drafts.leading??(format.leading)" @input="drafts.leading=$event.target.value" @blur="commit('leading',$event)" @keydown.enter="$event.target.blur()"/></label>
<UrduFontSelect data-tooltip="Urdu font" :model-value="format.font" :fonts="urduFonts" :document-fonts="documentFonts" :editor="editor" @change="emit('format','font',$event)"/>
<div class="pair"><button aria-label="Bold" data-tooltip="Bold" data-shortcut="Ctrl+B" :class="{active:editor?.isActive('bold')}" @mousedown.prevent @click="emit('character','bold')"><b>B</b></button><button aria-label="Italic" data-tooltip="Italic" data-shortcut="Ctrl+I" :class="{active:editor?.isActive('italic')}" @mousedown.prevent @click="emit('character','italic')"><i>I</i></button></div>
<label class="size-field" data-tooltip="Font size (pt)" data-shortcut="Ctrl+F2"><input aria-label="Font size" list="font-sizes" :value="drafts.size??(format.size+'pt')" @input="drafts.size=$event.target.value" @blur="commit('size',$event)" @keydown.enter="$event.target.blur()"/><datalist id="font-sizes"><option v-for="n in [8,10,12,14,16,18,24,36,48,72]" :value="n+'pt'"/></datalist></label>
<label class="metric percent-field" data-tooltip="Character tracking / spacing (%)"><Icon name="tracking"/><input aria-label="Character tracking" :value="drafts.tracking??(format.tracking+'%')" @input="drafts.tracking=$event.target.value" @blur="commit('tracking',$event)" @keydown.enter="$event.target.blur()"/></label>
<button aria-label="Superscript" data-tooltip="Superscript" data-shortcut="Ctrl+Shift+=" :class="{active:format.superscript}" @mousedown.prevent @click="emit('format','superscript',!format.superscript)"><Icon name="superscript"/></button>
<select class="language-field" :value="format.language" aria-label="Language" data-tooltip="Document language" data-shortcut="Ctrl+Space" @change="update('language',$event)"><option>Urdu</option><option>English</option><option>Arabic</option><option>Persian</option></select>
</div>
<div class="ribbon-row">
<div class="align-field"><button v-for="a in ['left','center','right','justify','full']" :key="a" :aria-label="a==='full'?'Full justification':a+' alignment'" :data-tooltip="a==='full'?'Full justification':(a==='justify'?'Justify alignment':a.charAt(0).toUpperCase()+a.slice(1)+' alignment')" :data-shortcut="a==='left'?'Ctrl+Alt+L':a==='center'?'Ctrl+Alt+C':a==='right'?'Ctrl+Alt+R':a==='justify'?'Ctrl+Alt+J':'Ctrl+Alt+F'" :class="{active:editor?.isActive({textAlign:a==='full'?'justify':a})}" @mousedown.prevent @click="emit('align',a)"><Icon :name="a"/></button></div>
<label class="metric leading-field" data-tooltip="Baseline shift (pt)"><Icon name="baseline"/><input aria-label="Baseline shift" :value="drafts.baseline??(format.baseline+'pt')" @input="drafts.baseline=$event.target.value" @blur="commit('baseline',$event)" @keydown.enter="$event.target.blur()"/></label>
<EnglishFontSelect data-tooltip="Latin / English font" :model-value="format.latinFont" :document-fonts="documentFonts" :editor="editor" @change="emit('format','latinFont',$event)"/>
<div class="pair"><button aria-label="Right to left" data-tooltip="Right to left direction" data-shortcut="Ctrl+Alt+R" :class="{active:format.direction==='rtl'}" @mousedown.prevent @click="emit('direction','rtl')"><Icon name="rtl"/></button><button aria-label="Left to right" data-tooltip="Left to right direction" data-shortcut="Ctrl+Alt+L" :class="{active:format.direction==='ltr'}" @mousedown.prevent @click="emit('direction','ltr')"><Icon name="ltr"/></button></div>
<select class="size-field color-field" :value="format.color" aria-label="Text color" data-tooltip="Text color" @change="update('color',$event)"><option v-for="c in colors" :value="c.value">■ {{c.name}}</option></select>
<label class="metric percent-field" data-tooltip="Horizontal character scale (%)"><Icon name="scale"/><input aria-label="Character scale" :value="drafts.scale??(format.scale+'%')" @input="drafts.scale=$event.target.value" @blur="commit('scale',$event)" @keydown.enter="$event.target.blur()"/></label>
<button aria-label="Outline text" data-tooltip="Outline text" :class="{active:format.outline}" @mousedown.prevent @click="emit('format','outline',!format.outline)"><Icon name="outline"/></button>
<select class="decoration-field" :value="format.decoration" aria-label="Text decoration" data-tooltip="Text decoration" @change="update('decoration',$event)"><option>None</option><option>Single</option><option>Double</option><option>Overline</option><option>Box</option></select>
<select class="kashida-field" :value="format.kashida" aria-label="Kashida" data-tooltip="Kashida justification" @change="update('kashida',$event)"><option>K-None</option><option>K-Special</option><option>K-Other</option></select>
</div>
</div>
<div v-if="exporting" class="ribbon-export-status" role="status" aria-live="polite" data-tooltip="Rendering PDF document">
  <div class="ribbon-spinner" aria-hidden="true"></div>
  <span class="ribbon-spinner-text">{{ exportMessage || 'Rendering PDF…' }}</span>
</div>
</section>
</template>

