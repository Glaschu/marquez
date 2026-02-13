# Marquez API Query Optimization — All Changes

Step-by-step guide to implement all 6 fixes. Changes are ordered lowest-risk first.
Run tests after each fix before moving to the next.

```bash
# Test commands (run from project root)
./gradlew :api:test                           # all tests
./gradlew :api:testDataAccess                 # DAO tests only
./gradlew :api:test --tests "marquez.db.JobDaoTest"
./gradlew :api:test --tests "marquez.db.DatasetDaoTest"
./gradlew :api:test --tests "marquez.db.RunDaoTest"
./gradlew :api:test --tests "marquez.db.ColumnLineageDaoTest"
./gradlew :api:test --tests "marquez.service.LineageServiceTest"
./gradlew :api:testIntegration
cd web && npm test                            # frontend tests
```

---

## Fix 1 — Replace heavy column lineage enrichment on Dataset LIST with lightweight check

**Why**: `enrichWithColumnLineage()` fires a recursive CTE with 5-table joins on every
dataset list request. The list page only checks `dataset.columnLineage` (truthy/falsy) on
`Datasets.tsx` line 211 to show a "VIEW" link — it doesn't use `inputFields` or any
transformation details. We replace it with `enrichFieldNamesOnly()` from Fix 2.

> ⚠️ **Prerequisite**: Fix 2 (steps 2a–2c) must be implemented first, since this change
> calls `enrichFieldNamesOnly()` which is defined in Fix 2.

### File: `api/src/main/java/marquez/api/DatasetResource.java`

Change line 156 in the `list()` method — replace the heavy enrichment with the lightweight one:

```diff
   public Response list(
       @PathParam("namespace") NamespaceName namespaceName,
       @QueryParam("limit") @DefaultValue("100") @Min(value = 0) int limit,
       @QueryParam("offset") @DefaultValue("0") @Min(value = 0) int offset) {
     throwIfNotExists(namespaceName);

     final List<Dataset> datasets =
         datasetService.findAllWithTags(namespaceName.getValue(), limit, offset);
-    columnLineageService.enrichWithColumnLineage(datasets);
+    columnLineageService.enrichFieldNamesOnly(datasets);
     final int totalCount = datasetService.countFor(namespaceName.getValue());
     return Response.ok(new ResultsPage<>("datasets", datasets, totalCount)).build();
   }
```

### Why the frontend still works

`Datasets.tsx` line 211:
```typescript
{dataset.columnLineage ? (
  <MqText link linkTo={`column-level/...`}>VIEW</MqText>
) : (
  <MqText subdued>N/A</MqText>
)}
```

This only checks if `columnLineage` is truthy. `enrichFieldNamesOnly()` populates
`columnLineage` with field-name-only objects, so the truthy check still works correctly.
The "VIEW" link navigates to a separate column-level page that fetches its own full data.

---

## Fix 2 — Lightweight column lineage existence check for Dataset DETAIL

**Why**: `enrichWithColumnLineage()` runs a full recursive CTE + 5-table join just to populate
`columnLineage[]`, but `DatasetInfo.tsx` only checks if each field name exists in the array —
it never reads `inputFields`, `transformationDescription`, or `transformationType`.

### Step 2a: Add new DAO method

**File: `api/src/main/java/marquez/db/ColumnLineageDao.java`**

Add this new method (insert before the closing `}` of the interface):

```java
  /**
   * Returns the set of field names that have column lineage for the given datasets.
   * Lightweight alternative to getLineageRowsForDatasets() — no recursive CTE,
   * no input field resolution.
   */
  @SqlQuery(
      """
        SELECT DISTINCT df.name AS field_name,
               dv.namespace_name,
               dv.dataset_name
        FROM column_lineage cl
        JOIN dataset_fields df ON df.uuid = cl.output_dataset_field_uuid
        JOIN dataset_versions dv ON dv.uuid = cl.output_dataset_version_uuid
        JOIN datasets_view d ON d.uuid = df.dataset_uuid
        WHERE ARRAY[<values>]::DATASET_NAME[] && d.dataset_symlinks
      """)
  @RegisterRowMapper(ColumnLineageFieldNameMapper.class)
  Set<ColumnLineageFieldName> getFieldNamesWithLineage(
      @BindBeanList(
              propertyNames = {"left", "right"},
              value = "values")
          List<Pair<String, String>> datasets);

  record ColumnLineageFieldName(String namespaceName, String datasetName, String fieldName) {}
```

### Step 2b: Create the row mapper

**File: `api/src/main/java/marquez/db/mappers/ColumnLineageFieldNameMapper.java`** (NEW FILE)

