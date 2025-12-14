# TypeScript Types

Database type definitions are maintained locally and not included in this repository.

## Generating Types

You can generate TypeScript types from your own Supabase instance using the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Generate types from your project
supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

## Available Types

The type definitions include:

- `Project` - Project entity with loan details
- `Budget` - Budget line item with NAHB mapping
- `DrawRequest` - Draw request header
- `DrawRequestLine` - Line item with invoice matching
- `Invoice` - Invoice with extraction data
- `Document` - File metadata
- `Approval` - Approval record
- `AuditEvent` - Audit trail entry
- `NahbCostCode` - Cost code taxonomy
- `ValidationResult` - Validation check results

## Usage

```typescript
import type { Project, Budget, DrawRequest } from '@/types/database'
```

