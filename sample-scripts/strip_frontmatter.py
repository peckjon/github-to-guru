import glob
from os import path
import re
import sys
from pathlib import Path
import frontmatter

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
nwritten = 0

for filename in glob.iglob(root_dir + '**/*.md', recursive=True):
    print('Found: '+filename)
    with open (filename, 'r' ) as f:
        metadata, content = frontmatter.parse(f.read())
    if metadata:
        with open (filename, 'w' ) as f:
            f.write(content)
            nwritten+=1

print(f'{nwritten} cards had frontmatter removed')