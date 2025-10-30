# FAQ

<details>

<summary><strong>Which networks are supported?</strong> </summary>

Ethereum (1), Base (8453), Optimism (10), Shape (360), Sepolia testnet.

</details>

<details>

<summary><strong>How do I check allowlist eligibility?</strong> </summary>

Call `product.`[`getAllocations`](../sdk/product/common/getallocations.md)`({ recipientAddress })`.

</details>

<details>

<summary><strong>What happens if a step fails?</strong> </summary>

Catch the error, show context to users, and allow retries. Transaction steps expose [`execute`](../sdk/transaction-steps/execute.md)`()`.

</details>

<details>

<summary><strong>Where do I file issues?</strong> </summary>

[GitHub Issues](https://github.com/manifoldxyz/client-sdk) or Manifold support.

</details>
