
import json, os, urllib.request
import glob, re, sys
from os import path
from pathlib import Path

guru_query_url = 'https://api.getguru.com/api/v1/search/query'
guru_collection_id = os.environ.get('GURU_COLLECTION_ID')
guru_collection_token = os.environ.get('GURU_COLLECTION_TOKEN')

def get_slugs_in_collection(guru_query_url, guru_collection, guru_collection_token):
    pwd_mgr = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    pwd_mgr.add_password(None, guru_query_url, guru_collection, guru_collection_token)
    urllib.request.install_opener(urllib.request.build_opener(urllib.request.HTTPBasicAuthHandler(pwd_mgr)))
    req = urllib.request.Request(guru_query_url+'?cardType=CARD', headers={'Accept': 'application/json'})
    with urllib.request.urlopen(req) as opener:
        cards = json.loads(opener.read().decode())
    slugs = [card['slug'] for card in cards]
    return slugs

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

slugs = get_slugs_in_collection(guru_query_url, guru_collection_id, guru_collection_token)

collection_link_warnings = []
resource_link_warnings = []
spacey_link_warnings = []
badrelative_link_warnings = []
for filename in glob.iglob(root_dir + '**/*.md', recursive=True):
    with open (filename, 'r' ) as f:
        content = f.read()
    for slug in slugs:
        if content.find(slug)>=0:
            collection_link_warnings.append((filename.lstrip(parent_path), slug))
    external_links = re.findall('(https?:\/\/[^)\n]+\.(jpg|jpeg|gif|png|pdf))',content)
    if external_links:
        external_links = [m[0] for m in external_links]
        resource_link_warnings.append((filename.lstrip(parent_path),external_links))
    spacey_links = re.findall('\(((\.\.\/)*resources\/[^)]+\s[^)\n]*\.(jpg|jpeg|gif|png|pdf))\)',content)
    if spacey_links:
        spacey_links = [m[0] for m in spacey_links]
        spacey_link_warnings.append((filename.lstrip(parent_path),spacey_links))
    badrelative_links = re.findall('\((resources\/[^)\n]+\.(jpg|jpeg|gif|png|pdf))\)',content)
    if badrelative_links:
        badrelative_links = [m[0] for m in badrelative_links]
        badrelative_link_warnings.append((filename.lstrip(parent_path),badrelative_links))


if badrelative_link_warnings:
    print('\n----\nERROR: the following resource links likely need "../" or "../../" prepended:')
for (name, link) in badrelative_link_warnings:
    print('- "%s" ==> %s' % (name, link))

if spacey_link_warnings:
    print('\n----\nERROR: spaces in the following links should be replaced with "%20":')
for (name, link) in spacey_link_warnings:
    print('- "%s" ==> %s' % (name, link))

if collection_link_warnings:
    print('\n----\nWARNING: links to the old SALES collection have been detected:')
for (name, slug) in collection_link_warnings:
    print('- "%s" ==> https://app.getguru.com/card/%s' % (name, slug))

if resource_link_warnings:
    print('\n----\nWARNING: links to external images or PDFs have been detected (please move them to the resources folder):')
for (name, link) in resource_link_warnings:
    print('- "%s" ==> %s' % (name, link))

sys.exit(
    len(badrelative_link_warnings)
    +len(spacey_link_warnings)
    # +len(collection_link_warnings) ##don't error out on sales collection link warnings
    # +len(resource_link_warnings)  ##don't error out on external image/pdf link warnings
    )