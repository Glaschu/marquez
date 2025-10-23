# Keep-At-Least-One Retention Policy

## Overview
The retention policy has been enhanced to **always preserve at least one record** for each job, dataset, and their versions, even when all records are older than the retention period.

## Why This Matters

### Problem Without Keep-At-Least-One
If a team imports data infrequently (e.g., quarterly reports, annual datasets):
- All records could be older than the 7-day retention period
- Standard retention would delete **everything**
- Complete loss of historical reference for that pipeline
- Broken lineage queries

### Solution With Keep-At-Least-One
- At least one record always remains
- Historical reference is maintained
- Lineage queries continue to work
- Metadata catalog remains complete

## What Is Preserved

### Jobs
```sql
-- Keeps the most recent job per namespace+name
SELECT DISTINCT ON (namespace_uuid, name) uuid
  FROM jobs
 ORDER BY namespace_uuid, name, updated_at DESC
```

**Example**: If you have a job `analytics.monthly_report` that hasn't run in 30 days, the most recent job record is preserved.

### Job Versions
```sql
-- Keeps the most recent job version per job
SELECT DISTINCT ON (job_uuid) uuid
  FROM job_versions
 ORDER BY job_uuid, created_at DESC
```

**Example**: For the `monthly_report` job, the most recent version definition is kept.

### Datasets
```sql
-- Keeps the most recent dataset per namespace+name
SELECT DISTINCT ON (namespace_uuid, name) uuid
  FROM datasets
 ORDER BY namespace_uuid, name, updated_at DESC
```

**Example**: A dataset `warehouse.annual_sales` that hasn't been updated in 60 days keeps its most recent record.

### Dataset Versions
```sql
-- Keeps the most recent dataset version per dataset
SELECT DISTINCT ON (dataset_uuid) uuid
  FROM dataset_versions
 ORDER BY dataset_uuid, created_at DESC
```

**Example**: The most recent schema and metadata for `annual_sales` is preserved.

## Use Cases

### Quarterly Reporting Pipeline
- Runs every 90 days
- All records are > 7 days old after each run
- Without protection: All metadata deleted
- With protection: Most recent run metadata preserved

### Seasonal Data Processing
- Runs only during certain months
- Inactive for 8-10 months per year
- Without protection: Metadata wiped during off-season
- With protection: Last execution metadata remains

### Ad-Hoc Analysis Jobs
- Run occasionally by analysts
- Months between executions
- Without protection: Lost between runs
- With protection: Always discoverable in catalog

## Performance Impact

The keep-at-least-one logic adds minimal overhead:
1. **One-time setup**: Create temp table with most recent records per entity (uses `DISTINCT ON`)
2. **Index creation**: Fast lookup during batch processing
3. **Additional NOT EXISTS clause**: Efficiently excludes protected records

Since most workloads have regular cadence, the majority of records are still deleted normally. Only infrequently updated entities benefit from this protection.

## Configuration

This behavior is **always enabled** and not configurable. It's a safety feature to prevent accidental complete data loss.

If you need to delete all records for a specific entity, you must do so manually outside of the retention process.

## Testing Examples

### Test Case 1: Inactive Pipeline
```sql
-- Setup: Create a dataset with all versions > 7 days old
INSERT INTO datasets VALUES (..., updated_at = NOW() - INTERVAL '30 days');
INSERT INTO dataset_versions VALUES (..., created_at = NOW() - INTERVAL '30 days');

-- Run retention with 7 day policy
CALL delete_dataset_versions_older_than_x_days();

-- Expected result: 1 dataset version remains (the most recent one)
SELECT COUNT(*) FROM dataset_versions WHERE dataset_uuid = '...';
-- Returns: 1
```

### Test Case 2: Active Pipeline
```sql
-- Setup: Multiple versions, some old, some new
INSERT INTO dataset_versions VALUES 
  (..., created_at = NOW() - INTERVAL '30 days'),  -- Old, eligible for deletion
  (..., created_at = NOW() - INTERVAL '20 days'),  -- Old, eligible for deletion
  (..., created_at = NOW() - INTERVAL '2 days');   -- New, protected by retention days

-- Run retention with 7 day policy
CALL delete_dataset_versions_older_than_x_days();

-- Expected result: 1 new version (< 7 days) remains
-- But even if all were old, the most recent would be kept
```

## Implementation Details

Each retention function:
1. Creates temp table with most recent record per entity
2. Adds index for efficient lookups
3. Excludes these records in the DELETE query via NOT EXISTS
4. Drops temp table after batch processing completes

The logic is applied BEFORE the batch selection, so protected records never enter the deletion pipeline.
