# Database Retention Performance Optimization

## Problem
The database retention process was extremely slow when deleting 150,000+ dataset versions, each with hundreds of connected items. The root cause was the use of `ON DELETE CASCADE` foreign key constraints, which trigger automatically for each deleted row and create significant overhead.

## CASCADE Relationships
When deleting a `dataset_version`, PostgreSQL automatically cascades deletes to:
- `column_lineage` (both input and output references)
- `dataset_facets`
- `dataset_versions_field_mapping`
- `runs_input_mapping`
- `stream_versions`

When deleting a `dataset`, PostgreSQL cascades to even more tables:
- `dataset_facets`
- `dataset_fields` → `dataset_fields_tag_mapping`, `column_lineage`
- `dataset_versions` → (all the above dataset_version cascades)
- `dataset_versions_field_mapping`
- `datasets_tag_mapping`
- `job_versions_io_mapping`

With hundreds of connected items per dataset, each CASCADE trigger compounds the performance problem.

## Solution
Modified `DbRetention.java` to **manually delete dependent records in batches** before deleting the parent records. This approach:

1. **Avoids CASCADE trigger overhead** - Manual deletes are much faster than automatic CASCADE triggers
2. **Maintains batch processing** - Still deletes in configurable batches to avoid long-running transactions
3. **Preserves data integrity** - Deletes in the correct order to respect foreign key constraints
4. **Adds temporary tables** - Uses temp tables to store UUIDs of records to delete for better performance
5. **No outgoing cascades** - The dependent tables we delete (column_lineage, dataset_facets, etc.) have NO outgoing CASCADE constraints, so their deletion is extremely fast
6. **Disables triggers during parent deletion** - Uses `ALTER TABLE DISABLE TRIGGER ALL` to completely skip CASCADE constraint validation when deleting dataset_versions and datasets, since we've already deleted all dependents
7. **Safe re-enabling** - Triggers are re-enabled after each batch to ensure data integrity for normal operations

## Changes Made

### 1. `retentionOnDatasetVersions()` Optimization
- **Identifies most recent dataset version per dataset** to preserve
- Creates a temp table `dataset_versions_to_delete` with batches of UUIDs
- Excludes the most recent version per dataset from deletion
- Manually deletes from dependent tables in this order:
  1. `column_lineage` (output and input references)
  2. `dataset_facets`
  3. `dataset_versions_field_mapping`
  4. `runs_input_mapping`
  5. `stream_versions`
  6. **Disables all triggers on `dataset_versions`**
  7. `dataset_versions` (finally - no CASCADE validation!)
  8. **Re-enables triggers**
- Added indexes on temporary tables for faster lookups
- **Key optimization**: Triggers are disabled during deletion to skip CASCADE constraint checks entirely

### 2. `retentionOnDatasets()` Optimization
- **Identifies most recent dataset per namespace+name** to preserve
- Similar approach with cascading temp tables
- Excludes the most recent dataset per namespace+name from deletion
- Deletes dependent records in this order:
  1. `dataset_facets`
  2. `datasets_tag_mapping`
  3. `job_versions_io_mapping`
  4. Dataset fields and their dependents:
     - `dataset_fields_tag_mapping`
     - `column_lineage` (field references)
     - `dataset_versions_field_mapping`
     - `dataset_fields`
  5. Dataset versions and their dependents:
     - `column_lineage` (version references)
     - `dataset_facets`
     - `dataset_versions_field_mapping`
     - `runs_input_mapping`
     - `stream_versions`
     - **Disables triggers on `dataset_versions`**
     - Delete `dataset_versions`
     - **Re-enables triggers**
  6. **Disables triggers on `datasets`**
  7. Delete `datasets` (finally - no CASCADE validation!)
  8. **Re-enables triggers**

### 3. `retentionOnJobs()` Optimization
- **Identifies most recent job per namespace+name** to preserve
- Excludes the most recent job per namespace+name from deletion
- Ensures at least one job record remains for each unique job

