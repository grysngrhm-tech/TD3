# Contributing to TD3

Thank you for your interest in contributing to TD3!

## Development Setup

1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Set up your `.env.local` file (see [README.md](README.md))
4. Run the development server: `npm run dev`

## Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/invoice-preview`)
- `fix/` - Bug fixes (e.g., `fix/budget-calculation`)
- `refactor/` - Code refactoring (e.g., `refactor/validation-logic`)
- `docs/` - Documentation updates (e.g., `docs/api-reference`)

## Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(draws): add invoice preview modal`
- `fix(validation): correct budget overage calculation`
- `docs(readme): update deployment instructions`

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear commits
3. Ensure the app builds without errors: `npm run build`
4. Update documentation if needed
5. Submit a PR with a clear description

## Code Style

- TypeScript for all new code
- Use existing patterns and conventions
- Keep components focused and reusable
- Add types to `types/database.ts` for new database fields

## Database Changes

1. Update `supabase/001_schema.sql` with new tables/columns
2. Update TypeScript types in `types/database.ts`
3. Test migrations on a fresh Supabase project
4. Document changes in PR description

## Questions?

Open an issue for questions or suggestions.