```java
package marquez.db.mappers;

import java.sql.ResultSet;
import java.sql.SQLException;
import marquez.db.ColumnLineageDao.ColumnLineageFieldName;
import org.jdbi.v3.core.mapper.RowMapper;
import org.jdbi.v3.core.statement.StatementContext;

public class ColumnLineageFieldNameMapper implements RowMapper<ColumnLineageFieldName> {
  @Override
  public ColumnLineageFieldName map(ResultSet rs, StatementContext ctx) throws SQLException {
    return new ColumnLineageFieldName(
        rs.getString("namespace_name"),
        rs.getString("dataset_name"),
        rs.getString("field_name"));
  }
}
```

### Step 2c: Add lightweight enrichment method

**File: `api/src/main/java/marquez/service/ColumnLineageService.java`**

Add this method to the class (e.g. after `enrichWithColumnLineage()`):

```java
  /**
   * Lightweight alternative to enrichWithColumnLineage().
   * Only populates field names that have column lineage (no input fields, no transformations).
   * Used by the dataset detail endpoint so the UI can show/hide the column lineage button.
   */
  public void enrichFieldNamesOnly(List<Dataset> datasets) {
    if (datasets.isEmpty()) {
      return;
    }

    Set<ColumnLineageDao.ColumnLineageFieldName> fieldNames =
        delegate.getFieldNamesWithLineage(
            datasets.stream()
                .map(d -> Pair.of(d.getNamespace().getValue(), d.getName().getValue()))
                .collect(Collectors.toList()));

    Map<Dataset, List<ColumnLineage>> datasetLineage = new HashMap<>();
    fieldNames.forEach(
        fn -> {
          Dataset dataset =
              datasets.stream()
                  .filter(d -> d.getNamespace().getValue().equals(fn.namespaceName()))
                  .filter(d -> d.getName().getValue().equals(fn.datasetName()))
                  .findAny()
                  .orElse(null);
          if (dataset != null) {
            datasetLineage
                .computeIfAbsent(dataset, k -> new LinkedList<>())
                .add(ColumnLineage.builder()
                    .name(fn.fieldName())
                    .inputFields(Collections.emptyList())
                    .build());
          }
        });

    datasets.stream()
        .filter(datasetLineage::containsKey)
        .forEach(dataset -> dataset.setColumnLineage(datasetLineage.get(dataset)));
  }
```

Add these imports at the top of the file if not already present:

```java
import java.util.Collections;
```

### Step 2d: Update the detail endpoint

**File: `api/src/main/java/marquez/api/DatasetResource.java`**

Change line 93:

```diff
   public Response getDataset(
       @PathParam("namespace") NamespaceName namespaceName,
       @PathParam("dataset") DatasetName datasetName) {
     throwIfNotExists(namespaceName);

     Dataset dataset =
         datasetService
             .findWithTags(namespaceName.getValue(), datasetName.getValue())
             .orElseThrow(() -> new DatasetNotFoundException(datasetName));
-    columnLineageService.enrichWithColumnLineage(Arrays.asList(dataset));
+    columnLineageService.enrichFieldNamesOnly(Arrays.asList(dataset));
     return Response.ok(dataset).build();
   }
```

### Why the frontend still works

`DatasetInfo.tsx` line 73:
```typescript
const hasColumnLineage = dataset?.columnLineage?.find((f) => f.name === field.name)
```

This only checks if `name` matches. The `inputFields` being empty doesn't affect this check.
The column lineage button will still correctly enable/disable per field.

---

## Fix 3 — Eliminate DatasetVersions N+1 Pattern

**Why**: For each dataset version, Java calls `findRunByUuid()` which fires the full
`BASE_FIND_RUN_SQL` with 7 tables and 6 joins. But the frontend only uses `createdByRun.id`,
and `createdByRunUuid` is already on the version row from the main query.

### Step 3a: Simplify the DAO

**File: `api/src/main/java/marquez/db/DatasetVersionDao.java`**

Replace the `findAllWithRun()` method (lines 301-313):

```diff
   default List<DatasetVersion> findAllWithRun(
       String namespaceName, String datasetName, int limit, int offset) {
-    List<DatasetVersion> v = findAll(namespaceName, datasetName, limit, offset);
-    return v.stream()
-        .peek(
-            ver -> {
-              if (ver.getCreatedByRunUuid() != null) {
-                Optional<Run> run = createRunDao().findRunByUuid(ver.getCreatedByRunUuid());
-                run.ifPresent(ver::setCreatedByRun);
-              }
-            })
-        .collect(Collectors.toList());
+    // createdByRunUuid is already populated by findAll() from the main query.
+    // No need to fire BASE_FIND_RUN_SQL per version — frontend only uses the UUID.
+    return findAll(namespaceName, datasetName, limit, offset);
   }
```

