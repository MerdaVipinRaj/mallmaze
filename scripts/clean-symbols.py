import os, re, glob

# List of files to clean up
html_files = glob.glob("*.html")
js_files = glob.glob("assets/js/*.js")
all_files = html_files + js_files

replacements = [
    # Broken storefront / arrows
    ("ðŸŒ  Storefront / Home", "Online Storefront"),
    ("ðŸŒ Storefront / Home", "Online Storefront"),
    ("Storefront / Home", "Online Storefront"),
    ("ðŸŒ ", ""),
    ("â†’", "&rarr;"),
    ("â†", "&larr;"),
    ("â†’", "&rarr;"),
    ("->", "&rarr;"),
    ("â‚¹", "₹"),
    ("â‚", "₹"),
    # Mangled checkmarks and status
    ("âœ”", "✓"),
    ("âœ…", "✓"),
    ("âœ", "✓"),
    ("â— ", "•"),
    ("â—", "•"),
    ("â€¢", "•"),
    ("Â·Â·Â·", "…"),
    ("Â·", "•"),
    ("Āš¡", ""),
    ("Āš", ""),
    # Broken emojis in orders
    ("ðŸ›µ Online App", "Online App"),
    ("ðŸ›µ", ""),
    ("ðŸ› ï¸  In-Store POS", "In-Store POS"),
    ("ðŸ› ï¸", ""),
    ("ðŸ›", ""),
    ("ðŸ“¦", ""),
    ("ðŸŸ¢", "●"),
    ("ðŸ”´", "●"),
    ("ðŸ”¥", "★"),
    ("âš ï¸", "⚠"),
    ("âš ", "⚠"),
    ("ðŸŽ¯", "🎯"),
    ("ðŸ“Š", "📊"),
    ("ðŸ’°", "💰"),
    ("ðŸ‘‘", "👑"),
    ("ðŸ”", "🔍"),
    ("â˜†", "☆"),
    ("â˜…", "★"),
]

for filepath in all_files:
    try:
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        changed = False
        for bad, good in replacements:
            if bad in content:
                content = content.replace(bad, good)
                changed = True

        if changed:
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Cleaned symbols in: {filepath}")
    except Exception as e:
        print(f"Error cleaning {filepath}: {e}")

print("Symbol cleanup complete!")
