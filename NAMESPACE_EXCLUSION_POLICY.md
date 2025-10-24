# Namespace Exclusion from Keep-At-Least-One Protection

## Overview
Certain namespaces can be excluded from the "keep-at-least-one" protection policy. Records in these namespaces will be deleted based purely on time-based retention, without preserving the most recent record.

## Use Case
This is useful for temporary or test namespaces where you don't need historical preservation:
- **`local`** - Local development/testing namespace
- **`test`** - Test environment namespace  
- **`tmp`** - Temporary/scratch workspace
- **`dev`** - Development sandbox

## Configuration

Namespace exclusions are defined in `DbRetention.java`:

```java
private static final String[] NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE = {
  "local"
};
```

To add more excluded namespaces, simply add them to the array:

```java
private static final String[] NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE = {
  "local",
  "test",
  "tmp",
  "dev-sandbox"
};
```

## Behavior

### For Excluded Namespaces (e.g., "local")
- ❌ Keep-at-least-one protection **DISABLED**
- ✅ Time-based retention only
- ✅ All records older than retention days are deleted
- ✅ No records preserved if all are old

### For Normal Namespaces
- ✅ Keep-at-least-one protection **ENABLED**
- ✅ Most recent record always preserved
- ✅ Time-based retention for older records
- ✅ At least one record remains even if all are old

## Examples

### Example 1: Local Namespace (Excluded)
```sql
-- Namespace: local
-- Retention: 7 days
-- Records: 
--   - Job "local.test_job" last run 30 days ago
--   - Job "local.debug_job" last run 45 days ago

-- Result after retention:
-- ❌ local.test_job DELETED (no keep-at-least-one protection)
-- ❌ local.debug_job DELETED (no keep-at-least-one protection)
```

### Example 2: Production Namespace (Normal)
```sql
-- Namespace: production
-- Retention: 7 days
-- Records:
--   - Job "production.quarterly_report" last run 30 days ago
--   - Job "production.annual_analysis" last run 90 days ago

-- Result after retention:
-- ✅ production.quarterly_report PRESERVED (keep-at-least-one)
-- ✅ production.annual_analysis PRESERVED (keep-at-least-one)
```

### Example 3: Mixed Scenario
```sql
-- Local namespace job with multiple versions:
--   v1: 30 days old
--   v2: 20 days old  
--   v3: 10 days old (most recent)

-- Production namespace job with multiple versions:
--   v1: 30 days old
--   v2: 20 days old
--   v3: 10 days old (most recent)

-- Result after 7-day retention:
-- Local (excluded): v1, v2, v3 ALL DELETED
-- Production (normal): v3 PRESERVED (most recent kept)
```

## Implementation Details

### SQL Generation
The exclusion list is converted to SQL at runtime:

```sql
-- Generated SQL for exclusion check:
WHERE j.namespace_uuid NOT IN (
  SELECT uuid FROM namespaces 
  WHERE name IN ('local', 'test', 'tmp')
)
```

### Applied To
The exclusion logic is applied when building the "keep-at-least-one" temp tables for:

1. **Jobs**: `most_recent_job_per_name`
2. **Job Versions**: `most_recent_job_version_per_job`  
3. **Datasets**: `most_recent_dataset_per_name`
4. **Dataset Versions**: `most_recent_dataset_version_per_dataset`

###  Performance Impact
Minimal overhead:
- One additional NOT IN subquery when creating keep-at-least-one tables
- Subquery is cached by Postgres for the duration of the function
- No impact on normal time-based retention

## When to Use Exclusions

### ✅ Good Use Cases
- Development/test namespaces that churn frequently
- Temporary workspaces for ad-hoc analysis
- Sandbox environments that should be cleaned regularly
- Local development where data is easily recreated

### ❌ Bad Use Cases
- Production namespaces (always keep historical reference)
- Regulatory/compliance data (may need audit trail)
- Infrequently run critical pipelines
- Data with business value even if old

## Configuration Best Practices

1. **Start Conservative**: Only exclude truly temporary namespaces
2. **Document Exclusions**: Comment why each namespace is excluded
3. **Review Regularly**: Ensure excluded namespaces still make sense
4. **Communicate**: Let team know which namespaces won't preserve history

## Testing

To test namespace exclusion behavior:

```sql
-- 1. Create test data in excluded namespace
INSERT INTO namespaces VALUES (..., name='local');
INSERT INTO jobs VALUES (..., namespace_uuid=<local_uuid>, updated_at=NOW() - INTERVAL '30 days');

-- 2. Run retention with 7-day policy
CALL delete_jobs_older_than_x_days();

-- 3. Verify deletion
SELECT COUNT(*) FROM jobs WHERE namespace_uuid = <local_uuid>;
-- Expected: 0 (all deleted, no keep-at-least-one protection)

-- 4. Compare with production namespace
SELECT COUNT(*) FROM jobs WHERE namespace_uuid = <production_uuid>;
-- Expected: >= 1 (most recent preserved)
```

## Migration Guide

If you're adding exclusions to an existing system:

1. **Identify candidates**: Review namespaces and find temporary ones
2. **Add to array**: Update `NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE`
3. **Notify team**: Warn that these namespaces will lose keep-at-least-one protection
4. **Run retention**: Next retention cycle will clean up excluded namespaces
5. **Monitor**: Check that expected records are deleted

## Troubleshooting

### Records Not Being Deleted in Excluded Namespace
- Verify namespace name matches exactly (case-sensitive)
- Check that records are older than retention days
- Ensure they're not the current version of a job/dataset

### Unexpected Deletions
- Double-check namespace isn't in exclusion list by mistake
- Review that retention days policy is appropriate
- Verify no other constraints preventing deletion

## Summary

Namespace exclusion allows you to fine-tune retention behavior:
- **Excluded namespaces**: Pure time-based cleanup, no historical preservation
- **Normal namespaces**: Keep-at-least-one protection always active
- **Configurable**: Simple array modification to add/remove exclusions
- **Safe**: Only affects keep-at-least-one logic, not time-based retention
