# Invoice Matching Fix - Implementation Status & Handoff

## ⚠️ CURRENT STATUS: PARTIALLY BROKEN

**Last Updated:** December 16, 2025

**Critical Issue:** "Bucket not found" error when uploading/accessing invoice files in Supabase Storage.

The n8n workflow and TD3 application code are working, but Supabase Storage access is failing despite the `documents` bucket existing and RLS policies being configured.

---

## Implementation Status

| Task | Status | Notes |

|------|--------|-------|

| Root cause analysis | ✅ Complete | Identified 4 key issues |

| n8n workflow rewrite | ✅ Complete | `n8n-workflows/td3-invoice-process.json` |

| n8n workflow deployed | ✅ Complete | ID: `qmWPuH98SdwkV8iN` (TD3 - Invoice Process) |

| Upload API update | ✅ Complete | Signed URLs + context passing + dynamic callback URL |

| Callback endpoint | ✅ Complete | `app/api/invoices/process-callback/route.ts` |

| Rerun matching API | ✅ Complete | `app/api/invoices/rerun-matching/route.ts` |

| n8n trigger function | ✅ Complete | `lib/n8n.ts` with `callbackUrl` support |

| Database constraint fix | ✅ Complete | Uses only allowed statuses: pending, matched, rejected |

| CORS fix | ✅ Complete | Webhook calls routed through server API |

| PDF preview modal | ✅ Complete | `app/components/draws/InvoiceMatchPanel.tsx` split-pane |

| Documentation | ✅ Complete | `n8n-workflows/README.md` |

| GitHub push | ✅ Complete | All changes on main branch |

| **Supabase Storage** | ❌ BROKEN | "Bucket not found" error despite bucket existing |

---

## Outstanding Issue: Supabase Storage "Bucket Not Found"

### Problem Description

When uploading invoices or loading invoice previews, the error `{"statusCode":"404","error":"Bucket not found","message":"Bucket not found"}` occurs.

### What Has Been Verified

1. **Bucket exists**: The `documents` bucket exists at `https://supabase.com/dashboard/project/uewqcbmaiuofdfvqmbmq/storage/files/buckets/documents`
2. **Files exist**: Invoice files are visible in the `documents/invoices/` folder in Supabase Storage dashboard
3. **Environment variables**: 

   - `.env.local` updated with correct project URL (`https://uewqcbmaiuofdfvqmbmq.supabase.co`)
   - Service role key confirmed to point to correct project (JWT `ref` = `uewqcbmaiuofdfvqmbmq`)
   - Vercel env vars confirmed to be already correct

4. **RLS Policies**: Storage policies were added via SQL:
   ```sql
   CREATE POLICY "Allow authenticated uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');
   CREATE POLICY "Allow authenticated downloads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
   CREATE POLICY "Allow public read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents');
   ```


### What Still Needs Investigation

1. **Service Role Key**: Does the deployed service role key match the project where the bucket exists?
2. **Bucket RLS**: Is RLS enabled on the bucket and are the policies correct?
3. **Bucket Name**: Is the bucket name exactly `documents` (case-sensitive)?
4. **Supabase Client**: Is `supabaseAdmin` using the correct credentials?
5. **Network/CORS**: Any network-level issues between Vercel and Supabase?

### Files That Access Storage

- `app/api/invoices/upload/route.ts` - Uses `supabaseAdmin.storage.from('documents')`
- `app/api/invoices/rerun-matching/route.ts` - Generates signed URLs
- `app/components/projects/DocumentUploadSection.tsx` - Origination document uploads (same bucket)

### Next Steps for Debugging

1. Add debug logging to see exact error response from Supabase
2. Verify Supabase project URL in server logs
3. Test storage access directly via Supabase client in API route
4. Check if bucket has any special configuration (private/public)

---

## All Changes Made (December 16, 2025)

### 1. Database Constraint Fix

**Problem:** Database `CHECK` constraint only allows `status` values: `'pending'`, `'matched'`, `'rejected'`

**Files Changed:**

- `app/api/invoices/upload/route.ts`: Changed initial status from `'processing'` to `'pending'` with `flags: JSON.stringify({ status_detail: 'processing' })`
- `app/api/invoices/process-callback/route.ts`: Maps all statuses to allowed values, stores details in `flags` JSON field
- `app/draws/[id]/page.tsx`: Added `isInvoiceProcessing()` helper that checks `flags.status_detail === 'processing'`

### 2. CORS Fix

**Problem:** Browser calling n8n webhook directly was blocked by CORS

**Solution:** Created server-side API route to proxy webhook calls

- **New File:** `app/api/invoices/rerun-matching/route.ts`
- Frontend now calls `/api/invoices/rerun-matching` instead of n8n directly

### 3. n8n Workflow Response Mode Fix

**Problem:** "Unused Respond to Webhook node found" error with `responseMode: "lastNode"`

**Solution:** Changed webhook to `responseMode: "onReceived"` and removed Respond node

- Workflow now responds immediately with 200 OK
- Processes asynchronously and calls back to TD3 when done

### 4. Dynamic Callback URL

**Problem:** n8n couldn't reach TD3 because `TD3_API_URL` wasn't set

**Solution:** TD3 now passes `callbackUrl` in the webhook payload

- **Files Changed:**
  - `lib/n8n.ts`: Added `callbackUrl` to `InvoiceProcessPayload`
  - `app/api/invoices/upload/route.ts`: Passes `callbackUrl` using `VERCEL_URL` or fallback
  - `app/api/invoices/rerun-matching/route.ts`: Same callback URL logic
  - n8n workflow: Uses `$json.callbackUrl` or falls back to env var