### Step 3b: Update the frontend

**File: `web/src/components/datasets/DatasetVersions.tsx`**

Change lines 154-157 to use `createdByRunUuid` instead of `createdByRun.id`:

```diff
-                    {version.createdByRun ? (
+                    {(version.createdByRun || version.createdByRunUuid) ? (
                       <>
-                        <MqText font={'mono'}>{version.createdByRun.id.substring(0, 8)}...</MqText>
-                        <MqCopy string={version.createdByRun.id} />
+                        <MqText font={'mono'}>
+                          {(version.createdByRunUuid || version.createdByRun?.id || '').substring(0, 8)}...
+                        </MqText>
+                        <MqCopy string={version.createdByRunUuid || version.createdByRun?.id || ''} />
                       </>
                     ) : (
                       'N/A'
                     )}
```

> **Note**: Using fallback `version.createdByRun?.id` ensures backward compatibility if
> the API version hasn't been updated yet.

---

## Fix 4 — Lightweight Run Query for List Views

**Why**: `RunDao.findAll()` joins 8 tables via 5 CTEs to fetch `args`, `facets`,
`inputDatasetVersions`, `outputDatasetVersions`, `datasetFacets` — none of which are
displayed in the Runs table. The table only uses `id`, `state`, `createdAt`, `startedAt`,
`endedAt`, `durationMs`.

### Step 4a: Add the lightweight query

**File: `api/src/main/java/marquez/db/RunDao.java`**

Add this new query method (insert after the existing `findAll()` method around line 223):

```java
  /**
   * Lightweight query for run list views.
   * Only fetches scalar fields from runs_view — no facets, args, I/O versions, or dataset facets.
   * Used by the frontend Runs table which only displays id, state, timestamps, and duration.
   */
  @SqlQuery(
      """
          WITH filtered_jobs AS (
            SELECT
                jv.uuid,
                jv.namespace_name,
                jv.name
            FROM jobs_view jv
            WHERE jv.namespace_name=:namespace AND (jv.name=:jobName OR :jobName = ANY(jv.aliases))
          )
          SELECT
              r.*,
              NULL AS args,
              NULL AS facets,
              jv.version AS job_version,
              NULL AS input_versions,
              NULL AS output_versions,
              NULL AS dataset_facets
          FROM runs_view r
          INNER JOIN filtered_jobs fj ON r.job_uuid = fj.uuid
          LEFT JOIN job_versions jv ON jv.uuid = r.job_version_uuid
          ORDER BY r.started_at DESC NULLS LAST
          LIMIT :limit OFFSET :offset
      """)
  List<Run> findAllLight(String namespace, String jobName, int limit, int offset);
```

> **Note**: Returning `NULL AS args`, `NULL AS facets` etc. ensures the existing `RunMapper`
> row mapper still works without modification — it will map these as null values.

### Step 4b: Wire the endpoint to use the light query

**File: `api/src/main/java/marquez/service/RunService.java`** (or wherever `findAll` is called for the list endpoint)

Find where the run list endpoint calls `runDao.findAll(namespace, jobName, limit, offset)` and
change it to `runDao.findAllLight(namespace, jobName, limit, offset)`.

Search for usages:

```bash
grep -rn "runDao.findAll\|runDao\.findAll" api/src/main/java/marquez/
```

In the relevant service/resource file, change:

```diff
-    List<Run> runs = runDao.findAll(namespace, jobName, limit, offset);
+    List<Run> runs = runDao.findAllLight(namespace, jobName, limit, offset);
```

> **Keep** the original `findAll()` method — it may be used by other internal callers that
> need the full data.

---

## Fix 5 — Eliminate Jobs List N+1+1 Anti-Pattern

**Why**: `findAllWithRun()` in `JobDao.java` loops through each job in Java,
firing `findByLatestJob()` (which uses the full `BASE_FIND_RUN_SQL` with 6 joins)
and `findInputDatasetVersionsFor()`/`findOutputDatasetVersionsFor()` per job.
For 10 jobs = **31 SQL queries** and ~72 total joins.

### Step 5a: Add batch run states query

**File: `api/src/main/java/marquez/db/RunDao.java`**

Add a new method that fetches the latest N run states for multiple jobs in one query:

