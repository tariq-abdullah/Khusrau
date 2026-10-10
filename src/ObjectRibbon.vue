<script setup>
import {computed,reactive,watch} from 'vue'
const props=defineProps({object:Object,type:String,colors:Array,content:Boolean})
const emit=defineEmits(['change','action'])
const drafts=reactive({})
watch(()=>[props.object?.id,props.type,props.content],()=>Object.keys(drafts).forEach(k=>delete drafts[k]))
const text=computed(()=>['text','title'].includes(props.type)),picture=computed(()=>props.type?.includes('picture')),line=computed(()=>props.type==='line')
const name=computed(()=>props.content&&picture.value?'Picture content':props.type==='title'?'Title box':text.value?'Text box':picture.value?'Picture box':line.value?'Line':({rectangle:'Rectangle',ellipse:'Ellipse',round:'Rounded rectangle',polygon:'Polygon'}[props.type]||'Graphic box'))
const val=(k,d=0)=>props.object?.[k]??d
function field(k,d=0,unit=''){const n=val(k,d);return drafts[k]??(unit==='mm'?(n/3.779527559).toFixed(2)+'mm':n+unit)}
function commit(k,e,unit=''){if(!(k in drafts))return;let n=parseFloat(drafts[k]);if(Number.isFinite(n))emit('change',k,unit==='mm'?n*3.779527559:n);delete drafts[k]}
const metrics=computed(()=>props.content&&picture.value?[['imageX','Picture X',0,'mm'],['imageY','Picture Y',0,'mm'],['imageScaleX','Picture horizontal scale',100,'%'],['imageScaleY','Picture vertical scale',100,'%']]:[['x',line.value?'Start X':'Box X',0,'mm'],['y',line.value?'Start Y':'Box Y',0,'mm'],[line.value?'endX':'w',line.value?'End X':'Box width',200,'mm'],[line.value?'endY':'h',line.value?'End Y':'Box height',100,'mm']])
</script>
<template>
<section class="ribbon object-ribbon" :aria-label="name+' ribbon'" :data-context="name">
<div class="ribbon-row">
<label v-for="m in metrics.filter((_,i)=>i%2===0)" class="object-metric" :title="m[1]"><span>{{({x:'X',w:'W',endX:'X₂',imageX:'X',imageScaleX:'↔'}[m[0]])}}</span><input :aria-label="m[1]" :value="field(m[0],m[2],m[3])" @input="drafts[m[0]]=$event.target.value" @blur="commit(m[0],$event,m[3])" @keydown.enter="$event.target.blur()"/></label>
<template v-if="!content">
<select aria-label="Border color" :value="val('stroke','#000000')" @change="emit('change','stroke',$event.target.value)"><option value="none">None</option><option v-for="c in colors" :value="c.value">■ {{c.name}}</option></select>
<select aria-label="Border style" :value="val('strokeStyle','solid')" @change="emit('change','strokeStyle',$event.target.value)"><option value="solid">━━━━</option><option value="dash">┄┄┄┄</option><option value="dot">••••••</option></select>
<div v-if="!line&&!text" class="pair"><button v-for="s in ['rectangle','ellipse','round']" :aria-label="'Convert to '+s" :class="{active:type===s||type===(s==='rectangle'?'picture':s+'-picture')}" @click="emit('change','shape',s)">{{s==='ellipse'?'○':s==='round'?'▢':'□'}}</button></div>
<label v-if="text" class="object-metric"><span>▤</span><input aria-label="Box columns" :value="field('columns',1)" @input="drafts.columns=$event.target.value" @blur="commit('columns',$event)" @keydown.enter="$event.target.blur()"/></label>
<label class="object-metric"><span>∠</span><input aria-label="Box rotation" :value="field('rotation',0,'°')" @input="drafts.rotation=$event.target.value" @blur="commit('rotation',$event)" @keydown.enter="$event.target.blur()"/></label>
<button v-if="picture" aria-label="Place picture" @click="emit('action','place')">Place…</button>
<select v-if="line" aria-label="Line start arrow" :value="val('startArrow','none')" @change="emit('change','startArrow',$event.target.value)"><option value="none">No start arrow</option><option value="arrow">← Start arrow</option></select>
</template>
<template v-else>
<label class="object-metric"><span>⇢</span><input aria-label="Picture horizontal skew" :value="field('imageSkewX',0,'%')" @input="drafts.imageSkewX=$event.target.value" @blur="commit('imageSkewX',$event)" @keydown.enter="$event.target.blur()"/></label>
<label class="object-metric"><span>∠</span><input aria-label="Picture rotation" :value="field('imageRotation',0,'°')" @input="drafts.imageRotation=$event.target.value" @blur="commit('imageRotation',$event)" @keydown.enter="$event.target.blur()"/></label>
<button aria-label="Mirror picture horizontally" :class="{active:val('mirrorX',false)}" @click="emit('change','mirrorX',!val('mirrorX',false))">↔</button><button aria-label="Mirror picture vertically" :class="{active:val('mirrorY',false)}" @click="emit('change','mirrorY',!val('mirrorY',false))">↕</button>
<button aria-label="Fit picture to box" @click="emit('action','fitPicture')">Fit</button><button aria-label="Fill box with picture" @click="emit('action','fillPicture')">Fill</button><button aria-label="Reset picture transform" @click="emit('action','resetPicture')">Reset</button>
</template>
</div>
<div class="ribbon-row">
<label v-for="m in metrics.filter((_,i)=>i%2===1)" class="object-metric" :title="m[1]"><span>{{({y:'Y',h:'H',endY:'Y₂',imageY:'Y',imageScaleY:'↕'}[m[0]])}}</span><input :aria-label="m[1]" :value="field(m[0],m[2],m[3])" @input="drafts[m[0]]=$event.target.value" @blur="commit(m[0],$event,m[3])" @keydown.enter="$event.target.blur()"/></label>
<template v-if="!content">
<select v-if="!line" aria-label="Box fill" :value="val('fill','none')" @change="emit('change','fill',$event.target.value)"><option value="none">None</option><option v-for="c in colors" :value="c.value">■ {{c.name}}</option></select>
<label class="object-metric"><span>↕</span><input aria-label="Border width" :value="field('strokeWidth',1,'pt')" @input="drafts.strokeWidth=$event.target.value" @blur="commit('strokeWidth',$event)" @keydown.enter="$event.target.blur()"/></label>
<label v-if="text" class="object-metric"><span>↔</span><input aria-label="Box column gap" :value="field('columnGap',16,'mm')" @input="drafts.columnGap=$event.target.value" @blur="commit('columnGap',$event,'mm')" @keydown.enter="$event.target.blur()"/></label>
<label v-else-if="type?.includes('round')" class="object-metric"><span>◜</span><input aria-label="Corner radius" :value="field('radius',24,'mm')" @input="drafts.radius=$event.target.value" @blur="commit('radius',$event,'mm')" @keydown.enter="$event.target.blur()"/></label>
<select v-if="!line" aria-label="Fill pattern" :value="val('pattern','none')" @change="emit('change','pattern',$event.target.value)"><option value="none">No pattern</option><option value="horizontal">Horizontal hatch</option><option value="vertical">Vertical hatch</option><option value="diagonal">Diagonal hatch</option><option value="cross">Cross hatch</option></select>
<select v-if="line" aria-label="Line end arrow" :value="val('endArrow','none')" @change="emit('change','endArrow',$event.target.value)"><option value="none">No end arrow</option><option value="arrow">End arrow →</option></select>
<select aria-label="Text runaround" :value="val('wrap','none')" @change="emit('change','wrap',$event.target.value)"><option value="none">No runaround</option><option value="box">Box runaround</option><option value="shape">Shape runaround</option><option value="top-bottom">Above and below</option><option value="left">Text on right</option><option value="right">Text on left</option></select>
<label class="object-metric"><span>↔</span><input aria-label="Runaround clearance" :value="field('wrapGap',8,'mm')" @input="drafts.wrapGap=$event.target.value" @blur="commit('wrapGap',$event,'mm')" @keydown.enter="$event.target.blur()"/></label>
<button v-if="text" aria-label="Edit box text" @click="emit('action','editText')">Edit text</button><button v-if="picture" aria-label="Edit picture content" @click="emit('action','editPicture')">Edit image</button>
</template>
<template v-else><label class="object-metric"><span>⇣</span><input aria-label="Picture vertical skew" :value="field('imageSkewY',0,'%')" @input="drafts.imageSkewY=$event.target.value" @blur="commit('imageSkewY',$event)" @keydown.enter="$event.target.blur()"/></label><button aria-label="Replace picture" @click="emit('action','place')">Replace…</button><button aria-label="Select picture box" @click="emit('action','selectBox')">Box controls</button></template>
</div>
</section>
</template>
