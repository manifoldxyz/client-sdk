# Manifold Client SDK Monorepo

This repository is now managed as a pnpm workspace powered by Turborepo. It contains:

- `@manifoldxyz/client-sdk` – the TypeScript SDK and related tooling
- `@manifoldxyz/examples` – example applications demonstrating SDK usage

## Getting Started

```bash
pnpm install
pnpm build
```

Common scripts leverage Turborepo to run tasks across packages:

- `pnpm dev` – run all available `dev` scripts in watch mode
- `pnpm lint` – run linting for packages that define a `lint` script
- `pnpm test` – execute tests via Vitest or other configured tooling
- `pnpm typecheck` – run TypeScript type checks where defined
- `pnpm clean` – clean build artifacts

To run a command for a specific package, use `pnpm --filter`:

```bash
pnpm --filter @manifoldxyz/client-sdk run build
pnpm --filter @manifoldxyz/examples exec <command>
```

See `packages/client-sdk/README.md` and `packages/examples/README.md` for package-specific documentation.
