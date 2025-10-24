# Orphaned Data Cleanup

## Overview
The retention process now includes automatic cleanup of **orphaned datasets and dataset versions** that are not connected to any jobs or runs. This prevents accumulation of unused metadata.

## What Gets Deleted

### Orphaned Datasets
**Definition**: Datasets that are NOT referenced by any job as input or output.

**Criteria**:
```sql
SELECT d.uuid FROM datasets AS d
WHERE NOT EXISTS (
  SELECT 1 FROM job_versions_io_mapping AS jvio
  WHERE jvio.dataset_uuid = d.uuid
)
```

**When This Happens**:
- Dataset was created but never used by any job
- Dataset was previously used but all jobs referencing it were deleted
- Manually created datasets for testing that were never connected

### Orphaned Dataset Versions
**Definition**: Dataset versions that are NOT:
1. Referenced by any run as input (`runs_input_mapping`)
2. The current version of a dataset (`datasets.current_version_uuid`)

**Criteria**:
```sql
SELECT dv.uuid FROM dataset_versions AS dv
WHERE NOT EXISTS (
  SELECT 1 FROM runs_input_mapping AS rim
  WHERE rim.dataset_version_uuid = dv.uuid
) AND dv.uuid NOT IN (
  SELECT current_version_uuid FROM datasets
  WHERE current_version_uuid IS NOT NULL
)
```

**When This Happens**:
- Dataset version was created but never consumed by a run
- Old versions that are no longer current and never used as input
- Test versions created but never connected to actual pipeline runs

## Execution Order

The retention process executes in this order:

1. ✅ Time-based cleanup (jobs, job versions, runs, datasets, dataset versions)
2. ✅ **Orphaned datasets cleanup** (NEW)
3. ✅ **Orphaned dataset versions cleanup** (NEW)  
4. ✅ Lineage events cleanup

**Why This Order?**
- Time-based cleanup removes old metadata first
- Orphaned cleanup catches any disconnected data left behind
- Ensures maximum cleanup while preserving referenced data

## What Gets Cascaded

### Orphaned Datasets Delete
When an orphaned dataset is deleted, these dependents are also removed:

1. `dataset_facets` - Dataset-level facets
2. `datasets_tag_mapping` - Dataset tags
3. `dataset_fields` - Field definitions
4. `dataset_fields_tag_mapping` - Field-level tags
5. `column_lineage` - Column-level lineage (field references)
6. `dataset_versions` - All versions of the dataset
7. `dataset_versions_field_mapping` - Version field mappings
8. `runs_input_mapping` - Run input references
9. `stream_versions` - Stream version metadata

### Orphaned Dataset Versions Delete
When an orphaned dataset version is deleted:

1. `column_lineage` - Column lineage (both input/output)
2. `dataset_facets` - Version-specific facets
3. `dataset_versions_field_mapping` - Field mappings
4. `stream_versions` - Stream metadata

## Performance Optimizations

Same optimizations as time-based retention:

✅ **Manual cascade deletion** - Avoids automatic CASCADE overhead
✅ **Batch processing** - Deletes in configurable batches (default: 1000)
✅ **Trigger disabling** - Skips constraint validation during parent deletion
✅ **Indexed temp tables** - Fast lookups during batch processing
✅ **Sleep between batches** - Reduces database load (0.1s per batch)

## Safety Features

### Protected Data
The cleanup functions explicitly **NEVER delete**:

1. **Datasets used by jobs** - Any dataset in `job_versions_io_mapping`
2. **Dataset versions used by runs** - Any version in `runs_input_mapping`
3. **Current dataset versions** - The `current_version_uuid` of any dataset

### Batch Processing
- Processes in small batches to avoid long-running transactions
- Uses `FOR UPDATE SKIP LOCKED` to avoid contention
- Can be interrupted and resumed without data loss

### Trigger Management
- Disables triggers during deletion for performance
- Always re-enables triggers after each batch
- Automatic rollback on error

## Examples

### Example 1: Test Dataset Never Used
```sql
-- Created for testing but never connected to a job
INSERT INTO datasets VALUES (..., name='test_scratch_data');

-- No entries in job_versions_io_mapping referencing this dataset

-- Result after retention:
-- ❌ Dataset DELETED (orphaned, not used by any job)
```

### Example 2: Old Dataset Version Never Consumed
```sql
-- Dataset with 3 versions:
--   v1: Created but never used by a run
--   v2: Used by run #123 (referenced in runs_input_mapping)
--   v3: Current version (datasets.current_version_uuid)

-- Result after retention:
-- ❌ v1 DELETED (orphaned, never used)
-- ✅ v2 PRESERVED (referenced by run)
-- ✅ v3 PRESERVED (current version)
```

### Example 3: Dataset After Job Deletion
```sql
-- Scenario:
-- 1. Job "etl_pipeline" uses dataset "raw_data"
-- 2. Job "etl_pipeline" is deleted by retention
-- 3. Dataset "raw_data" is now orphaned

-- Result after retention:
-- ✅ Job deleted by time-based retention
-- ❌ Dataset deleted by orphaned cleanup (no longer referenced)
```

