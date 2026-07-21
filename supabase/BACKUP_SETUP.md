# Supabase Backup Setup Guide

## Overview

Supabase provides two types of database backups:

| Plan | Backup Type | Retention | PITR |
|------|-------------|-----------|------|
| Free | Daily snapshots | 7 days | ❌ No |
| Pro ($25/mo) | Daily snapshots | 30 days | ✅ Yes (7 days) |
| Team | Daily snapshots | 90 days | ✅ Yes (7 days) |

> **Recommendation:** Upgrade to the **Pro plan** before going live. Free plan backups are not guaranteed for production workloads.

---

## Step 1 — Verify Backups Are Enabled

1. Go to your Supabase project: [app.supabase.com](https://app.supabase.com)
2. Navigate to **Project Settings → Database → Backups**
3. Confirm that daily backups are listed and recent (within the last 24 hours)

---

## Step 2 — Enable Point-in-Time Recovery (PITR) (Pro Plan)

PITR allows you to restore to any second within the last 7 days — essential for recovering from accidental data deletion.

1. **Project Settings → Add-Ons → Point in Time Recovery**
2. Click **Enable PITR**
3. Cost: ~$100/month additional (worth it for production with real guest PII data)

---

## Step 3 — Test a Restore (Required Pre-Launch)

Before go-live, verify you can actually restore from a backup:

1. Go to **Project Settings → Database → Backups**
2. Click **Restore** on a recent backup to a **test project** (not production)
3. Verify the restored database contains the expected tables and data
4. Document the restore time (it should be under 10 minutes for small datasets)

---

## Step 4 — Regular Backup Verification

Run this check monthly:

```sql
-- Check if WAL archiving is active (proxy for backup health)
SELECT 
  archived_count,
  failed_count,
  last_archived_wal,
  last_archived_time,
  last_failed_wal,
  last_failed_time
FROM pg_stat_archiver;
```

- `archived_count` should be increasing
- `failed_count` should be 0
- `last_failed_time` should be NULL or very old

---

## Step 5 — Additional Safeguard: Manual Export

Set up a monthly manual export as an extra layer:

```bash
# Using pg_dump with your DIRECT_URL
pg_dump "$DIRECT_URL" \
  --no-owner \
  --no-acl \
  --format=custom \
  --file="staydesk-backup-$(date +%Y%m%d).dump"
```

Store the `.dump` file in:
- Google Drive (encrypted)
- AWS S3 with versioning
- Any offsite cold storage

---

## Recovery Contacts

| Issue | Action |
|-------|--------|
| Data accidentally deleted | Use PITR to restore to 1 minute before deletion |
| Table corrupted | Restore from daily snapshot to a staging project, export the table, re-import |
| Full data loss | Restore entire project from latest daily snapshot |

For Supabase support during emergencies: [support.supabase.com](https://support.supabase.com)
