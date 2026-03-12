import docx

def read_tables(path):
    doc = docx.Document(path)
    tables = []
    for t_idx, table in enumerate(doc.tables):
        rows = []
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells]
            rows.append(cells)
        tables.append(rows)
    return tables

print('=== MOU TABLES ===')
mou_tables = read_tables('Jumpnations 2.0 MOU.docx')
for i, table in enumerate(mou_tables):
    print('Table %d (%d rows):' % (i, len(table)))
    for row in table:
        print('  ', ' | '.join(row))
    print()

print('=== STORIES TABLES ===')
stories_tables = read_tables('User stories analysis for Next Phase 0204026 - v1.docx')
for i, table in enumerate(stories_tables):
    print('Table %d (%d rows):' % (i, len(table)))
    for row in table:
        print('  ', ' | '.join(row))
    print()
