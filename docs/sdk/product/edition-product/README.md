# Edition Product

Follow [this guide](https://help.manifold.xyz/en/articles/9387344-create-an-edition-open-or-limited) to create an Edition product.

This data is returned when calling the [getProduct](../../manifold-client/getproduct.md) method.

#### Handling different configurations

An Edition product can be created or updated with various configurations:

* **Price:** Can be set in ETH or any ERC-20 token.
* **Total Supply:** Can be unlimited or limited.
* **Supply per Wallet:** The number of tokens a single wallet can mint.
* **Start/End Date:** Defines the timeline for the drop.
* **Audience:**
  * **anyone:** Anyone can purchase.
  * **allowlist:** Only a predefined list of wallet addresses can purchase.



The SDK provides convenient methods to handle these configurations:

[preparePurchase](preparepurchase.md)

Performs all necessary checks to ensure the purchase is valid and throws appropriate errors if any validation fails.

**Examples of Thrown Errors:**

* `ErrorCode.NOT_STARTED` — The product start date is in the future.
* `ErrorCode.ENDED` — The product end date has passed.
* `ErrorCode.SOLD_OUT` — The product is sold out (based on total supply).
* `ErrorCode.NOT_ELIGIBLE` — The recipient is not on the allowlist.
* `ErrorCode.INVALID_INPUT` — The desired purchase quantity exceeds the per-wallet limit or total supply.
* `ErrorCode.INSUFFICIENT_FUNDS` — The account does not have enough ETH or ERC-20 tokens for the purchase.

[getStatus](../common/getstatus.md)

Useful for displaying the current product status (e.g., `active`, `upcoming`, `sold-out`, `ended`).

[getAllocations](../common/getallocations.md)

Useful for showing the total quantity an [account](../../../reference/account.md) is eligible to purchase.
