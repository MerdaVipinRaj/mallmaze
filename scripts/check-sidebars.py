import re

files = [
    'dashboard.html',
    'store-dashboard.html',
    'orders.html',
    'pos-orders.html',
    'inventory.html',
    'payments.html',
    'customers.html',
    'statistics.html',
    'profit-loss.html',
    'reports.html'
]

for fn in files:
    try:
        with open(fn, 'r', encoding='utf-8') as f:
            c = f.read()
        m = re.search(r'<aside[^>]*class=["\'][^"\']*sidebar[^"\']*["\'][^>]*>.*?</aside>', c, flags=re.DOTALL)
        print(f'{fn}: {"FOUND" if m else "NOT FOUND"}')
    except Exception as e:
        print(f'{fn}: ERROR {e}')
