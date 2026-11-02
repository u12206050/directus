---
'@directus/api': patch
---

Fixed batch updates and upserts emitting their items' actions before the transaction was committed, so action hooks read the items' old values and ran for batches that were rolled back