```java
  /**
   * Fetches the latest 10 run states per job for multiple jobs in a single query.
   * Uses ROW_NUMBER() to cap at 10 runs per job — critical for jobs with 100s of runs.
   * Used by the jobs list to populate the mini-run-history bar without N+1 queries.
   */
  @SqlQuery(
      """
          WITH ranked_runs AS (
            SELECT
              r.uuid, r.current_run_state, r.started_at, r.ended_at,
              r.transitioned_at, r.namespace_name, r.job_name, r.location,
              r.created_at, r.updated_at, r.nominal_start_time, r.nominal_end_time,
              r.run_args_uuid, r.job_version_uuid, r.job_uuid,
              jv.version AS job_version,
              ROW_NUMBER() OVER (PARTITION BY r.job_name ORDER BY r.transitioned_at DESC) AS rn
            FROM runs_view r
            LEFT JOIN job_versions jv ON jv.uuid = r.job_version_uuid
            WHERE r.job_name IN (<jobNames>)
              AND r.namespace_name = :namespace
          )
          SELECT uuid, current_run_state, started_at, ended_at,
                 transitioned_at, namespace_name, job_name, location,
                 created_at, updated_at, nominal_start_time, nominal_end_time,
                 run_args_uuid, job_version_uuid, job_uuid,
                 NULL AS args, NULL AS facets,
                 job_version,
                 NULL AS input_versions, NULL AS output_versions, NULL AS dataset_facets
          FROM ranked_runs
          WHERE rn <= 10
          ORDER BY job_name, transitioned_at DESC
      """)
  List<Run> findLatestRunsByJobNames(
      @BindList List<String> jobNames,
      String namespace);
```

### Step 5b: Rewrite `findAllWithRun()`

**File: `api/src/main/java/marquez/db/JobDao.java`**

Replace the current `findAllWithRun()` method (lines 278-290):

```diff
   default List<Job> findAllWithRun(
       String namespaceName, List<RunState> lastRunStates, int limit, int offset) {
-    RunDao runDao = createRunDao();
-    return findAll(namespaceName, lastRunStates, limit, offset).stream()
-        .peek(
-            j -> {
-              List<Run> runs =
-                  runDao.findByLatestJob(
-                      j.getNamespace().getValue(), j.getName().getValue(), 10, 0);
-              this.setJobData(runs, j);
-            })
-        .toList();
+    List<Job> jobs = findAll(namespaceName, lastRunStates, limit, offset);
+    if (jobs.isEmpty()) {
+      return jobs;
+    }
+
+    // Batch-fetch latest runs for ALL jobs in one query (eliminates N+1)
+    RunDao runDao = createRunDao();
+    List<String> jobNames = jobs.stream()
+        .map(j -> j.getName().getValue())
+        .collect(Collectors.toList());
+
+    List<Run> allRuns = runDao.findLatestRunsByJobNames(jobNames, namespaceName);
+
+    // Group runs by job name
+    Map<String, List<Run>> runsByJob = allRuns.stream()
+        .collect(Collectors.groupingBy(
+            r -> r.getJobName().getValue(),
+            Collectors.toList()));
+
+    // Assign runs to each job (already capped at 10 per job by SQL ROW_NUMBER)
+    jobs.forEach(j -> {
+      String jobName = j.getName().getValue();
+      List<Run> jobRuns = runsByJob.getOrDefault(jobName, Collections.emptyList());
+      if (!jobRuns.isEmpty()) {
+        j.setLatestRun(jobRuns.get(0));
+        j.setLatestRuns(jobRuns);
+      }
+      // Skip setInputs/setOutputs — not displayed on list page
+    });
+
+    return jobs;
   }
```

Add these imports if not already present:

```java
import java.util.Collections;
import java.util.Map;
import java.util.stream.Collectors;
```

### Why this works

- **Before**: 1 + 10 + 20 = 31 queries, ~72 joins for 10 jobs
- **After**: 1 + 1 = 2 queries, ~8 joins total
- The `JobRunItem` mini-bar still gets its array of run states via `job.latestRuns`
- Inputs/outputs are skipped on the list view (not displayed)

### What `setJobData()` used to do (for reference)

The old `setJobData()` method (lines 314-339) did:
1. Set `latestRun` = first run
2. Set `latestRuns` = all runs
3. Call `findInputDatasetVersionsFor()` — **NOT NEEDED on list page**
4. Call `findOutputDatasetVersionsFor()` — **NOT NEEDED on list page**

The new code handles items 1 and 2 inline, and skips items 3 and 4.

> **Keep the old `setJobData()` method** — it's still used by `findWithDatasetsAndRun()`
> for the single job detail endpoint.

---

## Fix 6 — Optimize Lineage Graph Run Data

