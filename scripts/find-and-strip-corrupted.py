import glob

files = ['dashboard.html', 'store-dashboard.html', 'orders.html', 'pos-orders.html', 'inventory.html', 'payments.html', 'profit-loss.html', 'scan.html']

for fn in files:
    with open(fn, 'r', encoding='utf-8', errors='replace') as f:
        c = f.read()

    cleaned_chars = []
    removed = 0
    for ch in c:
        o = ord(ch)
        # 0x80 to 0x9F are C1 control codes (Windows-1252 / ISO-8859-1 mojibake leftovers)
        # 0xFFFD is the Unicode replacement character
        if o in range(0x80, 0xA0) or o == 0xFFFD:
            removed += 1
            continue
        cleaned_chars.append(ch)

    if removed > 0:
        with open(fn, 'w', encoding='utf-8') as f:
            f.write(''.join(cleaned_chars))
        print(f"Removed {removed} corrupted control bytes from {fn}")
    else:
        print(f"Clean: {fn}")

print("Done cleaning corrupted control bytes.")
