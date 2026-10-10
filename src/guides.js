// Coordinates are unscaled page pixels, independent of scroll and zoom.
export function guidePoint(clientX,clientY,rect,zoom){return {x:(clientX-rect.left)/(zoom/100),y:(clientY-rect.top)/(zoom/100)}}
export function guideDrop(p,width,height){return Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<=width&&p.y<=height}
export function validGuides(guides,pages){const ids=new Set(pages.map(p=>p.id));return (Array.isArray(guides)?guides:[]).filter(g=>typeof g.id==='string'&&ids.has(g.page)&&['horizontal','vertical'].includes(g.axis)&&Number.isFinite(g.position)&&g.position>=0&&g.position<5000).map(g=>({...g}))}
export function snapToGuides(value,size,positions,tolerance){let delta=Infinity;for(const line of positions)for(const edge of [value,value+size/2,value+size]){const d=line-edge;if(Math.abs(d)<=tolerance&&Math.abs(d)<Math.abs(delta))delta=d}return Number.isFinite(delta)?value+delta:value}
