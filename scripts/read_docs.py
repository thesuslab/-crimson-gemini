import docx

def read_docx(path):
    doc = docx.Document(path)
    result = []
    for p in doc.paragraphs:
        style = p.style.name if p.style else ''
        result.append({'style': style, 'text': p.text})
    return result

mou = read_docx('Jumpnations 2.0 MOU.docx')
stories = read_docx('User stories analysis for Next Phase 0204026 - v1.docx')

print('=== MOU STRUCTURE (first 20) ===')
for i, p in enumerate(mou[:20]):
    print('[%d] [%s] %s' % (i, p['style'], repr(p['text'][:80])))

print()
print('=== STORIES (all) ===')
for i, p in enumerate(stories):
    print('[%d] [%s] %s' % (i, p['style'], repr(p['text'][:120])))