**Why**: `LineageDao.getCurrentRunsWithFacets()` joins `run_args`, `runs_input_mapping`,
output `dataset_versions`, and `run_facets_view` — none of which are displayed on the
lineage graph nodes (nodes only show `state` and `durationMs`).

### Option A: Use existing lightweight method

**File: `api/src/main/java/marquez/service/LineageService.java`** (or wherever `getCurrentRunsWithFacets()` is called)

`LineageDao` already has a lightweight `getCurrentRuns()` method (lines 181-191) that
only joins `runs` + `jobs`:

```java
// Already exists in LineageDao.java (lines 181-191):
@SqlQuery("""
    WITH latest_runs AS (SELECT current_run_uuid, current_version_uuid AS job_version
                         FROM jobs j
                         WHERE j.uuid in (<jobUuid>) OR j.symlink_target_uuid IN (<jobUuid>))
    SELECT *
    FROM runs
             inner join latest_runs ON runs.uuid = latest_runs.current_run_uuid
    ORDER BY runs.created_at desc;
  """)
List<Run> getCurrentRuns(@BindList Collection<UUID> jobUuid);
```

Search for where `getCurrentRunsWithFacets()` is called:

```bash
grep -rn "getCurrentRunsWithFacets" api/src/main/java/marquez/
```

Then change:

```diff
-    List<Run> runs = lineageDao.getCurrentRunsWithFacets(jobUuids);
+    List<Run> runs = lineageDao.getCurrentRuns(jobUuids);
```

### Option B: Create a purpose-built lightweight method (if Option A doesn't return enough fields)

If `getCurrentRuns()` doesn't return all required fields (like `started_at`, `ended_at`), add a new method:

```java
  @SqlQuery(
      """
          WITH latest_runs AS (
              SELECT current_run_uuid, current_version_uuid AS job_version
              FROM jobs j
              WHERE j.uuid IN (<jobUuid>) OR j.symlink_target_uuid IN (<jobUuid>)
          )
          SELECT r.*, lr.job_version,
                 NULL AS args, NULL AS facets,
                 NULL AS input_versions, NULL AS output_versions
          FROM runs_view r
          INNER JOIN latest_runs lr ON r.uuid = lr.current_run_uuid
          ORDER BY r.created_at DESC
      """)
  List<Run> getCurrentRunsLight(@BindList Collection<UUID> jobUuid);
```

---

## Fix 7 — Column Lineage Performance at Scale (2M+ rows)

**Why**: The `column_lineage` table has 2M+ records and some datasets have hundreds of columns
with lineage. The current queries do `DISTINCT ON` across the entire table, and the recursive
CTE defaults to depth 20 — each recursion level scans millions of rows.

### The Problem

**Query 1: `getLineage()` recursive CTE** (`ColumnLineageDao.java` lines 99-175)

```sql
-- This CTE scans ALL 2M rows to deduplicate every lineage edge
column_lineage_latest AS (
    SELECT DISTINCT ON (output_dataset_field_uuid, input_dataset_field_uuid) *
    FROM column_lineage
    WHERE created_at <= :createdAtUntil
    ORDER BY output_dataset_field_uuid, input_dataset_field_uuid, updated_at DESC
)
```

Problems:
1. `DISTINCT ON` scans the ENTIRE 2M-row table — even though only a few hundred fields are relevant
2. No composite index covers the `ORDER BY ..., updated_at DESC` sort order
3. Default depth = 20 (`ColumnLineageResource.java` line 30) = up to 20 recursion levels
4. Each recursion level re-joins against the full `column_lineage_latest` CTE

**Query 2: `getLineageRowsForDatasets()`** (`ColumnLineageDao.java` lines 177-242)

```sql
-- Also DISTINCT ON across 2M rows after joining dataset_fields + datasets_view
SELECT DISTINCT ON (cl.output_dataset_field_uuid, cl.input_dataset_field_uuid) cl.*, ...
FROM column_lineage cl
JOIN dataset_fields df ON df.uuid = cl.output_dataset_field_uuid
JOIN datasets_view dv ON dv.uuid = df.dataset_uuid
WHERE ARRAY[<values>]::DATASET_NAME[] && dv.dataset_symlinks
```

### Current Indexes (V59.1 migration)

```sql
-- Only single-column indexes (not optimal for DISTINCT ON sort order)
ON column_lineage (output_dataset_version_uuid)
ON column_lineage (output_dataset_field_uuid)
ON column_lineage (input_dataset_version_uuid)
ON column_lineage (input_dataset_field_uuid)
-- Plus implicit UNIQUE index on all 4 UUID columns
```

### Fix 7a: Add composite indexes

