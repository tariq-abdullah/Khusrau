import pymupdf
from PIL import Image
from pathlib import Path
p=pymupdf.open('research/fixtures/AboutFaiz-native-reference.pdf')
img=p[0].get_images(full=True)[0]
Path('research/fixtures/banner-print.jpg').write_bytes(p.extract_image(img[0])['image'])
print(p[0].get_images(full=True))
