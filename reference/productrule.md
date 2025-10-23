# ProductRule

| Field                   | Type   | Required | Description                                     |
| ----------------------- | ------ | -------- | ----------------------------------------------- |
| startDate               | Date   | ❌        | Start date (if not provided, start immediately) |
| endDate                 | Date   | ❌        | End date (not provided, never ends)             |
| **audienceRestriction** | enum   | ✅        | `allowlist`                                     |
| maxPerWallet            | number | ❌        | Number of allowed purchased per wallet          |
