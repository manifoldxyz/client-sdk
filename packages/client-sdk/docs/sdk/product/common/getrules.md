# getRules

**getRules()** → ProductRule

Retrieves the product rules, such as start and end dates, maximum tokens per wallet, audience restrictions, and more.

#### Returns: ProductRule

| Field               | Type   | Required | Description                                        |
| ------------------- | ------ | -------- | -------------------------------------------------- |
| startDate           | Date   | ❌        | Start date (if not provided, start immediately)    |
| endDate             | Date   | ❌        | End date (if not provided, the product never ends) |
| audienceRestriction | enum   | ✅        | allowlist \| none                                  |
| maxPerWallet        | number | ❌        | Number of allowed purchased per wallet             |

**AudienceRestriction**

* `allowlist`: The product is restricted to specific wallet addresses.
* `none`: The product has no audience restrictions.