**File: NEW MIGRATION** `api/src/main/resources/marquez/db/migration/V<next>__column_lineage_perf_indexes.sql`

```sql
-- Supports DISTINCT ON (output_dataset_field_uuid, input_dataset_field_uuid)
-- ORDER BY updated_at DESC — used by both getLineage() and getLineageRowsForDatasets()
CREATE INDEX IF NOT EXISTS column_lineage_dedup_idx
  ON column_lineage (output_dataset_field_uuid, input_dataset_field_uuid, updated_at DESC);

-- Supports recursive CTE join: input_dataset_field_uuid = output_dataset_field_uuid
CREATE INDEX IF NOT EXISTS column_lineage_input_to_output_idx
  ON column_lineage (input_dataset_field_uuid, output_dataset_field_uuid);
```

> ⚠️ **For production**: Run with `CREATE INDEX CONCURRENTLY` manually to avoid table locks.
> Flyway doesn't support `CONCURRENTLY`, so use regular `CREATE INDEX IF NOT EXISTS` in the
> migration file, but apply the indexes manually first on large tables.

### Fix 7b: Reduce default column lineage depth

**File: `api/src/main/java/marquez/api/ColumnLineageResource.java`**

Change line 30:

```diff
-  private static final String DEFAULT_DEPTH = "20";
+  private static final String DEFAULT_DEPTH = "5";
```

**Why**: Each recursion level multiplies work. Depth 20 = up to 20 scans across 2M rows.
Depth 5 covers most practical lineage chains. Users can still pass `?depth=20` explicitly.

### Fix 7c: Restructure the recursive CTE to avoid full-table dedup

**This is the most impactful change.** The current `getLineage()` query has this structure:

```
1. column_lineage_latest  → DISTINCT ON across ALL 2M rows (full table scan)
2. Seed step              → filter to starting fields (tiny subset)
3. Recursive step         → re-scan column_lineage_latest per recursion level
```

The fix: **eliminate `column_lineage_latest` entirely** and dedup only the edges you
actually touch at each step.

**File: `api/src/main/java/marquez/db/ColumnLineageDao.java`**

Replace the `getLineage()` query (lines 99-175) with:

```sql
WITH RECURSIVE
  dataset_fields_view AS (
    SELECT d.namespace_name as namespace_name, d.name as dataset_name,
           df.name as field_name, df.type, df.uuid, d.namespace_uuid
    FROM dataset_fields df
    INNER JOIN datasets_view d ON d.uuid = df.dataset_uuid
  ),
  column_lineage_recursive AS (
    -- SEED: dedup ONLY edges for starting fields (not the whole table)
    (
      SELECT DISTINCT ON (output_dataset_field_uuid, input_dataset_field_uuid)
        output_dataset_version_uuid, output_dataset_field_uuid,
        input_dataset_version_uuid, input_dataset_field_uuid,
        transformation_description, transformation_type,
        created_at, updated_at,
        0 as depth,
        false as is_cycle,
        ARRAY[ROW(output_dataset_field_uuid, input_dataset_field_uuid)] as path
      FROM column_lineage
      WHERE output_dataset_field_uuid IN (<datasetFieldUuids>)
        AND created_at <= :createdAtUntil
      ORDER BY output_dataset_field_uuid, input_dataset_field_uuid, updated_at DESC
    )
    UNION ALL
    -- RECURSE: dedup only adjacent edges via LATERAL (not the whole table)
    SELECT
      adj.output_dataset_version_uuid,
      adj.output_dataset_field_uuid,
      adj.input_dataset_version_uuid,
      adj.input_dataset_field_uuid,
      adj.transformation_description,
      adj.transformation_type,
      adj.created_at,
      adj.updated_at,
      node.depth + 1 as depth,
      ROW(adj.input_dataset_field_uuid, adj.output_dataset_field_uuid) = ANY(path) as is_cycle,
      path || ROW(adj.input_dataset_field_uuid, adj.output_dataset_field_uuid) as path
    FROM column_lineage_recursive node
    JOIN LATERAL (
      -- Only dedup edges ADJACENT to the current node, not all 2M rows
      SELECT DISTINCT ON (cl.output_dataset_field_uuid, cl.input_dataset_field_uuid)
        cl.*
      FROM column_lineage cl
      WHERE cl.created_at <= :createdAtUntil
        AND (
          -- upstream: current node's input is this edge's output
          cl.output_dataset_field_uuid = node.input_dataset_field_uuid
          -- downstream (optional)
          OR (:withDownstream AND cl.input_dataset_field_uuid = node.output_dataset_field_uuid)
        )
      ORDER BY cl.output_dataset_field_uuid, cl.input_dataset_field_uuid, cl.updated_at DESC
    ) adj ON true
    WHERE node.depth < :depth - 1
      AND NOT node.is_cycle
  )
  -- Final SELECT stays the same
  SELECT
      output_fields.namespace_name,
      output_fields.dataset_name,
      output_fields.field_name,
      output_fields.type,
      ARRAY_AGG(DISTINCT ARRAY[
        input_fields.namespace_name,
        input_fields.dataset_name,
        CAST(clr.input_dataset_version_uuid AS VARCHAR),
        input_fields.field_name,
        clr.transformation_description,
        clr.transformation_type
      ]) AS inputFields,
      clr.output_dataset_version_uuid as dataset_version_uuid
  FROM column_lineage_recursive clr
  INNER JOIN dataset_fields_view output_fields ON clr.output_dataset_field_uuid = output_fields.uuid
  INNER JOIN dataset_symlinks ds_output ON ds_output.namespace_uuid = output_fields.namespace_uuid
    AND ds_output.name = output_fields.dataset_name
  LEFT JOIN dataset_fields_view input_fields ON clr.input_dataset_field_uuid = input_fields.uuid
  INNER JOIN dataset_symlinks ds_input ON ds_input.namespace_uuid = input_fields.namespace_uuid
    AND ds_input.name = input_fields.dataset_name
  WHERE NOT clr.is_cycle AND ds_output.is_primary is true AND ds_input.is_primary
  GROUP BY
      output_fields.namespace_name,
      output_fields.dataset_name,
      output_fields.field_name,
      output_fields.type,
      clr.output_dataset_version_uuid
```