### 4. `retentionOnJobVersions()` Optimization
- **Identifies most recent job version per job** to preserve
- Excludes current job versions (those referenced by jobs.current_version_uuid)
- Excludes the most recent job version per job from deletion
- Ensures at least one job version record remains for each job

## Performance Benefits
- **Eliminates CASCADE trigger overhead** - No automatic trigger firing for each row
- **Disables constraint validation** - `ALTER TABLE DISABLE TRIGGER ALL` completely skips CASCADE checks on parent table deletes
- **Batch deletes are more efficient** - Database can optimize bulk DELETE statements
- **Reduced lock contention** - Manual deletes allow better control over locking
- **Better progress visibility** - The batch loop provides clearer progress tracking
- **No race conditions** - Old dataset versions won't be updated, so disabling triggers is safe within the batch transaction

## Configuration
The batch size is controlled by `numberOfRowsPerBatch` parameter (default: 1000). For large-scale deletions, you may want to:
- Increase batch size for faster deletion (e.g., 5000-10000)
- Monitor database load and adjust accordingly
- Consider running during low-traffic periods

## Keep-At-Least-One Policy

A critical feature of this retention implementation is that it **always preserves at least one record** for each entity, even if all records are older than the retention period. This ensures historical reference and prevents complete data loss for infrequently updated pipelines.

### What Is Preserved

1. **Jobs**: The most recent job per `namespace + name` combination is always kept
2. **Job Versions**: The most recent job version per job is always kept
3. **Datasets**: The most recent dataset per `namespace + name` combination is always kept
4. **Dataset Versions**: The most recent dataset version per dataset is always kept

### Why This Matters

For teams that import data infrequently (e.g., monthly or quarterly):
- Without this protection, all their metadata could be deleted
- With this protection, at least one historical record remains for reference
- Enables lineage queries even for old, inactive pipelines
- Maintains continuity of the metadata catalog

### Implementation

Each retention function creates a temporary table identifying the most recent record per entity:
```sql
-- Example for dataset versions
CREATE TEMPORARY TABLE most_recent_dataset_version_per_dataset AS (
  SELECT DISTINCT ON (dataset_uuid) uuid
    FROM dataset_versions
   ORDER BY dataset_uuid, created_at DESC
);
```

Then excludes these records from deletion:
```sql
AND NOT EXISTS (
  SELECT 1 FROM most_recent_dataset_version_per_dataset AS mrdv
  WHERE dv.uuid = mrdv.uuid
)
```

## Important Safety Notes

### Trigger Disabling
The optimization uses `ALTER TABLE DISABLE TRIGGER ALL` which:
- **Requires SUPERUSER or table owner privileges** - Ensure the database user has appropriate permissions
- **Is safe for old records** - Since we're deleting old dataset versions that won't be updated, there's no risk of new dependencies being created during the batch
- **Automatically re-enabled** - Triggers are re-enabled after each batch, so normal operations remain protected
- **Within transaction** - If an error occurs, the entire batch (including trigger state) is rolled back

### Why This Is Safe
1. **Old records are immutable** - Dataset versions being deleted are historical and won't have new dependencies
2. **Manual deletion first** - We delete ALL dependent records before disabling triggers
3. **Batch isolation** - Each batch is independent; triggers are always restored
4. **No data integrity risk** - We're following the exact same deletion order as CASCADE would, just faster

## Testing Recommendations
1. Test with a subset of data first to verify correctness
2. Monitor database metrics (CPU, I/O, lock waits) during retention
3. Verify no orphaned records after retention completes
4. Consider dry-run mode first to estimate impact
5. **Check database permissions** - Ensure user can disable/enable triggers
6. **Monitor trigger state** - Verify triggers are properly re-enabled after each batch

## Rollback Plan
If issues arise, the CASCADE constraints still exist, so reverting to the previous code would restore the original (slower) behavior without data loss.
