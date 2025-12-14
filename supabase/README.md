# Supabase Setup

Database schema files are not included in this repository for security.

Contact the repository owner for database setup instructions.

## Required Tables

The TD3 application requires the following tables:

- `projects` - Project metadata and loan details
- `budgets` - Budget line items with NAHB cost codes
- `draw_requests` - Draw request headers
- `draw_request_lines` - Individual line items per draw
- `invoices` - Invoice records with matching data
- `documents` - File metadata for uploads
- `approvals` - Approval records and decisions
- `audit_events` - Immutable audit trail
- `nahb_cost_codes` - NAHB cost code reference taxonomy

## Quick Start

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Request schema files from the repository owner
3. Run the schema SQL in Supabase SQL Editor
4. Create a `documents` storage bucket
5. Copy your API credentials to `.env.local`

## Storage Bucket

Create a bucket named `documents` with the following settings:
- Public: No (use signed URLs)
- File size limit: 10MB recommended
- Allowed MIME types: `application/pdf`, `image/*`

