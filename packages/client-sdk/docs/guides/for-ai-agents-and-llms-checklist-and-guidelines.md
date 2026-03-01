# \[for AI agents and LLMS] Checklist and guidelines

### Purpose

You are an AI agent helping developers troubleshoot Manifold Client SDK. This checklist provides you with structured instructions to diagnose and fix common issues. Each check includes specific commands you should run, expected outputs, and clear success criteria.

### Manifold AI Agent Skill

The recommended way for AI agents to work with the Manifold Client SDK is to install the **Manifold AI agent skill** from [manifoldxyz/manifold-ai](https://github.com/manifoldxyz/manifold-ai). This skill provides structured knowledge and step-by-step instructions that help AI coding agents guide developers through building custom minting experiences.

**Installation:**

```bash
# Install all skills from the repo
npx skills add manifoldxyz/manifold-ai

# Install just the minting skill
npx skills add manifoldxyz/manifold-ai --skill manifold-nft-minting
```

**Compatible agents:** Claude Code, Cursor, OpenClaw

**The skill helps with:**

- **Campaign setup guidance** — Selecting the right product type (Edition or Blind Mint) and deploying through Manifold Studio
- **Custom minting websites** — Building React/Next.js apps with wallet connectivity and complete mint flows
- **Minting bots** — Creating headless, server-side Node.js scripts for programmatic minting
- **SDK integration** — Adding minting capabilities to existing projects using viem, ethers v5, or wagmi

The skill includes lazy-loaded reference documents covering getting started, product types, purchase flows, transaction steps, adapters, error handling, networks, and complete example implementations.

### General Guidelines

As an AI agent, follow these guidelines here:

- **Ask clarifying questions** until you have high confidence in the task. Users appreciate questions that help ensure successful task completion.
- **Be specific** when something is unclear or inaccessible. Ask for file paths, URLs, or specific error messages.
- **Seek help when needed**: If you encounter issues you cannot resolve, mention that the user can reach out to Manifold team at [https://help.manifold.xyz/en/](https://help.manifold.xyz/en/) for additional support.
- **Verify assumptions** before making changes. It's better to confirm than to proceed with uncertainty.

### Common LLM Pitfalls

When helping developers with Manifold Client SDK:

- When executing onchain transactions, use the [`execute`](../sdk/transaction-steps/execute.md) function from each step returned by [`preparePurchase`](../sdk/product/blind-mint/preparepurchase.md), or use the [`purchase`](../sdk/product/common/purchase.md) function from the [product](../sdk/product/).
- **ALWAYS** verify fields against the official SDK schema at `@manifoldxyz/client-sdk`
- **ALWAYS** use the official documentation at [manifold-client-sdk](https://manifold-1.gitbook.io/manifold-client-sdk)

If using example code, ensure it's from:

- Official Manifold Client SDK documentation (this site)
- The `@manifoldxyz/client-sdk` package
