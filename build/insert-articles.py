import json, sys
p = '/Users/fitbudd/globalbusinessnewstoday/js/articles-data.js'
spec = json.load(open(sys.argv[1]))
s = open(p).read()
blocks = []
for a in spec:
    content = open(a['file']).read().rstrip('\n')
    for bad in ['`', '${', '—']:
        assert bad not in content, (a['file'], bad)
        assert bad not in a['title'] + a['excerpt'] + a['alt'], (a['id'], bad)
    assert len(a['excerpt']) <= 160, a['id']
    assert ('id: "%s"' % a['id']) not in s, 'duplicate ' + a['id']
    j = json.dumps
    blocks.append(f'''  {{
    id: {j(a['id'])},
    title: {j(a['title'])},
    excerpt: {j(a['excerpt'])},
    category: {j(a['category'])},
    categorySlug: {j(a['slug'])},
    author: {{
      name: "GBNT Newsroom",
      type: "Organization",
      avatar: "/assets/icon-192.png"
    }},
    publishedAt: {j(a['date'])},
    readTime: {j(a['read'])},
    image: "https://images.unsplash.com/{a['img']}?auto=format&fit=crop&w=1200&q=80",
    imageAlt: {j(a['alt'])},
    isTrending: {'true' if a.get('trending') else 'false'},
    views: 0,
    tags: {j(a['tags'])},
    content: `
{content}
    `
  }},
''')
marker = 'const ARTICLES = [\n'
assert marker in s
s = s.replace(marker, marker + ''.join(blocks), 1)
open(p, 'w').write(s)
print('inserted', len(blocks))
