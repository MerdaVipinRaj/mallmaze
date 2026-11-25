import glob

replacements = {
    # Corrupted UTF-8 mojibake strings
    'âš¡': '',
    'âš': '',
    'ðŸ“„': '',
    'ðŸ“ž': '',
    'ðŸ“±': '',
    'ðŸ’³': '',
    'ðŸ’¡': '',
    'ðŸš€': '',
    'ðŸšš': '',
    'ðŸš´': '',
    'ðŸ“¸': '',
    'ðŸ–¨ï¸': '',
    'ðŸ’¬': '',
    'ðŸ“': '',
    'ðŸŒ': '',
    'â€“': '-',
    'â€”': '-',
    'â€™': "'",
    'â€˜': "'",
    'â€œ': '"',
    'â€': '"',
    'â€¦': '...',
    'Â·Â·Â·': '...',
    'Â·': '•',
    'â†’': '&rarr;',
    'â†': '&rarr;',
    'â‚¹': '₹',
    'âœ”': '✓',
    'âœ': '✓',
    'Āš¡': '',
    '[ðŸŒ Homeâ†': 'Home',
    '[ðŸŒ': '',
    'Homeâ†': 'Home',
    'Storefrontâ†': 'Storefront'
}

all_files = glob.glob('*.html') + glob.glob('assets/js/*.js')

count_total = 0
for fn in all_files:
    try:
        with open(fn, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = content
        for bad, good in replacements.items():
            if bad in new_content:
                new_content = new_content.replace(bad, good)

        if new_content != content:
            with open(fn, 'w', encoding='utf-8') as f:
                f.write(new_content)
            count_total += 1
            print(f"Cleaned mojibake from: {fn}")
    except Exception as e:
        print(f"Error processing {fn}: {e}")

print(f"Total files cleaned: {count_total}")
