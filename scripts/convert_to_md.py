import docx

def read_docx(path):
    doc = docx.Document(path)
    result = []
    for p in doc.paragraphs:
        style = p.style.name if p.style else 'Normal'
        result.append((style, p.text))
    return result

mou = read_docx('Jumpnations 2.0 MOU.docx')
stories = read_docx('User stories analysis for Next Phase 0204026 - v1.docx')

# Dump MOU to file
with open('scripts/mou_dump.txt', 'w', encoding='utf-8') as f:
    for i, (style, text) in enumerate(mou):
        f.write('[%d] [%s] %s\n' % (i, style, text))

# Dump stories to file
with open('scripts/stories_dump.txt', 'w', encoding='utf-8') as f:
    for i, (style, text) in enumerate(stories):
        f.write('[%d] [%s] %s\n' % (i, style, text))

print('Done. %d MOU paragraphs, %d Stories paragraphs.' % (len(mou), len(stories)))
