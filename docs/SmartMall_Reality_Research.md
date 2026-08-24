# SmartMall Reality Research

## Direct take

The idea is viable only as a narrow reliability wedge first. A broad mall catalog without stock discipline will look impressive and then collapse through cancellations, wasted visits, and angry stores.

SmartMall should behave like a retail middleware layer plus a controlled inventory operator:

- Use POS/API sync where the store is mature.
- Use CSV, Sheet, SFTP, or export feeds where APIs are unavailable.
- Use a local Windows/Tally-style agent only when the merchant accepts install and support overhead.
- Use Mini-POS for listed products only when store staff will record walk-in sales.
- Use Rapid Shelf for any hard 30-60 minute delivery promise.

## What the research says

- GoFrugal exposes ecommerce APIs for item/rate/stock and sales orders, so capable stores can avoid duplicate catalog entry.
- Zoho Inventory exposes item APIs with SKU, item details, and location stock fields through OAuth-scoped endpoints.
- TallyPrime can integrate through XML over HTTP and ODBC-style access, but it requires local Tally configuration and a loaded company. That is not a casual web OAuth flow.
- Google local inventory listings require strict product/store inventory data such as IDs, store codes, availability, and price. That supports SmartMall's trust-label design.
- UrbanPiper proves the middleware pattern, but restaurant menus are simpler than retail SKUs, variants, damaged goods, returns, reservations, and shelf control.
- Unicommerce proves omnichannel inventory/order routing is already a serious category. SmartMall cannot win by saying "we sync inventory" alone.

## Build implication

The product should stop selling "everything in the mall online" and sell "selected reliable mall stock." The first pilot should win trust, not SKU count.

## Non-negotiable pilot gates

- 70% or more of listed products must come from POS sync, Mini-POS confirmation, or Rapid Shelf.
- Stock mismatch must stay under 5%.
- Cancellation must stay under 8%.
- Rapid Shelf delivery must hit under 60 minutes for 70% or more of eligible orders.
- At least five stores must be willing to pay or commit operational labor after the pilot.

## Sources

- GoFrugal API integration: https://community.gofrugal.com/portal/en/kb/gofrugalretaileasy/ecommerce-integration/api-integration/articles/api-integration
- Zoho Inventory Items API: https://www.zoho.com/inventory/api/v1/items/
- TallyPrime integration: https://help.tallysolutions.com/integration-with-tallyprime/
- Google local inventory data specification: https://support.google.com/merchants/answer/14819809?hl=en-IN
- UrbanPiper downstream overview: https://api-docs.urbanpiper.com/downstream/getting-started/overview
- Unicommerce omnichannel retail management: https://unicommerce.com/products/omnichannel-retail-management-system/
