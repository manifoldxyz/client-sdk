# Manifold Client SDK Monorepo

This repository is managed as a pnpm workspace powered by Turborepo. It contains:

- `@manifoldxyz/client-sdk` – the TypeScript SDK and related tooling
- `@manifoldxyz/examples` – example applications demonstrating SDK usage

## Getting Started

```bash
pnpm install
pnpm build
```

Common scripts to run tasks across packages:

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

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. All participants in our project are expected to:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive criticism and collaborative problem-solving
- Respect differing viewpoints and experiences
- Accept responsibility for mistakes and learn from them

Unacceptable behavior includes harassment, discrimination, or any conduct that creates an unsafe or unwelcoming environment. Such behavior will not be tolerated.

## Security

### Reporting Security Vulnerabilities

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, please reach out to us on [X](https://x.com/manifoldxyz) with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

We take all security reports seriously and will respond promptly to address the issue.

## Support

- **Documentation**: [Manifold Client SDK Docs](https://manifold-1.gitbook.io/manifold-client-sdk)
- **Help Center**: [Manifold Help](https://help.manifold.xyz/)
- **Issues**: [GitHub Issues](https://github.com/manifoldxyz/client-sdk/issues)
