from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.lib.units import mm
import os
import textwrap


OUT = os.path.join("docs", "SmartMall_AutoShelf_30_Page_Plan.pdf")
W, H = landscape(A4)

NAVY = colors.HexColor("#17202A")
INK = colors.HexColor("#24313D")
MUTED = colors.HexColor("#63717E")
LINE = colors.HexColor("#DDE5EA")
PAPER = colors.HexColor("#F7FAFC")
TEAL = colors.HexColor("#008C86")
TEAL_DARK = colors.HexColor("#006B67")
ORANGE = colors.HexColor("#F06D2F")
YELLOW = colors.HexColor("#F3B33D")
GREEN = colors.HexColor("#1F9D55")
RED = colors.HexColor("#C73E3A")
BLUE = colors.HexColor("#3969C9")
PURPLE = colors.HexColor("#7752B8")


SOURCES = [
    ("Meta + Retailers Association of India, 2026 omnichannel shopping summary",
     "https://about.fb.com/news/2026/02/ai-fuels-indias-omnichannel-shopping-surge-meta-retailers-association-of-india/"),
    ("Bain, How India Shops Online 2025",
     "https://www.bain.com/insights/how-india-shops-online-2025/"),
    ("Google Merchant Center, local inventory listings in India",
     "https://support.google.com/merchants/answer/14615117?hl=en-IN"),
    ("GoFrugal ecommerce open API and POS ecommerce integration",
     "https://community.gofrugal.com/portal/en/kb/gofrugalretaileasy/ecommerce-integration/api-integration/articles/api-integration"),
    ("GoFrugal ecommerce integration and ONDC connection",
     "https://cdn.gofrugal.com/pos-ecommerce-integration.html"),
    ("Zoho Inventory item APIs and OAuth model",
     "https://www.zoho.com/inventory/api/v1/items/"),
    ("Zoho Marketplace and partner ecosystem",
     "https://marketplace.zoho.com/"),
    ("TallyPrime integration through XML, HTTP, ODBC, JSON",
     "https://help.tallysolutions.com/integration-with-tallyprime/"),
    ("Marg API Gateway for stock status, bills, invoices, orders",
     "https://margcompusoft.com/Package/Packages.aspx"),
    ("UrbanPiper downstream overview: middleware between aggregators and POS",
     "https://api-docs.urbanpiper.com/downstream/getting-started/overview"),
    ("Unicommerce omnichannel retail management and POS/ERP integrations",
     "https://unicommerce.com/blog/omnichannel-retail-management-system-guide-india/"),
    ("Swiggy FY25 annual report, Instamart dark-store operating model",
     "https://www.swiggy.com/corporate/wp-content/uploads/2025/07/Swiggy-Annual-Report-FY-2024-25.pdf"),
]


def wrap_lines(text, font="Helvetica", size=10.4, max_width=110 * mm):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        test = (current + " " + word).strip()
        if stringWidth(test, font, size) <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c, text, x, y, max_width, size=10.4, color=INK, leading=13, font="Helvetica"):
    c.setFillColor(color)
    c.setFont(font, size)
    for line in wrap_lines(text, font, size, max_width):
        c.drawString(x, y, line)
        y -= leading
    return y


def pill(c, x, y, w, h, text, fill, stroke=None, color=colors.white, size=9):
    c.setFillColor(fill)
    c.setStrokeColor(stroke or fill)
    c.roundRect(x, y, w, h, 4, fill=1, stroke=1)
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", size)
    c.drawCentredString(x + w / 2, y + h / 2 - size / 3, text)


def box(c, x, y, w, h, title, body=None, fill=colors.white, stroke=LINE, title_color=NAVY):
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.roundRect(x, y, w, h, 7, fill=1, stroke=1)
    c.setFillColor(title_color)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(x + 9, y + h - 17, title)
    if body:
        draw_wrapped(c, body, x + 9, y + h - 32, w - 18, 8.2, MUTED, 10)


def arrow(c, x1, y1, x2, y2, color=TEAL):
    c.setStrokeColor(color)
    c.setLineWidth(1.4)
    c.line(x1, y1, x2, y2)
    if x2 >= x1:
        c.line(x2, y2, x2 - 6, y2 + 3)
        c.line(x2, y2, x2 - 6, y2 - 3)
    else:
        c.line(x2, y2, x2 + 6, y2 + 3)
        c.line(x2, y2, x2 + 6, y2 - 3)


def header(c, page_num, title, subtitle=None):
    c.setFillColor(PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 19)
    c.drawString(18 * mm, H - 20 * mm, title)
    if subtitle:
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9.5)
        c.drawString(18 * mm, H - 26 * mm, subtitle)
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(18 * mm, H - 31 * mm, W - 18 * mm, H - 31 * mm)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8)
    c.drawRightString(W - 18 * mm, 10 * mm, f"SmartMall Connect Hub + AutoShelf | {page_num:02d}/30")


def footnote(c, text):
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.2)
    c.drawString(18 * mm, 10 * mm, text[:150])


def bullets(c, items, x=20 * mm, y=None, max_width=130 * mm, size=10.8, gap=7):
    if y is None:
        y = H - 42 * mm
    for item in items:
        c.setFillColor(TEAL)
        c.circle(x, y + 2, 2.2, fill=1, stroke=0)
        y = draw_wrapped(c, item, x + 7, y, max_width, size=size, leading=size + 3)
        y -= gap
    return y


def big_stat(c, x, y, value, label, color=TEAL):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(x, y, value)
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, y - 12, label)


