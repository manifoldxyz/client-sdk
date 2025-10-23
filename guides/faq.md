# FAQ

**Which networks are supported?**&#x20;

Ethereum (1), Base (8453), Optimism (10), Shape (360), Sepolia testnet.

**How do I check allowlist eligibility?**&#x20;

Call `product.`[`getAllocations`](../sdk/product/common/getallocations.md)`({ recipientAddress })`.

**What happens if a step fails?**&#x20;

Catch the error, show context to users, and allow retries. Transaction steps expose [`execute`](../sdk/transaction-steps/execute.md)`()`.

**Can I fetch multiple products?**&#x20;

Use `client.getProductsByWorkspace(workspaceId, options)`.

**Where do I file issues?**&#x20;

[GitHub Issues](https://github.com/manifoldxyz/client-sdk) or Manifold support.
