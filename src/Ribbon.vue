<script setup>
import inpageFonts from './inpage-fonts.json'
const englishFonts=inpageFonts.filter(f=>f.latinCharacters>=50&&f.arabicCharacters<10&&!f.legacy)
const urduFonts=inpageFonts.filter(f=>f.arabicCharacters>=10||f.legacy)
import Icon from './Icon.vue'
import {reactive} from 'vue'
const props=defineProps({format:Object,editor:Object,colors:Array,styles:Array})
const emit=defineEmits(['format','align','direction','character'])
const drafts=reactive({})
function update(k,e){const value=drafts[k]??e.target.value;emit('format',k,value);delete drafts[k]}
function commit(k,e){if(k in drafts)update(k,e)}
</script>
<template>
<section class="ribbon" aria-label="Text formatting ribbon">
<div class="ribbon-row">
<select class="style-field" :value="format.style" aria-label="Style sheet" @change="update('style',$event)"><option>Normal</option><option>Heading 1</option><option>Heading 2</option><option>Heading 3</option><option>Quote</option><option v-for="s in styles||[]">{{s.name}}</option></select>
<label class="metric leading-field" title="Line spacing"><Icon name="leading"/><input aria-label="Line spacing" :value="drafts.leading??(format.leading)" @input="drafts.leading=$event.target.value" @blur="commit('leading',$event)" @keydown.enter="$event.target.blur()"/></label>
<select class="font-field" :value="format.latinFont" aria-label="English font" @change="update('latinFont',$event)"><option>Arial</option><option>Times New Roman</option><option>Georgia</option><option>Courier New</option><option>Tahoma</option><optgroup v-if="englishFonts.length" label="Installed English fonts"><option v-for="f in englishFonts" :value="f.family">{{f.fullName}}{{f.legacy?' (legacy encoding)':''}}</option></optgroup></select>
<div class="pair"><button title="Bold" aria-label="Bold" :class="{active:editor?.isActive('bold')}" @mousedown.prevent @click="emit('character','bold')"><b>B</b></button><button title="Italic" aria-label="Italic" :class="{active:editor?.isActive('italic')}" @mousedown.prevent @click="emit('character','italic')"><i>I</i></button></div>
<label class="size-field"><input aria-label="Font size" list="font-sizes" :value="drafts.size??(format.size+'pt')" @input="drafts.size=$event.target.value" @blur="commit('size',$event)" @keydown.enter="$event.target.blur()"/><datalist id="font-sizes"><option v-for="n in [8,10,12,14,16,18,24,36,48,72]" :value="n+'pt'"/></datalist></label>
<label class="metric percent-field" title="Character tracking"><Icon name="tracking"/><input aria-label="Character tracking" :value="drafts.tracking??(format.tracking+'%')" @input="drafts.tracking=$event.target.value" @blur="commit('tracking',$event)" @keydown.enter="$event.target.blur()"/></label>
<button title="Superscript" aria-label="Superscript" :class="{active:format.superscript}" @mousedown.prevent @click="emit('format','superscript',!format.superscript)"><Icon name="superscript"/></button>
<select class="language-field" :value="format.language" aria-label="Language" @change="update('language',$event)"><option>Urdu</option><option>English</option><option>Arabic</option><option>Persian</option></select>
</div>
<div class="ribbon-row">
<div class="align-field"><button v-for="a in ['left','center','right','justify','full']" :title="a==='full'?'Full justification':a+' alignment'" :aria-label="a==='full'?'Full justification':a+' alignment'" :class="{active:editor?.isActive({textAlign:a==='full'?'justify':a})}" @mousedown.prevent @click="emit('align',a)"><Icon :name="a"/></button></div>
<label class="metric leading-field" title="Baseline shift"><Icon name="baseline"/><input aria-label="Baseline shift" :value="drafts.baseline??(format.baseline+'pt')" @input="drafts.baseline=$event.target.value" @blur="commit('baseline',$event)" @keydown.enter="$event.target.blur()"/></label>
<select class="font-field" :value="format.font" aria-label="Urdu font" @change="update('font',$event)"><option>Noto Nastaliq Urdu</option><optgroup label="Installed Urdu fonts"><option v-for="f in urduFonts" :value="f.family">{{f.fullName}}{{f.legacy?' (legacy encoding)':''}}</option></optgroup></select>
<div class="pair"><button title="Right to left" aria-label="Right to left" :class="{active:format.direction==='rtl'}" @mousedown.prevent @click="emit('direction','rtl')"><Icon name="rtl"/></button><button title="Left to right" aria-label="Left to right" :class="{active:format.direction==='ltr'}" @mousedown.prevent @click="emit('direction','ltr')"><Icon name="ltr"/></button></div>
<select class="size-field color-field" :value="format.color" aria-label="Text color" @change="update('color',$event)"><option v-for="c in colors" :value="c.value">■ {{c.name}}</option></select>
<label class="metric percent-field" title="Horizontal character scaling"><Icon name="scale"/><input aria-label="Character scale" :value="drafts.scale??(format.scale+'%')" @input="drafts.scale=$event.target.value" @blur="commit('scale',$event)" @keydown.enter="$event.target.blur()"/></label>
<button title="Outline text" aria-label="Outline text" :class="{active:format.outline}" @mousedown.prevent @click="emit('format','outline',!format.outline)"><Icon name="outline"/></button>
<select class="decoration-field" :value="format.decoration" aria-label="Text decoration" @change="update('decoration',$event)"><option>None</option><option>Single</option><option>Double</option><option>Overline</option><option>Box</option></select>
<select class="kashida-field" :value="format.kashida" aria-label="Kashida" @change="update('kashida',$event)"><option>K-None</option><option>K-Special</option><option>K-Other</option></select>
</div>
</section>
</template>

