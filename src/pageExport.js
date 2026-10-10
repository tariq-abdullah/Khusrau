import {toCanvas} from 'html-to-image'
import {jsPDF} from 'jspdf'

export async function capturePaper(paper,widthMM,heightMM,options={}){
 await document.fonts.ready
 const guides=paper.classList.contains('guides'),invisibles=paper.classList.contains('invisibles');paper.classList.remove('guides','invisibles')
 try{const canvas=await toCanvas(paper,{pixelRatio:2,backgroundColor:'#fff',width:Math.round(widthMM*96/25.4),height:Math.round(heightMM*96/25.4),style:{zoom:'1',border:'none',outline:'none',margin:'0',overflow:'hidden'},filter:node=>(!options.selectedIds||!(node.classList?.contains('canvas-object')&&!options.selectedIds.includes(node.getAttribute('data-object-id')))&&!node.classList?.contains('tiptap')&&!node.classList?.contains('text-boundary'))&&!node.classList?.contains('nonprinting')&&!node.classList?.contains('ruler-guide')&&!node.classList?.contains('margin-guide')&&!node.classList?.contains('resize-handle')&&!node.classList?.contains('overflow-indicator')&&!node.classList?.contains('lock-indicator')&&!node.classList?.contains('link-layer')});if(options.mirror){const ctx=canvas.getContext('2d'),copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.translate(canvas.width,0);ctx.scale(-1,1);ctx.drawImage(copy,0,0)}return canvas}
 finally{if(guides)paper.classList.add('guides');if(invisibles)paper.classList.add('invisibles')}
}
export function makePDF(canvases,widthMM,heightMM,title){const pdf=new jsPDF({unit:'mm',format:[widthMM,heightMM],compress:true});pdf.setProperties({title,creator:'inpage.net (raster page export)'});canvases.forEach((canvas,i)=>{if(i)pdf.addPage([widthMM,heightMM]);pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,widthMM,heightMM)});return pdf.output('arraybuffer')}
// EPS describes one page. RGB pixels avoid platform fonts and preserve Urdu.
export function makeEPS(canvas,widthMM,heightMM){
 const w=widthMM*72/25.4,h=heightMM*72/25.4,{width,height}=canvas,rgba=canvas.getContext('2d').getImageData(0,0,width,height).data
 const lines=[];let line='';for(let i=0;i<rgba.length;i+=4){for(let j=0;j<3;j++)line+=rgba[i+j].toString(16).padStart(2,'0');if(line.length>=120){lines.push(line);line=''}}if(line)lines.push(line)
 return `%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 ${Math.ceil(w)} ${Math.ceil(h)}\n%%HiResBoundingBox: 0 0 ${w} ${h}\n%%Creator: inpage.net raster EPS\n%%Pages: 1\n%%EndComments\ngsave\n${w} ${h} scale\n/picstr ${width*3} string def\n${width} ${height} 8 [${width} 0 0 -${height} 0 ${height}]\n{currentfile picstr readhexstring pop} false 3 colorimage\n${lines.join('\n')}\ngrestore\nshowpage\n%%EOF\n`
}
