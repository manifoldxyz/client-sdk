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

## Contributing

We welcome contributions to the Manifold Client SDK! Whether you're fixing bugs, improving documentation, or proposing new features, your efforts are appreciated.

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/client-sdk.git
   cd client-sdk
   ```

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Build the Project**

   ```bash
   pnpm build
   ```

4. **Run Tests**
   ```bash
   pnpm test
   ```

### Development Workflow

1. **Create a Feature Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**

   - Follow the existing code style and conventions
   - Add tests for new functionality
   - Update documentation as needed

3. **Verify Your Changes**

   ```bash
   pnpm lint        # Check code style
   pnpm typecheck   # Verify TypeScript types
   pnpm test        # Run test suite
   pnpm build       # Ensure build succeeds
   ```

4. **Commit Your Changes**
   - Use clear, descriptive commit messages
   - Follow conventional commits format: `type(scope): description`
   - Examples: `feat(sdk): add support for new product type`, `fix(edition): resolve purchase validation issue`

### Pull Request Guidelines

1. **Before Submitting**

   - Ensure all tests pass
   - Update documentation if you've changed APIs
   - Add a changeset if your PR includes changes that should be released

2. **PR Description**

   - Clearly describe what changes you've made
   - Reference any related issues (e.g., "Fixes #123")
   - Include screenshots for UI changes if applicable

3. **Review Process**
   - A maintainer will review your PR
   - Address any feedback or requested changes
   - Once approved, your PR will be merged

### Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/manifoldxyz/client-sdk/issues) with:

- A clear, descriptive title
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Your environment details (Node version, OS, etc.)
- Any relevant code snippets or error messages

### Documentation

When contributing, please ensure:

- All public APIs have JSDoc comments
- README files are updated for new features
- Examples are provided for complex functionality
- The `docs/` directory is updated when making significant changes

### Code Style

- **TypeScript**: Use strict mode, avoid `any` types
- **Imports**: Use `import type` for type-only imports
- **Error Handling**: Use typed `ClientSDKError` enum
- **Testing**: Write unit tests for new functionality
- **Formatting**: Code is automatically formatted with Prettier

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