def visual_cover(c):
    x, y, w, h = 167 * mm, 38 * mm, 105 * mm, 120 * mm
    c.setFillColor(colors.white)
    c.setStrokeColor(LINE)
    c.roundRect(x, y, w, h, 12, fill=1, stroke=1)
    c.setFillColor(TEAL_DARK)
    c.roundRect(x + 12, y + 20, w - 24, 60, 8, fill=1, stroke=0)
    for i, col in enumerate([ORANGE, YELLOW, BLUE, GREEN, PURPLE]):
        bx = x + 22 + i * 15 * mm
        c.setFillColor(col)
        c.roundRect(bx, y + 38, 10 * mm, 25 * mm, 3, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.rect(bx + 2, y + 43, 10 * mm - 4, 3, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(x + 15, y + h - 25, "POS Sync + Controlled Inventory")
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    c.drawString(x + 15, y + h - 40, "A practical system for reliable mall commerce")
    pill(c, x + 17, y + 14, 32 * mm, 9 * mm, "QR Scan", ORANGE)
    pill(c, x + 55 * mm, y + 14, 42 * mm, 9 * mm, "POS Bridge", TEAL)


def visual_layers(c, x=160 * mm, y=42 * mm):
    widths = [92, 74, 55]
    labels = [("AI Browse Shelf", "Discovered, not guaranteed", BLUE),
              ("Verified Shelf", "Checked today, reservable", YELLOW),
              ("Rapid Shelf", "Physically controlled, deliverable", TEAL)]
    for i, (title, body, col) in enumerate(labels):
        ww = widths[i] * mm
        yy = y + i * 28 * mm
        xx = x + (92 * mm - ww) / 2
        c.setFillColor(col)
        c.roundRect(xx, yy, ww, 20 * mm, 5, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(x + 46 * mm, yy + 12 * mm, title)
        c.setFont("Helvetica", 7.8)
        c.drawCentredString(x + 46 * mm, yy + 6 * mm, body)


def visual_pipeline(c, x=150 * mm, y=48 * mm):
    steps = [("Capture", "photo/video/barcode"), ("AI Draft", "OCR + matching"), ("Approve", "one tap"), ("Control", "QR shelf"), ("Sell", "reserve/deliver")]
    curx = x
    for i, (t, b) in enumerate(steps):
        box(c, curx, y + (i % 2) * 22 * mm, 30 * mm, 22 * mm, t, b, fill=colors.white)
        if i < len(steps) - 1:
            arrow(c, curx + 30 * mm, y + 11 * mm + (i % 2) * 22 * mm,
                  curx + 37 * mm, y + 11 * mm + ((i + 1) % 2) * 22 * mm)
        curx += 38 * mm


def visual_matrix(c, x=155 * mm, y=45 * mm):
    rows = [("Google / ONDC", "Discovery", "Weak control"), ("POS", "Billing", "No user demand"),
            ("Manual catalog", "Fast launch", "Stale stock"), ("SmartMall", "Physical proof", "Ops heavy")]
    c.setFont("Helvetica-Bold", 9)
    c.setFillColor(NAVY)
    c.drawString(x, y + 79 * mm, "Competitor reality")
    for i, (a, b, d) in enumerate(rows):
        yy = y + (58 - i * 17) * mm
        col = TEAL if a == "SmartMall" else colors.white
        txt = colors.white if a == "SmartMall" else INK
        c.setFillColor(col)
        c.setStrokeColor(LINE)
        c.roundRect(x, yy, 108 * mm, 13 * mm, 4, fill=1, stroke=1)
        c.setFillColor(txt)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(x + 5, yy + 8, a)
        c.setFont("Helvetica", 7.5)
        c.drawString(x + 43 * mm, yy + 8, b)
        c.drawString(x + 75 * mm, yy + 8, d)


def visual_delivery(c, x=154 * mm, y=50 * mm):
    labels = [("Order", ORANGE), ("Lock", TEAL), ("Pick", BLUE), ("Pack", YELLOW), ("Deliver", GREEN)]
    for i, (lab, col) in enumerate(labels):
        cx = x + i * 24 * mm
        c.setFillColor(col)
        c.circle(cx, y + 35 * mm, 10 * mm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 7.8)
        c.drawCentredString(cx, y + 35 * mm - 3, lab)
        if i < len(labels) - 1:
            arrow(c, cx + 10 * mm, y + 35 * mm, cx + 14 * mm, y + 35 * mm, NAVY)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(x, y, "Only Rapid Shelf gets a hard SLA")
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 8.5)
    c.drawString(x, y - 12, "Browse shelf is discovery. Verified shelf is reservation. Rapid shelf is delivery.")


def visual_data(c, x=150 * mm, y=39 * mm):
    entities = ["stores", "products", "inventory_units", "shelf_locations", "stock_events", "orders", "runner_scans"]
    coords = []
    for i, e in enumerate(entities):
        xx = x + (i % 2) * 58 * mm
        yy = y + (i // 2) * 27 * mm
        box(c, xx, yy, 48 * mm, 16 * mm, e, None, fill=colors.white)
        coords.append((xx, yy))
    for i in range(len(coords) - 1):
        x1, y1 = coords[i]
        x2, y2 = coords[i + 1]
        arrow(c, x1 + 48 * mm, y1 + 8 * mm, x2, y2 + 8 * mm, TEAL)


def visual_roadmap(c, x=145 * mm, y=42 * mm):
    phases = [("0-30d", "QR shelf pilot"), ("31-90d", "1000 SKUs"), ("3-6m", "delivery SLA"), ("6-12m", "sensors"), ("12m+", "RFID/POS")]
    for i, (p, b) in enumerate(phases):
        yy = y + (len(phases) - i - 1) * 22 * mm
        c.setFillColor(TEAL if i < 3 else colors.white)
        c.setStrokeColor(TEAL)
        c.roundRect(x + i * 10, yy, 92 * mm, 14 * mm, 5, fill=1, stroke=1)
        c.setFillColor(colors.white if i < 3 else NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x + 8 + i * 10, yy + 8, p)
        c.setFont("Helvetica", 8)
        c.drawString(x + 31 * mm + i * 10, yy + 8, b)


def visual_hardware(c, x=154 * mm, y=45 * mm):
    c.setFillColor(colors.white)
    c.setStrokeColor(LINE)
    c.roundRect(x, y, 110 * mm, 88 * mm, 8, fill=1, stroke=1)
    c.setFillColor(TEAL_DARK)
    c.rect(x + 12 * mm, y + 12 * mm, 86 * mm, 32 * mm, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.rect(x + 20 * mm, y + 25 * mm, 18 * mm, 14 * mm, fill=1, stroke=0)
    c.rect(x + 45 * mm, y + 25 * mm, 18 * mm, 14 * mm, fill=1, stroke=0)
    c.rect(x + 70 * mm, y + 25 * mm, 18 * mm, 14 * mm, fill=1, stroke=0)
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 12 * mm, y + 72 * mm, "SmartShelf kit")
    c.setFont("Helvetica", 8)
    c.setFillColor(MUTED)
    for i, t in enumerate(["QR shelf ID", "product QR/barcode", "phone scanner", "runner scan", "sensor upgrade later"]):
        c.drawString(x + 12 * mm, y + (62 - i * 7) * mm, "- " + t)


def visual_risk(c, x=154 * mm, y=45 * mm):
    risks = [("Stale stock", RED, "High"), ("Store laziness", ORANGE, "High"), ("Delivery cost", YELLOW, "Medium"),
             ("Theft/shrink", ORANGE, "Medium"), ("AI mistakes", YELLOW, "Medium"), ("Low demand", RED, "High")]
    for i, (r, col, sev) in enumerate(risks):
        xx = x + (i % 2) * 55 * mm
        yy = y + (i // 2) * 24 * mm
        c.setFillColor(col)
        c.roundRect(xx, yy, 48 * mm, 17 * mm, 5, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawString(xx + 5, yy + 10, r)
        c.setFont("Helvetica", 7.5)
        c.drawString(xx + 5, yy + 4, sev + " risk")


def visual_funnel(c, x=155 * mm, y=44 * mm):
    levels = [("Discovery", 100, BLUE), ("Search", 82, TEAL), ("Reserve", 62, YELLOW), ("Visit/Order", 44, ORANGE), ("Repeat", 30, GREEN)]
    for i, (lab, ww, col) in enumerate(levels):
        yy = y + (len(levels) - i - 1) * 19 * mm
        c.setFillColor(col)
        c.roundRect(x + (100 - ww) / 2 * mm, yy, ww * mm, 12 * mm, 4, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 8.5)
        c.drawCentredString(x + 50 * mm, yy + 4, lab)


def visual_stat_cards(c, x=153 * mm, y=49 * mm):
    cards = [("270M+", "online shoppers", TEAL), ("2.5x", "omnichannel spend", ORANGE),
             ("72%", "discovery on WhatsApp", BLUE), ("21%", "store-visit lift signal", GREEN)]
    for i, (v, lab, col) in enumerate(cards):
        xx = x + (i % 2) * 55 * mm
        yy = y + (i // 2) * 36 * mm
        c.setFillColor(colors.white)
        c.setStrokeColor(LINE)
        c.roundRect(xx, yy, 48 * mm, 27 * mm, 6, fill=1, stroke=1)
        c.setFillColor(col)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(xx + 7, yy + 15, v)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 8)
        c.drawString(xx + 7, yy + 7, lab)


def visual_ops(c, x=152 * mm, y=39 * mm):
    tasks = [("10:00", "open shelves"), ("11:00", "scan audit"), ("14:00", "runner sweep"),
             ("17:00", "peak delivery"), ("21:00", "close variance")]
    for i, (time, task) in enumerate(tasks):
        yy = y + (len(tasks) - i - 1) * 18 * mm
        c.setStrokeColor(LINE)
        c.line(x + 12 * mm, yy, x + 12 * mm, yy + 18 * mm)
        c.setFillColor(TEAL)
        c.circle(x + 12 * mm, yy + 8 * mm, 3, fill=1, stroke=0)
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x + 22 * mm, yy + 10 * mm, time)
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 8)
        c.drawString(x + 22 * mm, yy + 4 * mm, task)


def draw_visual(c, name):
    if name == "cover":
        visual_cover(c)
    elif name == "stats":
        visual_stat_cards(c)
    elif name == "layers":
        visual_layers(c)
    elif name == "pipeline":
        visual_pipeline(c)
    elif name == "matrix":
        visual_matrix(c)
    elif name == "delivery":
        visual_delivery(c)
    elif name == "data":
        visual_data(c)
    elif name == "roadmap":
        visual_roadmap(c)
    elif name == "hardware":
        visual_hardware(c)
    elif name == "risk":
        visual_risk(c)
    elif name == "funnel":
        visual_funnel(c)
    elif name == "ops":
        visual_ops(c)
    else:
        visual_layers(c)


PAGES = [
    ("SmartMall AutoShelf OS",
     "30-page execution plan: AI catalog creation with physically controlled inventory",
     ["Brutal thesis: do not build POS first, and do not depend on store owners to manually upload and update full stock.",
      "Winning idea: turn selected mall products into trusted online inventory through a controlled shelf, QR/barcode events, AI catalog generation, and runner delivery.",
      "This PDF is built as a practical rollout plan, not a fantasy deck. The hard part is operations, not the website."],
     "cover", "References across pages: Meta/RAI, Bain, Google, ONDC, Zomato, UrbanPiper, Swiggy, GS1, Focal, Amazon, Impinj."),
    ("1. The Big Decision",
     "Your smartmall idea is good only if the inventory trust problem is solved.",
     ["A normal website where stores upload products is launchable, but it will become stale fast.",
      "A full POS system is too slow, too crowded, and not needed for the first wedge.",
      "The best version is a marketplace website powered by a controlled SmartShelf layer. AI reduces catalog work; physical control makes stock reliable.",
      "Your main product is not catalog. It is certainty: this item exists, is reserved, and can be picked or delivered."],
     "layers", "No-sugar-coat position based on competitive analysis."),
    ("2. Market Signal",
     "Users already move between online discovery and physical stores.",
     ["Meta and RAI report that social media influences 77% of retail purchase decisions, and WhatsApp is becoming a commerce channel.",
      "Bain reports India had over 270 million online shoppers in 2024, with quick commerce and trend-first categories expanding beyond grocery.",
      "Google already supports local inventory listings in India, which proves nearby product discovery is a real demand area.",
      "Conclusion: demand exists, but you cannot win with a generic product listing site."],
     "stats", "Sources: Meta/RAI 2026, Bain 2025, Google Merchant Center."),
    ("3. The Core Problem",
     "Manual upload is not the real bottleneck. Stock truth is.",
     ["Stores may upload once, then forget. That creates dead products and broken trust.",
      "Shelf videos and AI can create listings quickly, but vision alone cannot guarantee exact sellable stock.",
      "Barcode scans identify a product, but they do not prove quantity unless each movement is tracked.",
      "The only safe promise is: products inside SmartMall-controlled inventory are deliverable; everything else is discovery or reservation only."],
     "risk", "This is the failure mode that kills local inventory marketplaces."),
    ("4. What Swiggy And Zomato Teach",
     "Food delivery and quick commerce solve different stock problems.",
     ["Food delivery platforms rely on menu availability. Restaurants can toggle items out of stock; POS integrations automate parts of this.",
      "Zomato exposes POS menu APIs including item stock status toggling. UrbanPiper's Swiggy integration supports menu sync, inventory snooze, order push, auto-acceptance, and store availability.",
      "Quick commerce is stricter: Instamart/Blinkit use dark stores or controlled micro-warehouses. That is why fast delivery works.",
      "MallMaze cannot promise Swiggy-like speed unless it controls a subset of inventory like a mini dark store."],
     "matrix", "Sources: Zomato Developer, UrbanPiper Swiggy integration, Swiggy shareholder letter."),
    ("5. The Winning Concept",
     "SmartMall AutoShelf: the mall store becomes a mini dark store.",
     ["Each store keeps selected SKUs in a SmartMall shelf, bin, rack, or counter zone.",
      "Items entering the zone are scanned or detected, listed automatically, and counted in a stock ledger.",
      "Users see only controlled items as Rapid Delivery. Other items can still be browsed, but with weaker labels.",
      "This turns the mall into a distributed fulfillment network without replacing store POS."],
     "hardware", "Positioning: distributed dark-store network inside existing malls."),
    ("6. The Three Inventory Layers",
     "Never use one availability label for all products.",
     ["AI Browse Shelf: created from photos, shelf video, invoices, WhatsApp lists, or POS exports. Label: Check with store.",
      "Verified Shelf: checked today by store or staff. Label: Verified today; eligible for reservation.",
      "Rapid Shelf: physically controlled, scanned, and allocated. Label: Rapid delivery; stock is locked when ordered.",
      "Only Rapid Shelf products should get fast delivery promises."],
     "layers", "Trust model inspired by local inventory and dark-store operations."),
    ("7. How Catalog Appears Without Manual Upload",
     "The store should not fill long forms.",
     ["Product identity comes from barcode, GS1/GTIN, AI image recognition, OCR on labels, supplier bills, and past catalog matching.",
      "The system creates a draft product card automatically: name, brand, image, category, variant, MRP/selling price suggestion, and confidence score.",
      "The store only approves exceptions: wrong title, price mismatch, unknown barcode, restricted item, or low confidence.",
      "This changes the work from data entry to quick approval."],
     "pipeline", "Sources: GS1 barcode standards; retail CV systems."),
    ("8. Capture Method 1: SmartShelf Entry Scan",
     "The practical first version.",
     ["When a store places an item in SmartShelf, staff scans the product barcode and shelf QR.",
      "If the barcode is known, SmartMall auto-fills the listing. If unknown, staff takes one photo and AI drafts the listing.",
      "Quantity is tracked by scan-in and scan-out events, not by memory.",
      "This is low-cost, fast to build, and much more reliable than manual upload."],
     "pipeline", "V1 recommendation: QR/barcode before expensive hardware."),
    ("9. Capture Method 2: Shelf Camera",
     "Useful for audits, not perfect for stock truth.",
     ["A fixed camera or phone on a stand can take periodic shelf images.",
      "Computer vision can detect empty slots, misplaced items, price tags, and product presence.",
      "Focal Systems reports near-real-time shelf monitoring and product availability detection, but this class of tech works best with controlled shelf layouts.",
      "Use camera evidence to flag mismatches; do not rely on it alone for exact paid stock."],
     "hardware", "Sources: Focal Systems availability monitoring; Amazon sensor fusion discussion."),
    ("10. Capture Method 3: Sensor Fusion",
     "The future kit combines camera, QR, weight, and RFID.",
     ["Camera sees the shelf. Barcode/QR identifies product. Weight sensor confirms quantity movement. RFID later reads items without line-of-sight.",
      "Amazon's Just Walk Out and Dash Cart use computer vision, sensor fusion, and deep learning for item recognition and receipt accuracy.",
      "For SmartMall, start smaller: shelf camera plus weight sensor per bin is enough for limited categories.",
      "Sensor fusion is the technical moat, but only after the QR shelf pilot proves demand."],
     "hardware", "Sources: Amazon Just Walk Out/Dash Cart, Impinj RFID."),
    ("11. Capture Method 4: RFID Later",
     "RFID is powerful, but it is not your starting point.",
     ["RAIN RFID can give item-level visibility and reduce counting labor, especially in apparel, footwear, and accessories.",
      "Impinj describes retail RFID as supporting real-time item visibility and omnichannel fulfillment with high accuracy.",
      "Problem: RFID needs tags, readers, process discipline, and cost approval. Small shops will not start here.",
      "Use RFID in Phase 3 for high-value or high-volume partners."],
     "layers", "Source: Impinj RAIN RFID retail."),
    ("12. Fast Delivery Model",
     "Do not promise 10-minute delivery for all mall products.",
     ["Rapid Shelf products: 30-60 minute local delivery or 10-20 minute mall pickup target.",
      "Verified Shelf products: reserve or deliver after store confirmation.",
      "Browse Shelf products: discovery only; no hard delivery SLA.",
      "Your Swiggy-like promise applies only where stock is physically controlled."],
     "delivery", "Bain notes quick commerce evolves into under-15-minute select items plus wider 1-hour assortment."),
    ("13. User Flow",
     "Make it feel simple, even if the backend is hard.",
     ["User opens SmartMall website, selects mall/location, searches products, and sees trust labels.",
      "Rapid Delivery item: user pays or reserves, stock locks immediately, QR/OTP is generated.",
      "Pickup item: user gets QR ticket with expiry. Store scans QR when user arrives.",
      "If stock fails, refund plus store reliability penalty. One bad stock promise costs trust."],
     "funnel", "User adoption depends on certainty and speed, not feature count."),
    ("14. Store Flow",
     "Make the store's job physical, not clerical.",
     ["Store chooses 20-50 products for SmartShelf. These should be fast-moving, high-margin, or seasonal.",
      "Staff places products in the SmartMall shelf/bin and scans them once.",
      "Store dashboard shows: products live, locked orders, scan-out needed, low stock, and earnings.",
      "No full catalog work. No GST billing. No POS replacement in v1."],
     "hardware", "Store adoption depends on low effort and visible sales."),
    ("15. Runner Flow",
     "The runner is your moving API between mall and customer.",
     ["Runner receives pickup task after order lock.",
      "Runner scans shelf, product, and order QR. This proves chain of custody.",
      "Packing desk scans handoff. Delivery partner scans pickup. Customer OTP closes delivery.",
      "Every scan creates a stock event, making the ledger stronger than manual updates."],
     "delivery", "Physical execution is the moat."),
    ("16. Inventory Ledger",
     "Treat stock as events, not a number someone edits.",
     ["Every unit has state: available, locked, picked, packed, delivered, returned, damaged, missing, expired.",
      "Every state change needs an actor: store staff, runner, admin, system, or customer.",
      "Never allow silent quantity edits on Rapid Shelf. Corrections must create audit events.",
      "This is how you prevent stock from becoming fiction."],
     "data", "Core database principle: event-sourced stock ledger."),
    ("17. Database Plan",
     "Your current schema needs store ownership and controlled inventory.",
     ["Add store_owner_id and store-scoped RLS so stores edit only their own products.",
      "Add product_master, catalog_items, inventory_units, shelf_locations, stock_events, reservations, runner_tasks, and delivery_handoffs.",
      "Add last_verified_at, source_type, confidence_score, trust_state, rapid_eligible, expires_at, and mismatch_count.",
      "The inventory table should represent truth only for controlled/verified states, not guessed shelf stock."],
     "data", "Implementation note for your Supabase backend."),
    ("18. Trust Labels",
     "Availability text must be honest.",
     ["Allowed labels: Rapid delivery, Held for you, Verified today, Recently seen, Check with store, Expired, Out of stock.",
      "Banned label in v1: In stock, unless the item is Rapid Shelf or freshly verified.",
      "Freshness decay: 24-48 hours lowers trust; 7 days lowers ranking; 14 days hides product.",
      "Wrong availability hurts store ranking automatically."],
     "risk", "Trust labels are product strategy, not just UI copy."),
    ("19. First Categories",
     "Start where controlled inventory is practical.",
     ["Best first: phone accessories, cosmetics, watches, bags, toys, gifts, packaged electronics accessories.",
      "Second wave: selected footwear sizes, sports items, premium stationery, small home goods.",
      "Avoid first: grocery, pharmacy, jewellery, full fashion catalog, fragile luxury, bulky items.",
      "The goal is 500-1000 trusted SKUs, not 50,000 stale products."],
     "layers", "Category discipline is crucial for survival."),
    ("20. The MVP",
     "Build the smallest system that proves stock control.",
     ["Website/PWA: mall search, product pages, trust labels, reserve/order flow, QR/OTP.",
      "Store PWA: scan product, scan shelf, approve AI listing, view orders, mark issue.",
      "Runner PWA: pickup queue, scan chain, handoff, delivery proof.",
      "Admin: catalog QA, mismatch dashboard, store reliability, refunds, delivery SLA."],
     "pipeline", "No POS, no native app, no loyalty system first."),
    ("21. Technical Architecture",
     "A buildable stack for your existing project.",
     ["Frontend: existing static/PWA can evolve into user, store, runner, and admin surfaces.",
      "Backend: Supabase Postgres, Storage for images, Edge Functions or backend API for stock events and webhooks.",
      "AI services: image OCR, product matching, duplicate detection, and confidence scoring through async jobs.",
      "Scanning: browser camera barcode/QR first; later hardware scanners and RFID readers."],
     "data", "Architecture is designed to avoid POS dependency."),
    ("22. Operations Setup",
     "The first 60 days are operational, not purely technical.",
     ["One mall, 15-25 stores, 500-1000 Rapid/Verified SKUs.",
      "One onboarding operator photographs and tags shelves. One runner handles in-mall pickups. One support/admin handles exceptions.",
      "Daily shelf audit: morning scan, afternoon mismatch check, evening close variance.",
      "Your first moat is process discipline."],
     "ops", "Pilot operating model."),
    ("23. Pricing Model",
     "Charge after value is visible.",
     ["Store onboarding free or low-cost during pilot.",
      "Revenue options: commission per completed order, delivery fee, small reservation fee, monthly shelf fee for serious stores.",
      "Do not sell heavy analytics first. Stores will pay for orders, visits, and reliability.",
      "Malls can pay later for tenant sales intelligence, live catalog, and footfall conversion data."],
     "funnel", "Practical pricing, not fantasy SaaS."),
    ("24. Store Pitch",
     "The exact pitch should be simple.",
     ["Do not say: upload your products daily.",
      "Say: keep 20-50 selected products in our SmartMall shelf and we sell/deliver them online.",
      "Say: no POS change, no full catalog work, no GST billing change, no complex dashboard.",
      "Say: you only scan products into the shelf and fulfill locked orders."],
     "hardware", "Adoption depends on effort being smaller than benefit."),
    ("25. User Pitch",
     "Users need a promise they instantly understand.",
     ["For users: shop mall products online, reserve or get fast delivery from verified mall shelves.",
      "Promote certainty: real store, real stock, real pickup, real delivery.",
      "Do not force app install. Use web plus WhatsApp confirmations in the first phase.",
      "The highest-converting use cases are urgent gifts, accessories, shoes, cosmetics, and event shopping."],
     "funnel", "User adoption depends on trust and convenience."),
    ("26. Competitive Strategy",
     "You do not beat Google, ONDC, or POS by copying them.",
     ["Google is strong at discovery. ONDC is strong at network listing. POS is strong at billing and back-office inventory.",
      "SmartMall's edge is physical mall execution: controlled shelf, chain-of-custody scans, runner network, reservation, and local delivery.",
      "If your system only lists products, others can beat you. If your system controls sellable mall stock, you become harder to replace.",
      "Your moat is not AI. It is AI plus physical process plus local density."],
     "matrix", "Strategic difference from existing systems."),
    ("27. Pilot Metrics",
     "Kill or continue based on hard numbers.",
     ["Continue only if: 20 stores onboarded, 500+ controlled SKUs, stock mismatch under 3-5%, cancellation under 8%, delivery under 60 minutes for 70%+ Rapid orders.",
      "Demand metrics: 300+ orders/reservations in 60 days, 20%+ repeat user intent, 5 stores willing to pay.",
      "Ops metrics: pickup scan compliance above 95%, daily shelf audit completion above 90%.",
      "If stores do not maintain shelves or users do not order, pivot before building more tech."],
     "stats", "The pilot should be judged brutally."),
    ("28. Risks And Counters",
     "This idea is better, but still risky.",
     ["Risk: shops use Rapid Shelf as normal shelf. Counter: mismatch penalties and shelf audits.",
      "Risk: delivery cost kills margin. Counter: start in 3-5 km radius and batch pickups.",
      "Risk: AI creates bad listings. Counter: confidence gates and admin QA for low-confidence products.",
      "Risk: users expect Amazon-level assortment. Counter: position Rapid Shelf as verified mall stock, not everything."],
     "risk", "Do not hide these risks from yourself."),
    ("29. Roadmap",
     "Build in layers, not as a giant platform.",
     ["0-30 days: QR shelf, store scan, user reservation, admin QA.",
      "31-90 days: 20 stores, 1000 SKUs, runner flow, refund/mismatch policy.",
      "3-6 months: rapid delivery, shelf camera audits, delivery batching, simple commissions.",
      "6-12 months: weight sensors, better AI product matching, mall analytics, select POS exports.",
      "12+ months: RFID for apparel/footwear, ONDC/Google feed exports, smart racks, multi-mall rollout."],
     "roadmap", "Roadmap optimizes for proof before complexity."),
]


# Updated v2 plan: hybrid POS integration first, Mini-POS fallback, Rapid Shelf guarantee.
PAGES = [
    ("SmartMall Connect Hub",
     "30-page execution plan: POS sync, Mini-POS fallback, and Rapid Shelf delivery",
     ["Brutal thesis: stores will not manually maintain full catalogs, and POS vendors will not help unless you bring merchants, money, or strategic value.",
      "Winning system: use existing POS where possible, SmartMall Mini-POS where POS is weak, and Rapid Shelf where fast delivery must be guaranteed.",
      "This plan does not depend on one perfect POS integration. It creates multiple paths to reliable listed inventory."],
     "cover", "Updated plan: SmartMall should become a retail UrbanPiper plus controlled inventory layer."),
    ("1. The Big Decision",
     "Your idea is strongest when SmartMall becomes the online sales layer for mall stores.",
     ["Do not build a full POS first. You will lose time fighting mature billing, tax, printer, barcode, accounting, and offline workflows.",
      "Do not rely on pure manual upload. Shops will upload once, forget stock, and destroy user trust.",
      "The practical answer is hybrid: POS sync for organized stores, Mini-POS for weak stores, Rapid Shelf for guaranteed fast delivery.",
      "Your promise should be selected reliable products, not every product in every store."],
     "layers", "No-sugar-coat foundation for the updated model."),
    ("2. PMF Reality",
     "Users and shops can adopt this, but only if the product removes effort and uncertainty.",
     ["Consumers already research online before buying offline; omnichannel behavior is real in India.",
      "Stores want sales and visibility, not another dashboard. Their adoption depends on low effort and visible orders.",
      "Users will not trust a mall catalog unless availability labels are honest and reservations work.",
      "The PMF wedge is not browsing. It is: find, reserve, pick up, or receive selected mall stock reliably."],
     "stats", "Sources: Meta/RAI 2026, Bain 2025, Google local inventory."),
    ("3. The Main Failure Point",
     "Stock accuracy is the company killer.",
     ["If a user travels or orders and the item is gone, SmartMall loses trust immediately.",
      "POS sync helps, but POS stock can still be wrong because staff may bill late, sell offline, map the wrong SKU, or keep stock in storage.",
      "Mini-POS helps weak stores, but only if every walk-in sale of listed products is captured.",
      "Rapid Shelf is needed for products where you promise fast delivery or high-confidence pickup."],
     "risk", "Stock truth must be designed, not assumed."),
    ("4. Store Segmentation",
     "Different stores need different stock sources.",
     ["Tier A stores: organized POS with API or strong export. Use POS connector and selected product publishing.",
      "Tier B stores: POS exists but poor stock discipline. Use POS feed plus daily confirmation and safety buffer.",
      "Tier C stores: weak or no POS. Use SmartMall Mini-POS only for listed products.",
      "Tier D products: fast delivery or high demand. Move them to Rapid Shelf with QR/barcode control."],
     "matrix", "One workflow for every store will fail."),
    ("5. Will POS Vendors Accept?",
     "Some will. Many will not care until stores ask for you.",
     ["POS vendors have no automatic reason to support a new marketplace. Integration creates support burden, liability, and data risk.",
      "They accept when you bring merchant demand, paid connector revenue, co-marketing, or retention value.",
      "Do not start by begging vendors. Start with stores, learn which POS they use, prove demand, then approach vendors.",
      "Your product must work even when a POS vendor ignores you."],
     "risk", "Business truth: technical possibility is not vendor motivation."),
    ("6. UrbanPiper Lesson",
     "UrbanPiper proves middleware works, but food is simpler than retail.",
     ["UrbanPiper sits between aggregators and restaurant POS systems for menu sync, item availability, orders, and store status.",
      "Food menus are easier: item name, price, modifiers, available or unavailable.",
      "Retail needs SKU, barcode, variants, size, color, batch, returns, damaged goods, walk-in sales, and reservations.",
      "Copy the middleware concept, not the restaurant data model."],
     "pipeline", "Source: UrbanPiper downstream overview and Swiggy/Zomato integration docs."),
    ("7. Final Architecture",
     "POS Connect Hub + Mini-POS + Rapid Shelf.",
     ["POS Connect Hub imports catalog, price, stock, and pushes orders where possible.",
      "Mini-POS tracks only SmartMall-listed products for stores without reliable POS integration.",
      "Rapid Shelf physically controls stock for fast delivery and strongest availability claims.",
      "Together: POS sync gives scale, Mini-POS gives fallback, Rapid Shelf gives trust."],
     "layers", "This is the updated core system."),
    ("8. POS Connect Hub",
     "Build your own retail middleware layer.",
     ["Inbound from POS: SKU, barcode, product name, category, price, tax, stock, variants, images if available, location, last updated.",
      "Outbound to POS: reservation, order, cancellation, refund, pickup, delivery status, and stock adjustment where supported.",
      "The store chooses which POS products appear on SmartMall. Do not publish the whole POS catalog by default.",
      "Every connector normalizes messy POS data into one SmartMall product model."],
     "data", "SmartMall Connect Hub is the retail UrbanPiper-style layer."),
    ("9. Connector Ladder",
     "Do not depend on one integration method.",
     ["Level 1: direct API and OAuth for systems like GoFrugal, Zoho, Shopify POS, Marg where available.",
      "Level 2: scheduled CSV, Excel, Google Sheet, SFTP, or export feed for systems without API.",
      "Level 3: local Windows sync agent for desktop POS and Tally-style local systems.",
      "Level 4: Mini-POS fallback when POS access is unavailable or stock discipline is poor."],
     "pipeline", "Different OS is less important than data access."),
    ("10. Good POS Store Flow",
     "Organized stores should not re-enter product data.",
     ["Store connects POS or uploads a POS feed.",
      "SmartMall imports product list, stock, price, SKU, and variants.",
      "Store selects listed products: best sellers, offers, high margin, seasonal, or fast-moving items.",
      "SmartMall syncs stock and subtracts reservations plus safety buffer before showing availability."],
     "pipeline", "This is the primary workflow for capable stores."),
    ("11. Weak POS Store Flow",
     "Poor POS stores need a narrow SmartMall Mini-POS, not a full POS replacement.",
     ["Store adds only the products it wants to sell on SmartMall.",
      "Opening stock is entered once, then SmartMall orders reduce stock automatically.",
      "Walk-in sales of listed products must be marked with one tap or QR/barcode scan.",
      "If staff do not update stock, product trust decays and listings are hidden."],
     "hardware", "Mini-POS is a listed-product stock console, not full accounting."),
    ("12. Product Selection",
     "Let stores publish selected POS products, not all products.",
     ["Publishing everything creates bad search, weak stock, and operational mess.",
      "Stores should list 20-200 products first: fast movers, offers, new arrivals, event items, and high-margin SKUs.",
      "SmartMall should recommend products from POS data: high sales velocity, good margin, enough stock, and low return risk.",
      "The store approves the final list with checkboxes."],
     "funnel", "Selected inventory is more reliable than full inventory."),
    ("13. Stock Reliability Formula",
     "Never expose raw POS stock directly.",
     ["SmartMall sellable stock = POS stock - SmartMall reservations - safety buffer - stale-sync penalty.",
      "If POS stock is 1 or 2, show Low stock: confirm instead of instant order.",
      "If sync is stale, reduce confidence or hide from high-trust results.",
      "If an item has repeated mismatch reports, require Rapid Shelf or daily confirmation."],
     "data", "The formula protects users from POS inaccuracies."),
    ("14. Trust Labels",
     "Availability must tell the truth.",
     ["Rapid Shelf: physically controlled and eligible for fast delivery.",
      "POS synced: synced recently, available with safety buffer.",
      "Mini-POS managed: store tracks listed stock inside SmartMall.",
      "Low stock: confirm, Stock stale, Check with store, Out of stock."],
     "layers", "Trust labels are a marketplace quality system."),
    ("15. Write-Back Strategy",
     "Start read-only, then write orders carefully.",
     ["Phase 1: read products, stock, and price. Create SmartMall reservations internally.",
      "Phase 2: push online orders or sales orders into POS where API supports it.",
      "Phase 3: sync cancellations, returns, refunds, and completed pickups.",
      "Write-back is high-risk. Bad writes break billing, tax, inventory, and merchant trust."],
     "risk", "Read-only first reduces integration blast radius."),
    ("16. Mini-POS Rules",
     "Mini-POS only works if behavior is enforced.",
     ["Every listed product needs opening stock, stock-in, SmartMall sale, walk-in sale, return, damaged, and missing events.",
      "Daily close asks staff to confirm listed stock. Missed confirmation lowers trust.",
      "Repeated wrong stock lowers store ranking and removes Rapid/Verified badges.",
      "Good accuracy boosts ranking and gives the store more visibility."],
     "ops", "Mini-POS needs incentives and penalties."),
    ("17. Rapid Shelf Guarantee",
     "For fast delivery, POS sync is not enough.",
     ["Rapid Shelf products are physically separated in a SmartMall shelf, bin, rack, or counter zone.",
      "Items are scanned into the zone and scanned out only for orders, walk-in release, damage, or return.",
      "Only Rapid Shelf gets hard fast-delivery promises.",
      "This creates mini dark-store behavior inside existing mall stores."],
     "hardware", "Controlled inventory is the guarantee layer."),
    ("18. Fast Delivery Model",
     "You can be Swiggy-like only for controlled stock.",
     ["Rapid Shelf: 30-60 minute local delivery or 10-20 minute mall pickup target.",
      "POS synced: reserve or deliver after store confirmation depending on stock confidence.",
      "Mini-POS: eligible if stock was confirmed today and safety buffer is available.",
      "Browse-only products: discovery, no hard delivery promise."],
     "delivery", "Speed without control creates cancellations."),
    ("19. OS And Device Reality",
     "Different POS operating systems are manageable; closed data is the hard part.",
     ["Cloud/web POS: API or OAuth connector.",
      "Windows desktop POS: local sync agent, XML/HTTP, ODBC, export folder, or vendor API.",
      "Android POS: vendor cloud API or export; you cannot simply read another app's database.",
      "Offline POS: sync lag means lower trust labels and larger safety buffers."],
     "matrix", "Data access matters more than device type."),
    ("20. Security And Consent",
     "Stores and POS vendors will worry about data.",
     ["Use merchant-authorized OAuth/API keys where possible.",
      "Ask for least privilege: product, price, stock, order write only when needed.",
      "Do not read full profit, customer history, or sensitive reports unless a paid analytics product requires it.",
      "Maintain audit logs for every connector sync and stock write."],
     "data", "Trust with stores starts with limited data access."),
    ("21. Onboarding Playbook",
     "Do not over-engineer before you know the local POS mix.",
     ["Visit 20 stores in one mall and record their POS, product category, SKU quality, stock discipline, and willingness to list.",
      "Start with one direct connector, one CSV feed path, and Mini-POS fallback.",
      "Onboard products yourself for the first stores if needed, then train staff.",
      "Measure actual stock mismatch before expanding."],
     "ops", "The first mall is research plus operations."),
    ("22. POS Vendor Pitch",
     "Do not approach vendors empty-handed.",
     ["Weak pitch: please integrate with our new website.",
      "Strong pitch: stores using your POS are asking to sell through SmartMall; we can bring online orders and connector revenue.",
      "Offer: certified POS badge, co-marketing, connector fee share, and lower support burden through documented flows.",
      "If they refuse, keep using API, exports, local agent, or Mini-POS."],
     "funnel", "Vendor acceptance follows merchant demand."),
    ("23. Store Pitch",
     "Stores must hear sales, not software.",
     ["Keep your existing POS. Select products you want to sell online.",
      "If your POS supports sync, we import stock. If not, use our Mini-POS only for listed products.",
      "For fastest delivery, place selected products in Rapid Shelf.",
      "We bring online visibility, reservations, pickup, and local delivery."],
     "hardware", "This pitch removes fear of POS replacement."),
    ("24. User Pitch",
     "Users should not know the backend complexity.",
     ["Browse real products from mall stores.",
      "See honest availability: Rapid Shelf, POS synced, Mini-POS managed, low stock, or check with store.",
      "Reserve before visiting or get fast delivery for controlled products.",
      "If stock is wrong, refund and store penalty are clear."],
     "funnel", "User trust comes from simple, honest labels."),
    ("25. Data Model",
     "Use stock events, not editable magic numbers.",
     ["Core tables: stores, pos_connections, pos_products, catalog_items, inventory_sources, reservations, stock_events, rapid_shelf_units, orders, connector_sync_logs.",
      "Every quantity change should have source, actor, timestamp, and reason.",
      "Store-scoped permissions are mandatory: a store edits only its own products and stock.",
      "Connector health and sync freshness should affect product ranking."],
     "data", "This maps directly to Supabase work later."),
    ("26. Pilot Scope",
     "The first version must be narrow enough to become reliable.",
     ["One mall, 20 stores, 500-1000 selected products, 100-200 Rapid Shelf products.",
      "Start categories: phone accessories, cosmetics, bags, watches, toys, gifts, selected footwear, small electronics accessories.",
      "Avoid first: grocery, pharmacy, jewellery, full fashion catalog, bulky appliances, fragile luxury.",
      "Use one runner and one onboarding/operator person in the pilot."],
     "roadmap", "Category discipline improves stock reliability."),
    ("27. Success And Kill Metrics",
     "Use hard numbers, not hope.",
     ["Continue if 70%+ listed products come from POS sync, Mini-POS, or Rapid Shelf instead of loose manual upload.",
      "Stock mismatch under 5%, cancellation under 8%, and Rapid Shelf delivery under 60 minutes for 70%+ of eligible orders.",
      "At least 300 reservations/orders in 60 days, 25%+ repeat search/reserve behavior, and 5 stores willing to pay.",
      "Kill or pivot if stores refuse stock discipline or users stop trusting availability."],
     "stats", "This is the PMF gate."),
    ("28. Roadmap",
     "Build the connector business in stages.",
     ["0-30 days: CSV/import, Mini-POS, basic selected product publishing, internal reservations.",
      "31-90 days: GoFrugal or Zoho connector, Rapid Shelf pilot, runner workflow, mismatch penalties.",
      "3-6 months: Tally/Marg/local agent path, POS write-back for orders, delivery batching.",
      "6-12 months: vendor partnerships, connector marketplace, advanced analytics, RFID/sensor pilots only where paid demand exists."],
     "roadmap", "Final stance: POS sync for scale, Mini-POS for coverage, Rapid Shelf for guarantees."),
]


def draw_references_page(c):
    header(c, 30, "30. Final Recommendation + References", "Sources used for the plan and competitive reality check")
    y = H - 43 * mm
    c.setFillColor(NAVY)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(20 * mm, y, "Primary references")
    c.setFillColor(ORANGE)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(170 * mm, y, "Final recommendation")
    draw_wrapped(c, "Build SmartMall as a retail connector layer first: POS sync for organized stores, Mini-POS for weak stores, and Rapid Shelf for guaranteed fast delivery. Do not depend on POS vendor goodwill before merchant demand exists. Prove store demand, then use that demand to win vendor partnerships.", 170 * mm, y - 12 * mm, 88 * mm, 9.3, INK, 12)
    y -= 10 * mm
    for idx, (name, url) in enumerate(SOURCES, 1):
        col = 0 if idx <= 6 else 1
        row = idx - 1 if idx <= 6 else idx - 7
        x = 22 * mm + col * 132 * mm
        yy = y - row * 20 * mm
        c.setFillColor(TEAL)
        c.setFont("Helvetica-Bold", 8.2)
        c.drawString(x, yy, f"{idx}. {name}")
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 7.2)
        c.drawString(x + 3 * mm, yy - 8, url[:88])
        try:
            c.linkURL(url, (x + 3 * mm, yy - 9, x + 118 * mm, yy), relative=0)
        except Exception:
            pass
    c.setFillColor(TEAL_DARK)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, 36 * mm, "Strategic line")
    draw_wrapped(c, "Do not compete as a generic product catalog. Compete as the middleware that converts existing mall-store POS and selected controlled stock into reliable online inventory.", 20 * mm, 29 * mm, 130 * mm, 10, INK, 13)


def make_pdf():
    c = canvas.Canvas(OUT, pagesize=landscape(A4))
    c.setTitle("SmartMall Connect Hub + AutoShelf - 30 Page Plan")
    c.setAuthor("Codex")

    for idx, (title, subtitle, items, visual, note) in enumerate(PAGES, 1):
        header(c, idx, title, subtitle)
        if idx == 1:
            c.setFillColor(NAVY)
            c.setFont("Helvetica-Bold", 32)
            c.drawString(18 * mm, H - 58 * mm, "SmartMall Connect Hub")
            c.setFillColor(TEAL)
            c.setFont("Helvetica-Bold", 17)
            c.drawString(18 * mm, H - 71 * mm, "POS sync + Mini-POS fallback + Rapid Shelf")
            c.setFillColor(MUTED)
            c.setFont("Helvetica", 10)
            c.drawString(18 * mm, H - 83 * mm, "A no-sugar-coat 30-page founder plan for reliable mall commerce.")
            bullets(c, items, 22 * mm, H - 103 * mm, 115 * mm, 11, 8)
        else:
            bullets(c, items, 22 * mm, H - 45 * mm, 118 * mm, 10.4, 7)

        draw_visual(c, visual)
        footnote(c, note)
        c.showPage()

    draw_references_page(c)

    c.save()


if __name__ == "__main__":
    make_pdf()
    print(OUT)
