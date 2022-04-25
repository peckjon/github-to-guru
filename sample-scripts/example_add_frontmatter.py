import glob
from os import scandir
import frontmatter


ROOT_DIR = '../Sales Collection/'
STEP_SIZE = 100


def get_subdirs(directory):
    return [e for e in scandir(directory) if e.name[0]!='.' and e.is_dir(follow_symlinks=False)]


def add_frontmatter(directory):
    # scan .md files in this directory and add 'order' to frontmatter if not present
    mdfiles = sorted(list(glob.iglob(directory.path + '/*.md', recursive=False)))
    extant_orders = 0
    new_orders = 0
    for mdfile in mdfiles:
        print(mdfile)
        with open(mdfile, 'r' ) as f:
            post = frontmatter.load(f)
            if 'order' in post.metadata or 'Order' in post.metadata:
                extant_orders += 1
            else:
                post.metadata['order'] = STEP_SIZE+(mdfiles.index(mdfile)*STEP_SIZE)
                new_orders += 1
            # write to file
        frontmatter.dump(post, mdfile)
    if new_orders and extant_orders:
        print(f'WARNING: {directory.path} contains a mix files with existing and new orders in their frontmatter')
    # recursively scan subdirectories
    subdirs = [e for e in scandir(directory) if e.name[0]!='.' and e.is_dir(follow_symlinks=False)]
    for subdir in subdirs:
        add_frontmatter(subdir)


print('Scanning: '+ROOT_DIR)
for entry in get_subdirs(ROOT_DIR):
    add_frontmatter(entry)