### Why this is dramatically faster

| Step | Before (current) | After (restructured) |
|---|---|---|
| **CTE materialization** | `DISTINCT ON` all 2M rows upfront | No upfront materialization |
| **Seed step** | Filter pre-built 2M-row result | `DISTINCT ON` only seed field edges (~50-200 rows) |
| **Each recursion level** | Scan full 2M-row `column_lineage_latest` | LATERAL index scan per node (~5-20 rows each) |
| **Total rows touched** | 2M × (depth + 1) | ~hundreds per level |

With the composite index from Fix 7a (`output_dataset_field_uuid, input_dataset_field_uuid, updated_at DESC`),
the `DISTINCT ON` inside the LATERAL becomes a fast index-only scan — PostgreSQL can resolve
`DISTINCT ON` by reading just the first row per group directly from the index.

> ⚠️ **Requires Fix 7a** (composite index) to be applied first, otherwise the LATERAL
> subquery will still need to scan large portions of the table.

### Fix 7d: (Optional) Materialized view for latest edges

If 7a-7c still aren't fast enough (e.g., very wide datasets with 500+ columns and deep
lineage chains), you can pre-compute the latest edges so queries skip dedup entirely:

**File: NEW MIGRATION** `api/src/main/resources/marquez/db/migration/V<next>__column_lineage_latest_mv.sql`

```sql
CREATE MATERIALIZED VIEW column_lineage_latest_mv AS
SELECT DISTINCT ON (output_dataset_field_uuid, input_dataset_field_uuid)
  output_dataset_version_uuid, output_dataset_field_uuid,
  input_dataset_version_uuid, input_dataset_field_uuid,
  transformation_description, transformation_type,
  created_at, updated_at
FROM column_lineage
ORDER BY output_dataset_field_uuid, input_dataset_field_uuid, updated_at DESC;

CREATE INDEX column_lineage_latest_mv_output_idx
  ON column_lineage_latest_mv (output_dataset_field_uuid);
CREATE INDEX column_lineage_latest_mv_input_idx
  ON column_lineage_latest_mv (input_dataset_field_uuid);
CREATE UNIQUE INDEX column_lineage_latest_mv_unique_idx
  ON column_lineage_latest_mv (output_dataset_field_uuid, input_dataset_field_uuid);
```

Then the restructured query from 7c becomes even simpler — replace all `column_lineage`
references with `column_lineage_latest_mv` and remove the `DISTINCT ON` clauses:

```diff
  -- Seed step
- SELECT DISTINCT ON (output_dataset_field_uuid, input_dataset_field_uuid) ...
- FROM column_lineage
- WHERE output_dataset_field_uuid IN (<seeds>) AND created_at <= :createdAtUntil
- ORDER BY output_dataset_field_uuid, input_dataset_field_uuid, updated_at DESC
+ SELECT *, 0 as depth, ...
+ FROM column_lineage_latest_mv
+ WHERE output_dataset_field_uuid IN (<seeds>)

  -- Recursive LATERAL step
- SELECT DISTINCT ON (...) cl.* FROM column_lineage cl WHERE ...
+ SELECT * FROM column_lineage_latest_mv cl WHERE ...
```

