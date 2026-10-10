// Build exclusion outlines inside the text container, in CSS pixels.
// Each scanline retains the widest available span; RTL ties prefer the right.
export function exclusionPolygons(objects,box,{direction='rtl',step=4}={}){
 const relevant=objects.filter(o=>(!box.id||o.id!==box.id)&&o.wrap&&o.wrap!=='none'),height=box.h,width=box.w
 if(!relevant.length||width<=0||height<=0)return []
 const rows=[]
 for(let y=0;y<height;y+=step){
  const intervals=[];for(const o of relevant){const gap=Math.max(0,o.wrapGap??2.6667),gl=Math.max(0,o.wrapLeft??gap),gr=Math.max(0,o.wrapRight??gap),gt=Math.max(0,o.wrapTop??gap),gb=Math.max(0,o.wrapBottom??gap),angle=(o.rotation||0)*Math.PI/180,cx=o.x+o.w/2-box.x+(gr-gl)/2,cy=o.y+o.h/2-box.y+(gb-gt)/2
   const hw=(Math.abs(o.w*Math.cos(angle))+Math.abs(o.h*Math.sin(angle)))/2+(gl+gr)/2,hh=(Math.abs(o.w*Math.sin(angle))+Math.abs(o.h*Math.cos(angle)))/2+(gt+gb)/2
   if(y+step<=cy-hh||y>=cy+hh)continue
   let left=cx-hw,right=cx+hw
   if(o.wrap==='shape'&&['ellipse','ellipse-picture'].includes(o.type)&&!angle){const yy=Math.min(Math.abs(y-cy),Math.abs(y+step-cy));const half=hw*Math.sqrt(Math.max(0,1-(yy/hh)**2));left=cx-half;right=cx+half}
   if(o.wrap==='shape'&&['round','round-picture'].includes(o.type)&&!angle){const radius=Math.min(hw,hh,Math.max(0,o.radius??24)),dy=Math.max(0,Math.min(Math.abs(y-cy),Math.abs(y+step-cy))-(hh-radius));const inset=radius-Math.sqrt(Math.max(0,radius*radius-dy*dy));left+=inset;right-=inset}
   if(o.wrap==='top-bottom'){left=0;right=width}
   if(o.wrap==='left')left=0
   if(o.wrap==='right')right=width
   if(right>0&&left<width)intervals.push([Math.max(0,left),Math.min(width,right)])
  }
  intervals.sort((a,b)=>a[0]-b[0]);let cursor=0,gaps=[]
  for(const [a,b] of intervals){if(a>cursor)gaps.push([cursor,a]);cursor=Math.max(cursor,b)}if(cursor<width)gaps.push([cursor,width])
  gaps.sort((a,b)=>(b[1]-b[0])-(a[1]-a[0])||(direction==='rtl'?b[0]-a[0]:a[0]-b[0]));const span=gaps[0]||[width, width]
  rows.push({y,end:Math.min(height,y+step),left:span[0],right:span[1],intervals})
 }
 let leftWidth=Math.max(...rows.map(r=>r.left)),rightWidth=Math.max(...rows.map(r=>width-r.right))
 // Opposing floats cannot have combined margin boxes wider than the story.
 // Choose a consistent side when obstacles switch sides along the story.
 if(leftWidth+rightWidth>width){const useLeft=rows.reduce((n,r)=>n+r.left,0)>=rows.reduce((n,r)=>n+width-r.right,0);for(const r of rows){if(useLeft){r.left=r.intervals.length?Math.max(...r.intervals.map(i=>i[1])):0;r.right=width}else{r.left=0;r.right=r.intervals.length?Math.min(...r.intervals.map(i=>i[0])):width}}leftWidth=Math.max(...rows.map(r=>r.left));rightWidth=Math.max(...rows.map(r=>width-r.right))}
 const polygons=[]
 for(const side of ['left','right']){if(!rows.some(r=>side==='left'?r.left>0:r.right<width))continue
  const floatWidth=side==='left'?leftWidth:rightWidth,origin=side==='left'?0:width-floatWidth,edge=side==='left'?0:floatWidth,points=[[edge,0]]
  for(const r of rows){const x=(side==='left'?r.left:r.right)-origin;points.push([x,r.y],[x,r.end])}points.push([edge,height])
  polygons.push({side,width:floatWidth,height,shape:'polygon('+points.map(([x,y])=>`${x.toFixed(2)}px ${y.toFixed(2)}px`).join(',')+')'})
 }
 return polygons
}
export function insertExclusions(container,polygons){for(const p of polygons){const el=document.createElement('span');el.className='runaround-float';el.contentEditable='false';el.setAttribute('aria-hidden','true');Object.assign(el.style,{float:p.side,width:p.width+'px',height:p.height+'px',shapeOutside:p.shape});container.appendChild(el)}}
