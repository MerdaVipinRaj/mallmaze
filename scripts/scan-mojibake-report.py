import glob, re

patterns = [
    r'ðŸ',
    r'â†',
    r'â‚',
    r'âœ',
    r'â€',
    r'\[ð',
    r'Homeâ',
    r'\uFFFD',
    r'Ā',
    r'š¡'
]

combined = re.compile('|'.join(patterns))

out_lines = []

for fn in sorted(glob.glob('*.html') + glob.glob('assets/js/*.js')):
    with open(fn, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    found = []
    for num, line in enumerate(lines, 1):
        if combined.search(line):
            found.append((num, line.strip()))
    
    if found:
        out_lines.append(f"=== {fn} has {len(found)} suspect lines ===")
        for num, text in found:
            out_lines.append(f"  Line {num}: {text[:140]}")

with open('scripts/mojibake-report.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out_lines))

print(f"Report written. Found suspects in {len(out_lines)} lines.")
