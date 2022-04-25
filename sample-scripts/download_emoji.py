import glob, re, sys
from os import path
from pathlib import Path

root_dir = sys.argv[1] if len(sys.argv)>1 else input('Directory to scan for markdown files (enter "./" for current directory): ').strip()
root_dir = path.abspath(path.expanduser(root_dir))
if not root_dir.endswith('/'):
    root_dir += '/'
if root_dir == '/':
    print('Please specify a directory other than /')
    exit()
if not path.exists(root_dir):
    print('Path does not exist: '+root_dir)
    exit()
parent_path = str(Path(root_dir).parent)

# emoji_links = []
# for filename in glob.iglob(root_dir + '**/*.md', recursive=True):
#     with open (filename, 'r' ) as f:
#         emoji_links += re.findall('../../resources/emoji_unicode_([^\.]+)_32\.png',f.read())
# emoji_links = set(emoji_links)
# for x in emoji_links:
#     print('curl "https://assets.ghe.io/images/icons/emoji/unicode/%s.png" --output "Sales Collection/resources/emoji_unicode_%s_64.png"' % (x,x))
#     print('sips -Z 32 "Sales Collection/resources/emoji_unicode_%s_64.png" -o "Sales Collection/resources/emoji_unicode_%s_32.png"' % (x,x))

img_links = []
for filename in glob.iglob(root_dir + '**/*.md', recursive=True):
    with open (filename, 'r' ) as f:
        img_links += re.findall('https://user-images.githubusercontent.com/([0-9]+)/([^\.]+)\.(png|jpg|jpeg|gif|pdf)',f.read())
img_links = set(img_links)
for (uid,fname,ext) in img_links:
    print('curl "https://user-images.githubusercontent.com/%s/%s.%s" --output "Sales Collection/resources/%s_%s.%s"' % (uid,fname,ext,uid,fname,ext))
    print("find 'Sales Collection/' -type f -name '*.md' -exec sed -i '' s/https:\\\/\\\/user-images\\\.githubusercontent\\\.com\\\/%s\\\/%s.%s/resources\\\/%s_%s.%s/ {} +" % (uid,fname,ext,uid,fname,ext))
