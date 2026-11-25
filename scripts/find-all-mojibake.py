import glob, re

patterns = [
    r'ðŸ',
    r'â†',
    r'â‚',
    r'âœ',
    r'â€',
    r'Ã',
    r'Â',
    r'\[ð',
    r'Homeâ'
]

combined = re.compile('|'.join(patterns))

for fn in glob.glob('*.html') + glob.glob('assets/js/*.js'):
    with open(fn, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    found = []
    for num, line in enumerate(lines, 1):
        if combined.search(line):
            found.append((num, line.strip()))
    
    if found:
        print(f"=== {fn} has {len(found)} suspect lines ===")
        for num, text in found[:5]:
            print(f"  Line {num}: {text[:100]}")

print("Scan for residual mojibake completed.")