### Example 4: Dataset Used by Multiple Jobs
```sql
-- Dataset "shared_dim_table" used by:
--   - Job "report_gen" (still active)
--   - Job "dashboard" (deleted)

-- Result after retention:
-- ✅ Dataset PRESERVED (still referenced by "report_gen")
```

## Use Cases

### Cleanup After Job Deletion
When jobs are deleted, their input/output datasets may become orphaned:
- ✅ Automatically cleaned up
- ✅ No manual intervention needed
- ✅ Prevents metadata bloat

### Test Data Cleanup
Test datasets created but never actually used:
- ✅ Automatically removed
- ✅ Keeps metadata catalog clean
- ✅ No accumulation of test artifacts

### Failed Pipeline Development
Datasets created during pipeline development that never made it to production:
- ✅ Cleaned up automatically
- ✅ No manual tracking needed
- ✅ Fresh start for each development cycle

## Configuration

### Enabled by Default
Orphaned cleanup runs automatically during retention:
```java
// Runs after time-based retention
retentionOnOrphanedDatasets(jdbi, numberOfRowsPerBatch);
retentionOnOrphanedDatasetVersions(jdbi, numberOfRowsPerBatch);
```

### Dry Run Behavior
Orphaned cleanup is **SKIPPED** during dry runs:
- Dry runs only estimate time-based retention
- Orphaned cleanup has no time component to estimate
- Run actual retention to clean orphaned data

### Batch Size
Uses the same `numberOfRowsPerBatch` as time-based retention:
- Default: 1000 rows per batch
- Configurable via retention parameters
- Adjust based on database load

## Monitoring

### Log Output
```
INFO: Deleting orphaned datasets not connected to any jobs...
INFO: Deleted '42' orphaned datasets in '1234' ms!
INFO: Deleting orphaned dataset versions not connected to any runs...
INFO: Deleted '156' orphaned dataset versions in '2345' ms!
```

### What to Monitor
1. **Number of orphaned datasets** - Should be small in healthy systems
2. **Execution time** - Indicates volume of orphaned data
3. **Frequency of cleanup** - High numbers suggest process issues

### Warning Signs
⚠️ **Large number of orphaned datasets** - May indicate:
- Jobs being deleted frequently
- Test data not being cleaned up
- Pipeline development issues

⚠️ **Long execution times** - May indicate:
- Too many orphaned records
- Need to increase batch size
- Database performance issues

## Best Practices

### 1. Review Before First Run
Check what would be deleted:
```sql
-- Count orphaned datasets
SELECT COUNT(*) FROM datasets AS d
WHERE NOT EXISTS (
  SELECT 1 FROM job_versions_io_mapping AS jvio
  WHERE jvio.dataset_uuid = d.uuid
);

-- Count orphaned dataset versions
SELECT COUNT(*) FROM dataset_versions AS dv
WHERE NOT EXISTS (
  SELECT 1 FROM runs_input_mapping AS rim
  WHERE rim.dataset_version_uuid = dv.uuid
) AND dv.uuid NOT IN (
  SELECT current_version_uuid FROM datasets
  WHERE current_version_uuid IS NOT NULL
);
```

### 2. Run During Off-Peak Hours
- First run may delete many orphaned records
- Schedule during maintenance windows
- Monitor database load

### 3. Backup Before First Run
- Take database backup
- Verify backup is restorable
- Have rollback plan ready

### 4. Start with Smaller Batches
- Use smaller `numberOfRowsPerBatch` initially
- Monitor performance and adjust
- Increase batch size once stable

## Troubleshooting

### No Orphaned Data Deleted
**Possible causes**:
- All datasets are referenced by jobs
- Running in dry-run mode (orphaned cleanup skipped)
- Batch size too small

### Unexpected Deletions
**Check**:
- Job deletion history
- Manual dataset creation
- Test data that was never connected

### Performance Issues
**Solutions**:
- Reduce batch size
- Run during off-peak hours
- Check database indexes
- Monitor trigger enable/disable

## Disabling Orphaned Cleanup

If you need to disable orphaned cleanup temporarily:

```java
// Comment out these lines in retentionOnDbOrError():
// retentionOnOrphanedDatasets(jdbi, numberOfRowsPerBatch);
// retentionOnOrphanedDatasetVersions(jdbi, numberOfRowsPerBatch);
```

**When to Disable**:
- Debugging dataset issues
- Investigating missing data
- During system migration
- Testing scenarios

## Summary

✅ **Automatic cleanup** - No manual intervention needed
✅ **Safe deletion** - Never deletes referenced data
✅ **Performance optimized** - Same optimizations as time-based retention
✅ **Batch processing** - Handles large volumes efficiently
✅ **Protected data** - Current versions and used data preserved
✅ **Integrated** - Runs as part of normal retention process

The orphaned cleanup feature ensures your metadata catalog stays clean and efficient by automatically removing unused datasets and versions!
