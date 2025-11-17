# Client SDK Roadmap

This roadmap outlines what the Manifold SDK team is currently developing, what’s coming next, and what’s planned for the future. It’s designed to provide transparency into priorities, progress, and areas where external contributors can make meaningful impact.

**How to read this**

- **Now** → Active development or near completion.
- **Next** → In queue; dependent on current work and community feedback.
- **Later** → Larger initiatives or features that depend on upstream milestones or ecosystem maturity.
- Each item includes **Why**, **What**, **Status/Target**, and **Community** (how others can get involved).

**How to contribute**

- Choose a roadmap item labeled as a good **Community** fit.
- Open a GitHub issue titled: `Roadmap: <item> — Contribution Proposal`.
- Include goals, technical approach, deliverables, estimated timeline, and how progress will be demonstrated.
- The Manifold SDK team will **review and collaborate** — providing design feedback, SDK guidance, and integration help.
- Documentation, examples, and guides are open-source — PRs are always welcome.

---

## Now

- ### Edition Product: Multi-Currency & Cross-Chain Payments
  - **Why**: Enable seamless purchasing experiences for users paying in different currencies or networks.
  - **What**: Integrate **Relay** to support automatic ETH/ERC-20 conversions across same or cross-chain payments, letting users pay with any asset or chain they prefer.
  - **Status/Target**: **Mid-November 2025**.
  - **Community**: Help test integration across popular frameworks (Next.js, Remix).

- ### Edition Product: Claim Codes
  - **Why**: Allow purchasing of Edition product that was configured with **[Claim Codes](https://help.manifold.xyz/en/articles/9590408-claim-codes)**.
  - **What**: Add support for claim-code-based purchases.
  - **Status/Target**: **Mid-November 2025**.

---

## Next

- ### React Components (Checkout Flow)
  - **Why**: Simplify integration for React developers building on Manifold.
  - **What**: Provide prebuilt React components for minting and product display for Edition and Blind Mint product, designed for easy embedding and customization.
  - **Status/Target**: **End of November 2025**.
  - **Community**: Help test integration across popular frameworks (Next.js, Vite, Remix).

- ### Mint Button & Product Display Widgets
  - **Why**: Reduce setup friction for creators and non-technical users.
  - **What**: Offer lightweight embeddable widgets (via script or iframe) that enable minting and product display without code.
  - **Status/Target**: **Early December 2025**.
  - **Community**: Collecting feedback on embed customization and accessibility.

---

## Later

- ### Product Creation SDKs
  - **Why**: Developers increasingly want to create and manage products (Edition, Blind Mint, etc.) programmatically.
  - **What**: Define and release an SDK spec to support full product creation flows, including configuration, deployment, and metadata management.
  - **Status/Target**: **End of December 2025**.
  - **Community**: **Great opportunity** for early adopters — help shape the spec, test the API, and validate developer ergonomics.

---

## Community focus areas

If you’re looking to get involved, these are great entry points for collaboration and contribution:

- **Product Creation SDKs** — Review and propose API shapes, code examples, and early SDK implementations.
- **React Component Library** — Extend UI primitives, add themes, or build integration demos.
- **Widgets & Embeds** — Suggest customization options and publish examples for creative use cases.

**How to start**

1. Open an issue titled `Roadmap: <item> — Contribution Proposal`.
2. Include your problem statement, proposed solution, milestones, and demo plan.
3. The SDK team will provide feedback and assign a point of contact for collaboration.

---

_This roadmap is a living document — priorities may evolve based on community input, adoption, and ecosystem progress._
