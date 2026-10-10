from PIL import Image, ImageDraw
from pathlib import Path
for size in [192,512]:
 im=Image.new('RGB',(size,size),'#d4d0c8');d=ImageDraw.Draw(im);d.rectangle((size*.23,size*.12,size*.77,size*.88),fill='white',outline='#14594d',width=max(2,size//60));d.line((size*.6,size*.3,size*.6,size*.67,size*.42,size*.72),fill='#14594d',width=size//25);im.save(f'E:/inpage.net/public/icon-{size}.png')
