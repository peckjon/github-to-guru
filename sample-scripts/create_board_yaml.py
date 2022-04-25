import glob
from os import path, scandir
import re
import sys
from pathlib import Path
import frontmatter
import yaml

int32_max = 0x7FFFFFFF

def get_order_card(cardfile, default_sorted):
    pos_base = int32_max-len(default_sorted)
    with open(cardfile, 'r' ) as f:
        metadata, content = frontmatter.parse(f.read())
        if metadata and 'order' in metadata:
            order = metadata['order']
        elif metadata and 'Order' in metadata:
            order = metadata['Order']
        else:
            order = pos_base + default_sorted.index(cardfile)
    return order

def get_order_directory(folder, default_sorted):
    configfile = folder.path+'/folder-config.yaml'
    pos_base = int32_max-len(default_sorted)
    order = pos_base + default_sorted.index(folder)
    if path.exists(configfile):
        with open(configfile, 'r' ) as f:
            metadata = yaml.full_load(f)
            if metadata and 'order' in metadata:
                order = metadata['order']
            elif metadata and 'Order' in metadata:
                order = metadata['Order']
    return order

def create_card_entry(parent_path, cardfile, line_prefix):
    card_id = path.splitext(cardfile)[0].lstrip(parent_path)
    card_id = re.sub(r'[^a-zA-Z0-9]','_', card_id)
    return f'{line_prefix}  - ID: "{card_id}"\n' \
        + f'{line_prefix}    Type: "card"\n'

def create_board_yaml(parent_path, board_id, entry):
    yaml_segment = ''
    subfiles = sorted(list(glob.iglob(entry.path + '/*.md', recursive=False)))
    subfiles = sorted(subfiles, key=lambda f: get_order_card(f,subfiles))
    for cardfile in subfiles:
        yaml_segment += create_card_entry(parent_path, cardfile, '')
    subdirs = [e for e in scandir(entry) if e.name[0]!='.' and e.is_dir(follow_symlinks=False)]
    subdirs = sorted(subdirs, key=lambda f: get_order_directory(f,subdirs))
    for subdir in subdirs:
        subfiles = sorted(list(glob.iglob(subdir.path + '/**/*.md', recursive=True)))
        subfiles = sorted(subfiles, key=lambda f: get_order_card(f,subfiles))
        if subfiles:
            yaml_segment += f'  - Type: "section"\n'
            yaml_segment += f'    Title: "{path.splitext(subdir.name)[0]}"\n'
            yaml_segment += f'    Items:\n'
            for cardfile in subfiles:
                yaml_segment += create_card_entry(parent_path, cardfile, '  ')
    if not yaml_segment:
        return ''
    print('CREATING BOARD FOR '+entry.path)
    yaml = f'"{board_id}":\n'
    title = re.sub('_', ' ',path.basename(entry.path))
    yaml += f'  Title: "{title}"\n'
    yaml += f'  Items:\n'
    return yaml+yaml_segment

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
print('Scanning: '+root_dir)
parent_path = str(Path(root_dir).parent)
nboards = 0
nboardgroups = 0
boards_yaml = ''
boardgroups_yaml = ''

top_level_dirs = [e for e in scandir(root_dir) if e.name[0]!='.' and e.is_dir(follow_symlinks=False)]
top_level_dirs = sorted(top_level_dirs, key=lambda f: get_order_directory(f,top_level_dirs))
for entry in top_level_dirs:
    subdirs = [e for e in scandir(entry) if e.name[0]!='.' and e.is_dir(follow_symlinks=False)]
    if len(subdirs):
        subdirs = sorted(subdirs, key=lambda f: get_order_directory(f,subdirs))
        print(entry.name)
        subfiles = list(glob.iglob(entry.path + '/*.md', recursive=False))
        for subfile in subfiles:
            print('WARNING: floating card will not be on a board: '+subfile)
        boardgroup_yaml_segment = ''
        for subdir in subdirs:
            boards_yaml_segment = create_board_yaml(parent_path, f'board{nboards}', subdir)
            if boards_yaml_segment:
                boards_yaml += boards_yaml_segment
                boardgroup_yaml_segment += f'  - "board{nboards}"\n'
                nboards += 1
        if boardgroup_yaml_segment:
            print('CREATING BOARDGROUP FOR '+entry.name)
            boardgroups_yaml += f'"boardgroup{nboardgroups}":\n'
            boardtitle = re.sub('_', ' ',entry.name)
            boardgroups_yaml += f'  Title: "{boardtitle}"\n'
            boardgroups_yaml += f'  Boards:\n'
            boardgroups_yaml += boardgroup_yaml_segment
            nboardgroups += 1
    else:
        boards_yaml_segment = create_board_yaml(parent_path, f'board{nboards}', entry)
        if boards_yaml_segment:
            boards_yaml += boards_yaml_segment
            nboards += 1

boards_outputfile = sys.argv[2] if len(sys.argv)>2 else input('Name of boards output file (usually boards.yaml):').strip()
if not boards_outputfile:
    boards_outputfile = 'boards.yaml'
if path.exists(boards_outputfile):
    print('ERROR: Not overwriting existing file: '+boards_outputfile)
else:
    with open(boards_outputfile, 'w') as f:
            print(boards_yaml, file=f)
    print(f'{nboards} boards written to {boards_outputfile}')

boardgroups_outputfile = sys.argv[3] if len(sys.argv)>3 else input('Name of boardgroups output file (usually boardgroups.yaml):').strip()
if not boardgroups_outputfile:
    boardgroups_outputfile = 'boardgroups.yaml'
if path.exists(boardgroups_outputfile):
    print('ERROR: Not overwriting existing file: '+boardgroups_outputfile)
else:
    with open(boardgroups_outputfile, 'w') as f:
            print(boardgroups_yaml, file=f)
    print(f'{nboardgroups} boards written to {boardgroups_outputfile}')

