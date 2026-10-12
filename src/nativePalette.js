export function readV3Palette(bytes){
 const decode=new TextDecoder('utf-16le')
 let start=-1
 for(let p=0;p+156<Math.min(1600,bytes.length);p+=2){
  if(decode.decode(bytes.subarray(p,p+10))==='White'&&decode.decode(bytes.subarray(p+78,p+88))==='Black'){start=p;break}
 }
 if(start<0)return []
 const colors=[]
 for(let p=start;p+72<=bytes.length&&colors.length<256;p+=78){
  const name=decode.decode(bytes.subarray(p,p+64)).split('\0')[0]
  if(!name||[...name].some(c=>c.charCodeAt(0)<32))break
  const color='#'+Array.from(bytes.subarray(p+64,p+67),b=>b.toString(16).padStart(2,'0')).join('')
  colors.push({index:colors.length+1,name,color,cmyk:Array.from(bytes.subarray(p+68,p+72))})
 }
 return colors
}