### 5. PDF Preview in Match Modal

**Problem:** User wanted to see invoice PDF when manually matching

**Solution:** Updated `InvoiceMatchPanel.tsx` with split-pane layout

- Left side: PDF preview iframe
- Right side: Category selection
- "Open in New Tab" link for full PDF view
- Graceful fallback if PDF can't load

### 6. Flags Format Consistency

**Problem:** Flags were set as plain string `'PROCESSING'` but frontend expected JSON

**Solution:** All places now use `JSON.stringify({ status_detail: 'processing' })`

---

## n8n Workflow Details

**Workflow ID:** `qmWPuH98SdwkV8iN`

**Workflow Name:** TD3 - Invoice Process

**Webhook URL:** `https://grysngrhm.app.n8n.cloud/webhook/td3-invoice-process`

**Response Mode:** `onReceived` (async processing)

### Workflow Structure

```
Webhook → Download Invoice → Upload to OpenAI Files → Wait → Build Request Body
→ Call OpenAI Responses (GPT-4o-mini for extraction) → Parse Response → Check Errors
→ Invoice Matching Agent (GPT-4o for matching) → Build Callback Payload
→ Success Callback OR Error Callback
```

### OpenAI Credentials

- Credential ID: `IF5p8af6bX6hwfJK`
- Name: "OpenAi account"

---

## Environment Configuration

### TD3 Application (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://uewqcbmaiuofdfvqmbmq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key - JWT ref should be uewqcbmaiuofdfvqmbmq>
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://grysngrhm.app.n8n.cloud/webhook
```

### Vercel Environment Variables

Same as above - confirmed correct by user

### n8n Environment

- `TD3_API_URL`: Should be set but workflow now uses dynamic `callbackUrl` from payload

---

## Database Schema (Relevant Tables)

### invoices

- `status`: CHECK constraint allows only `'pending'`, `'matched'`, `'rejected'`
- `flags`: TEXT field for JSON metadata (stores `status_detail`, errors, etc.)
- `file_path`: Path in Supabase Storage (`{projectId}/invoices/{drawRequestId}/{timestamp}_{filename}`)
- `file_url`: Public URL for the file

### Supabase Storage Structure

```
documents/
├── {projectId}/
│   ├── invoices/
│   │   └── {drawRequestId}/
│   │       └── {timestamp}_{filename}
│   └── origination/
│       └── {documentType}/
│           └── {timestamp}_{filename}
```

---

## Files Modified/Created Summary

### Modified Files

- `app/api/invoices/upload/route.ts` - Signed URLs, callback URL, status fix
- `app/api/invoices/process-callback/route.ts` - Status mapping, flags handling
- `app/draws/[id]/page.tsx` - Processing detection, UI updates
- `app/components/draws/InvoiceMatchPanel.tsx` - PDF preview split-pane
- `lib/n8n.ts` - Added `callbackUrl` to payload type

### New Files

- `app/api/invoices/rerun-matching/route.ts` - Server-side webhook proxy

### n8n Workflow

- Updated in place via MCP tools (ID: `qmWPuH98SdwkV8iN`)

---

## Instructions for Next Agent

### Priority 1: Fix Supabase Storage "Bucket Not Found"

1. **Debug the actual error:**

   - Add logging to `app/api/invoices/upload/route.ts` to see full error response
   - Check if `supabaseAdmin` is initialized with correct URL/key

2. **Verify credentials:**
   ```typescript
   // Add this to upload route to debug
   console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
   console.log('Service Key ref:', JSON.parse(atob(process.env.SUPABASE_SERVICE_ROLE_KEY.split('.')[1])).ref)
   ```

3. **Check bucket configuration:**

   - Go to Supabase Dashboard > Storage > documents > Settings
   - Verify bucket is not in a broken state
   - Try creating a test bucket and see if that works

4. **Test direct API call:**

   - Try uploading via Supabase Dashboard to rule out policy issues
   - Try using REST API directly to isolate the issue

### Priority 2: Once Storage Works

1. Test full invoice upload flow
2. Test "Re-run Invoice Matching" button
3. Test PDF preview in Match Invoice modal
4. Test origination document upload

---

## Relevant Links

- **n8n Cloud:** https://grysngrhm.app.n8n.cloud
- **n8n Workflow:** https://grysngrhm.app.n8n.cloud/workflow/qmWPuH98SdwkV8iN
- **Supabase Project:** https://supabase.com/dashboard/project/uewqcbmaiuofdfvqmbmq
- **Supabase Storage:** https://supabase.com/dashboard/project/uewqcbmaiuofdfvqmbmq/storage/buckets/documents
- **GitHub Repo:** grysngrhm-tech/TD3
- **Vercel Project:** https://vercel.com/grayson-grahams-projects/td3

---

## Original Root Cause Analysis (Still Relevant)

### Issue 1: n8n Workflow Configuration Errors (FIXED)

The LangChain OpenAI node was using invalid operations. Now uses HTTP Request nodes with OpenAI Files API and Responses API.

### Issue 2: Response Mode Without Error Handling (FIXED)

Changed to `responseMode: "onReceived"` for async processing with callbacks.

### Issue 3: Environment Variable Issues (FIXED)

Now uses dynamic `callbackUrl` passed in webhook payload.

### Issue 4: Supabase Storage Access (STILL BROKEN)

Despite bucket existing and policies being configured, "Bucket not found" error persists.