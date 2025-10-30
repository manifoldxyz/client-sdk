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
