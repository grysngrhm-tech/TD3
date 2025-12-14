# n8n Workflows

Workflow definition files are not included in this repository.

## Available Workflows

TD3 uses n8n Cloud for automation:

| Workflow | Purpose |
|----------|---------|
| TD3 - Budget Import | Import budgets from Excel with AI NAHB classification |
| TD3 - Draw Processor | Process draw requests with invoice matching |
| TD3 - Approval Flow | Handle draw approval/rejection with validation |

## Features

- **AI-Powered Classification** - GPT-4.1-mini maps builder categories to NAHB cost codes
- **Invoice Extraction** - GPT-4o-mini vision extracts data from invoice PDFs
- **Smart Matching** - AI matches invoices to budget categories with confidence scoring
- **Validation Integration** - Checks for overages and duplicates before approval

## Setup

Contact the repository owner for:
1. Workflow JSON files
2. Credential configuration
3. Webhook endpoint URLs

## Requirements

- n8n Cloud account or self-hosted instance
- OpenAI API key
- Supabase credentials
