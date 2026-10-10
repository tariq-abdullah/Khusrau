export function findTextMatches(text,needle,{matchCase=true,wholeWord=false}={}){
 if(!needle)return [];const hay=matchCase?text:text.toLocaleLowerCase(),term=matchCase?needle:needle.toLocaleLowerCase(),matches=[];
 const word=c=>!!c&&/[\p{L}\p{M}\p{N}_]/u.test(c);
 for(let from=0;(from=hay.indexOf(term,from))>=0;from+=term.length){const to=from+term.length;if(!wholeWord||!word(text[from-1])&&!word(text[to]))matches.push({from,to})}return matches
}
export function textStatistics(text){return {words:text.trim().split(/\s+/u).filter(Boolean).length,characters:text.length,paragraphs:text.split('\n').length}}
export function pageInsertionIndex(current,length,placement){return placement==='before'?current:placement==='end'?length:current+1}
export function dateFormats(now=new Date()){const d=now.getDate(),m=now.getMonth()+1,y=now.getFullYear();return [d+'/'+m+'/'+y,m+'/'+d+'/'+y,now.toLocaleDateString('ur-PK',{year:'numeric',month:'long',day:'numeric'}),now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}),now.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),now.toLocaleTimeString('ur-PK'),now.toLocaleString('ur-PK')]}
export function duplicateOffsets(objects,rows,columns,rowGap,columnGap){
 const width=Math.max(...objects.map(o=>o.x+o.w))-Math.min(...objects.map(o=>o.x)),height=Math.max(...objects.map(o=>o.y+o.h))-Math.min(...objects.map(o=>o.y));const offsets=[];
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++)if(row||col)offsets.push({x:col*(width+columnGap),y:row*(height+rowGap)});return offsets
}
