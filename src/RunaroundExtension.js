import {Extension} from '@tiptap/core'
import {Plugin,PluginKey} from '@tiptap/pm/state'
import {Decoration,DecorationSet} from '@tiptap/pm/view'
import {insertExclusions} from './runaround'
const key=new PluginKey('runaround')
export const Runaround=Extension.create({name:'runaround',addProseMirrorPlugins(){return [new Plugin({key,state:{init:()=>[],apply:(tr,value)=>tr.getMeta(key)??value},props:{decorations(state){const outlines=key.getState(state);if(!outlines.length)return null;return DecorationSet.create(state.doc,[Decoration.widget(0,()=>{const node=document.createElement('span');node.className='runaround-widget';insertExclusions(node,outlines);return node},{side:-1,key:JSON.stringify(outlines),ignoreSelection:true})])}}})]}})
export function updateExclusions(editor,outlines){if(editor&&!editor.isDestroyed)editor.view.dispatch(editor.state.tr.setMeta(key,outlines).setMeta('addToHistory',false))}