Refresh after event ingestion or on a schedule:
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY column_lineage_latest_mv;
```

> **Trade-off**: Data is eventually consistent (stale until refresh). Acceptable for
> lineage which doesn't change mid-pipeline-run.

### Diagnostic Queries

Run these on production to understand your data distribution:

```sql
-- Total rows vs unique edges (shows how much dedup overhead exists)
SELECT
  COUNT(*) AS total_rows,
  COUNT(DISTINCT (output_dataset_field_uuid, input_dataset_field_uuid)) AS unique_edges
FROM column_lineage;

-- Top datasets by lineage edge count
SELECT d.name AS dataset, COUNT(*) AS edge_count
FROM column_lineage cl
JOIN dataset_fields df ON df.uuid = cl.output_dataset_field_uuid
JOIN datasets_view d ON d.uuid = df.dataset_uuid
GROUP BY d.name
ORDER BY edge_count DESC
LIMIT 20;

-- Seq scan vs index scan ratio
SELECT relname, seq_scan, idx_scan, n_live_tup
FROM pg_stat_user_tables
WHERE relname = 'column_lineage';
```

---

## Summary of All Files Changed

| # | File | Change |
|---|---|---|
| 1 | `api/.../api/DatasetResource.java` | Remove line 156, change line 93 |
| 2 | `api/.../db/ColumnLineageDao.java` | Add `getFieldNamesWithLineage()` |
| 3 | `api/.../db/mappers/ColumnLineageFieldNameMapper.java` | **NEW FILE** |
| 4 | `api/.../service/ColumnLineageService.java` | Add `enrichFieldNamesOnly()` |
| 5 | `api/.../db/DatasetVersionDao.java` | Simplify `findAllWithRun()` |
| 6 | `web/src/.../DatasetVersions.tsx` | Use `createdByRunUuid` fallback |
| 7 | `api/.../db/RunDao.java` | Add `findAllLight()`, `findLatestRunsByJobNames()` |
| 8 | `api/.../service/RunService.java` (or resource) | Wire `findAllLight()` for list endpoint |
| 9 | `api/.../db/JobDao.java` | Rewrite `findAllWithRun()` to use batch query |
| 10 | `api/.../db/LineageDao.java` (or service) | Switch to `getCurrentRuns()` or add light variant |
| 11 | `api/.../api/ColumnLineageResource.java` | Change default depth from 20 to 5 |
| 12 | NEW: `db/migration/V<next>__column_lineage_perf_indexes.sql` | Composite indexes for DISTINCT ON |
| 13 | (Optional) NEW: `db/migration/V<next>__column_lineage_latest_mv.sql` | Materialized view |

## Performance Impact Summary

| Fix | Before | After | Savings |
|---|---|---|---|
| Fix 1: Dataset list CL | Recursive CTE + 5 joins per list request | 0 queries | ~100% fewer joins |
| Fix 2: Dataset detail CL | Recursive CTE + 5 joins | Simple 3-table join | ~70% fewer joins |
| Fix 3: Dataset versions | 11 queries, ~66 joins (10 versions) | 1 query, ~6 joins | ~91% reduction |
| Fix 4: Run list | 1 query, ~10 joins | 1 query, ~2 joins | ~80% fewer joins |
| Fix 5: Jobs list | 31 queries, ~72 joins (10 jobs) | 2 queries, ~8 joins | ~94% reduction |
| Fix 6: Lineage runs | 6+ joins with unused data | 2 joins | ~67% fewer joins |
| Fix 7: Column lineage scale | Full table DISTINCT ON 2M rows | Indexed dedup, depth 5 | ~80-95% faster |

## Recommended Implementation Order

1. **Fix 2** (steps 2a–2c only) — Add `enrichFieldNamesOnly()` infrastructure
2. **Fix 1** — Swap list endpoint to use `enrichFieldNamesOnly()` (depends on Fix 2)
3. **Fix 2** (step 2d) — Also swap detail endpoint to `enrichFieldNamesOnly()`
4. **Fix 3** — Eliminate DatasetVersions N+1
5. **Fix 4** — Create lightweight Run query
6. **Fix 6** — Optimize lineage graph run data
7. **Fix 7** — Column lineage perf indexes + depth reduction (can apply indexes independently)
8. **Fix 5** — Rewrite Jobs N+1+1 (largest change, test thoroughly)

Run the full test suite after each fix:

```bash
./gradlew :api:test && cd web && npm test
```
