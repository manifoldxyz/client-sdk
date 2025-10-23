# Blind Mint

Blind Mints offer randomized, gacha-style minting.

Follow [this guide](https://help.manifold.xyz/en/articles/9449681-serendipity) to create a Blind Mint product.

This data is returned when calling the [getProduct](../../manifold-client/getproduct.md) method

#### Handling different configurations

A Blind Mint product can be created or updated with various configurations:

* **Price:** Can be set in ETH.
* **Total Supply:** Can be unlimited or limited.
* **Start/End Date:** Defines the timeline for the drop.
* **Audience:**
  * **anyone:** Anyone can purchase.

The SDK provides convenient methods to handle these configurations:

[preparePurchase](../edition-product/preparepurchase.md)

Performs all necessary checks to ensure the purchase is valid and throws appropriate errors if any validation fails.

**Examples of Thrown Errors:**

* `ErrorCode.NOT_STARTED` — The product start date is in the future.
* `ErrorCode.ENDED` — The product end date has passed.
* `ErrorCode.SOLD_OUT` — The product is sold out (based on total supply).
* `ErrorCode.INSUFFICIENT_FUNDS` — The account does not have enough ETH for the purchase.

[getStatus](../common/getstatus.md)

Useful for displaying the current product status (e.g., `active`, `upcoming`, `sold-out`, `ended`).

[getAllocations](../common/getallocations.md)

Useful for showing the total quantity an [account](../../../reference/account.md) is eligible to purchase.
