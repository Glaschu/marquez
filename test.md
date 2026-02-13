Marquez API: Complete Frontend Query Waste Report
Every API call the frontend makes, ranked by combined data over-fetching (fields fetched but not displayed) and SQL expense (joins, N+1 patterns, tables touched).

Master Summary Table
#	Frontend Hook	API Endpoint	SQL Queries/Req	Tables Joined	N+1?	Over-Fetch%	Severity
1	
useJobs
GET /jobs	1 + 3N	14	🔴 N+1+1	~70%	🔴 Critical
2	
useDatasetVersions
GET /datasets/{ds}/versions	1 + N	8+	🔴 N+1	~40%	🔴 High
3	
useJob
GET /jobs/{job}	5	14	⚠️	~30%	🟠 High
4	
useJobRuns
GET /jobs/{job}/runs	1	8	❌	~50%	🟡 Medium
5	
useDatasets
GET /datasets	1 + N + 1	8+	⚠️ Fields + CL	~40%	🟡 Medium
6	
useDataset
GET /datasets/{ds}	3	8+	⚠️ CL enrichment	~20%	🟡 Medium
7	
useLineage
GET /lineage	3-5	8	❌	~30%	🟡 Medium
8	
useEvents
GET /events/lineage	2	1	❌	~0%*	🟢 Low
9	
useRunFacets
GET /runs/{id}/facets?type=run	1	1	❌	0%	🟢 Trivial
10	
useJobFacets
GET /runs/{id}/facets?type=job	1	1	❌	0%	🟢 Trivial
11	useLineageMetrics	GET /stats/lineage-events	1	2	❌	0%	🟢 Trivial
12	useIntervalMetrics	GET /stats/{asset}	1	2	❌	0%	🟢 Trivial
13	
getNamespaces
GET /namespaces	1	1	❌	0%	🟢 Trivial
14	
getSearch
GET /search	1	2	❌	0%	🟢 Trivial
15	
getTags
GET /tags	1	1	❌	0%	🟢 Trivial
16	useColumnLineage	GET /column-lineage	1	5	❌	0%	🟢 Low
* Events displays full JSON in expandable row, so the large payload is used on click.

🔴 #1 — Jobs List (
useJobs
)
Hook: 
useJobs
 → 
getJobs
 Endpoint: GET /namespaces/{ns}/jobs?limit=25&offset=0 Backend: 
JobDao.findAllWithRun()
 Pages: Dashboard (
JobRunItem
), Job list

SQL Cost
Layer	What Happens	Queries	Joins
1. 
findAll()
Main query: 4 CTEs joining jobs_view → job_versions → job_facets_view → jobs_tag_mapping → tags → runs	1	6
2. 
findByLatestJob()
 per job	Fires BASE_FIND_RUN_SQL: runs_view → run_facets_view → run_args → job_versions → runs_input_mapping → dataset_versions → dataset_facets_view	N	6 each
3. Input/output datasets per job	
findInputDatasetVersionsFor()
 + 
findOutputDatasetVersionsFor()
2N	1 each
Total (10 jobs)		31 queries	~72 joins
Data Over-fetching (~70%)
API Returns	Frontend Displays	Wasted?
job.id (JobId object)	❌ Not displayed	✅ Waste
job.name, job.namespace	✅ Displayed	—
job.type	✅ Chip label	—
job.createdAt, job.updatedAt	✅ Tooltip	—
job.tags[]	✅ Chip list	—
job.inputs[] (full DatasetId array)	❌ Not on list view	✅ Waste
job.outputs[] (full DatasetId array)	❌ Not on list view	✅ Waste
job.location	❌ Not on list view	✅ Waste
job.description	❌ Not on list view	✅ Waste
job.facets (full JSON object)	❌ Not on list view	✅ Waste
job.currentVersion (UUID)	❌ Not displayed	✅ Waste
job.labels	❌ Not displayed	✅ Waste
job.latestRun (full Run object)	✅ state, durationMs used	⚠️ Mostly waste
job.latestRuns[] (array of full Run objects)	✅ state, durationMs per run for mini-graph	⚠️ Mostly waste
CAUTION

Worst offender. Each latestRun object contains args, facets, inputDatasetVersions, outputDatasetVersions, jobVersion fetched via the full 6-join BASE_FIND_RUN_SQL. 
JobRunItem
 only uses state and durationMs — 2 out of ~15 fields.

🔴 #2 — Dataset Versions (
useDatasetVersions
)
Hook: 
useDatasetVersions
 → 
getDatasetVersions
 Endpoint: GET /namespaces/{ns}/datasets/{ds}/versions Backend: 
DatasetVersionDao.findAllWithRun()
 Page: 
DatasetVersions.tsx

SQL Cost
Layer	What Happens	Queries	Joins
1. 
findAll()
2 CTEs: dataset_info joins dataset_versions → datasets_view → stream_versions → tags → datasets_tag_mapping → dataset_facets_view → dataset_symlinks	1	6
2. 
findRunByUuid()
 per version	Full BASE_FIND_RUN_SQL (7 tables, 6 joins) — per version row	N	6 each
Total (10 versions)		11 queries	~66 joins
Data Over-fetching (~40%)
API Returns	Frontend Displays	Wasted?
version.version (UUID)	✅ Displayed	—
version.createdAt	✅ Displayed	—
version.fields	✅ fields.length count	⚠️ Full array for just a count
version.lifecycleState	✅ Status chip	—
version.createdByRun (full Run object)	Only createdByRun.id used	🔴 Major waste
version.facets (full JSON)	❌ Not on list view	✅ Waste
version.sourceName	❌ Not displayed	✅ Waste
version.description	❌ Not displayed	✅ Waste
version.physicalName	❌ Not displayed	✅ Waste
version.schemaLocation	❌ Not displayed	✅ Waste
version.tags	❌ Not on version list	✅ Waste
WARNING

The createdByRunUuid is already on the version row from the main query. The Java code then fires 
findRunByUuid()
 (full BASE_FIND_RUN_SQL with 6 joins) per version just to populate createdByRun — but the frontend only accesses createdByRun.id. All joins are unnecessary.

🟠 #3 — Single Job Detail (
useJob
)
Hook: 
useJob
 → 
getJob
 Endpoint: GET /namespaces/{ns}/jobs/{job} Backend: 
JobDao.findWithDatasetsAndRun()
 Page: 
JobDetailPage.tsx

SQL Cost
Step	Query	Joins
findJobByName()
4 CTEs: jobs_view → job_versions → job_facets_view → tags → jobs_tag_mapping	6
findByLatestJob()
BASE_FIND_RUN_SQL (7 tables)	6
setJobData()
 input/output	2 queries for dataset_versions	1 each
findCurrentInputOutputDatasetsFor()
job_versions_io_mapping → jobs_view → datasets_view	3
Total	5 queries	~17 joins
Data Over-fetching (~30%)
API Returns	Frontend Displays	Wasted?
job.name, namespace, 
type
, description	✅ All displayed	—
job.createdAt, updatedAt, location	✅ Displayed	—
job.tags, parentJobName	✅ Displayed	—
job.latestRun.state, .startedAt, .endedAt, .durationMs	✅ Displayed	—
job.latestRun.args	❌ Not displayed	✅ Waste
job.latestRun.facets	❌ Not on detail (separate call)	✅ Waste
job.latestRun.inputDatasetVersions	❌ Not displayed	✅ Waste
job.latestRun.outputDatasetVersions	❌ Not displayed	✅ Waste
job.inputs[], job.outputs[]	✅ Listed in I/O tab	—
job.facets	❌ Not displayed	✅ Waste
job.currentVersion	❌ Not displayed	✅ Waste
job.labels	❌ Not displayed	✅ Waste
🟡 #4 — Run List (
useJobRuns
)
Hook: 
useJobRuns
 → 
getRuns
 Endpoint: GET /namespaces/{ns}/jobs/{job}/runs Backend: 
RunDao.findAll()
 Page: 
Runs.tsx

SQL Cost
Metric	Value
Total queries	1 (single query, no N+1 — good)
CTEs	5 (filtered_jobs, run_facets_agg, input_versions_agg, output_versions_agg, dataset_facets_agg)
Tables/views	runs_view, run_facets_view, run_args, job_versions, runs_input_mapping, dataset_versions, dataset_facets_view, jobs_view
Joins	~10
Data Over-fetching (~50%)
API Returns	Frontend Displays	Wasted?
run.id	✅ Displayed	—
run.state	✅ Status chip	—
run.createdAt, startedAt, endedAt	✅ Displayed	—
run.durationMs	✅ Duration bar	—
run.args (JSON object)	❌ Not on list	✅ Waste
run.facets (full JSON)	❌ Detail uses separate facets call	✅ Waste
run.jobVersion	❌ Not displayed	✅ Waste
run.inputDatasetVersions[]	❌ Not displayed	✅ Waste
run.outputDatasetVersions[]	❌ Not displayed	✅ Waste
run.namespaceName, jobName	❌ Already known from URL	✅ Waste
run.nominalStartTime/EndTime	❌ Not displayed	✅ Waste
run.location	❌ Not displayed	✅ Waste
NOTE

While the SQL is a single query (no N+1 — which is good), the 5 CTEs for run_facets, input_versions, output_versions, and dataset_facets are joining 4 extra tables that produce data never shown in the 
Runs.tsx
 table. The table only needs 6 scalar fields directly from runs_view.

🟡 #5 — Dataset List (
useDatasets
)
Hook: 
useDatasets
 → 
getDatasets
 Endpoint: GET /namespaces/{ns}/datasets Backend: 
DatasetDao.findAllWithTags()
 + 
DatasetResource.list()

SQL Cost
Layer	What Happens	Queries	Joins
1. 
findAll()
CTE + window function: datasets_view → dataset_versions → stream_versions → tags → datasets_tag_mapping → dataset_facets	1	5
2. 
setFields()
 per dataset	DatasetFieldDao.findByDatasetVersion(): dataset_fields → dataset_fields_tag_mapping → tags → dataset_versions_field_mapping	N	3 each
3. Column lineage enrichment	ColumnLineageDao.getLineageRowsForDatasets(): recursive CTE over column_lineage → dataset_fields → datasets_view → dataset_versions → dataset_symlinks	1	5
Total (20 datasets)		~22 queries	~76 joins
Data Over-fetching (~40%)
API Returns	Frontend Displays	Wasted?
dataset.name, namespace, 
type
✅ Displayed	—
dataset.updatedAt	✅ Displayed	—
dataset.tags	✅ Tags chips	—
dataset.description	✅ Truncated display	—
dataset.facets (full JSON)	❌ Not on list view	✅ Waste
dataset.columnLineage (enriched)	❌ Not on list view	✅ Waste
dataset.fields[] (full array with tags)	❌ Not on list view	✅ Waste
dataset.currentVersion	❌ Not displayed	✅ Waste
dataset.sourceName	❌ Not displayed	✅ Waste
dataset.physicalName	❌ Not displayed	✅ Waste
dataset.lastModifiedAt	❌ Not displayed	✅ Waste
dataset.lastLifecycleState	❌ Not displayed	✅ Waste
WARNING

The columnLineageService.enrichWithColumnLineage(datasets) call in 
DatasetResource.list()
 fires a recursive CTE (the most expensive type of SQL query) on every list request. Column lineage is not displayed on the list page.

🟡 #6 — Single Dataset Detail (
useDataset
)
Hook: 
useDataset
 Endpoint: GET /namespaces/{ns}/datasets/{ds} Backend: 
DatasetDao.findDatasetByName()
 + column lineage enrichment Page: 
DatasetDetailPage.tsx
, 
DatasetInfo.tsx

SQL Cost
Step	Queries	Joins
findDatasetByName()
 + 
setFields()
2	5 + 3
Column lineage enrichment	1	5 (recursive)
Total	3	~13
Data Over-fetching (~20%)
Most fields are actually used on this page (name, 
type
, fields, tags, description, facets, columnLineage). Minor waste:

Wasted Fields
currentVersion, lastModifiedAt, lastLifecycleState, isDeleted, sourceName
🟡 #7 — Lineage Graph (
useLineage
)
Hook: 
useLineage
 Endpoint: GET /lineage?nodeId=...&depth=... Backend: 
LineageDao.getLineage()
 + 
getCurrentRunsWithFacets()
 + 
getDatasetData()

SQL Cost
Step	Query	Joins
getLineage()
Recursive CTE over job_versions_io_mapping → jobs → jobs_view	3
getCurrentRunsWithFacets()
runs_view → job_versions → jobs_view → run_args → runs_input_mapping → dataset_versions → run_facets_view	6
getDatasetData()
datasets_view → dataset_versions → dataset_symlinks	3
Total	3-5 queries	~12 joins
Data Over-fetching (~30%)
The lineage graph nodes use a subset of job/dataset/run fields. run.args, run.facets, run.inputDatasetVersions, run.outputDatasetVersions are fetched in 
getCurrentRunsWithFacets()
 but not displayed on the graph nodes themselves.

🟢 #8 — Events (
useEvents
)
Hook: 
useEvents
 Endpoint: GET /events/lineage Backend: 
OpenLineageDao.getAllLineageEventsDesc()
 Page: 
Events.tsx

SQL Cost
sql
SELECT event FROM lineage_events le
WHERE le.event_time < :before AND le.event_time >= :after
AND le._event_type='RUN_EVENT'
ORDER BY le.event_time DESC LIMIT :limit OFFSET :offset
Metric	Value
Tables	1 (lineage_events)
Joins	0
Queries	2 (data + count)
Data Over-fetching (~0%)
The table displays event.run.runId, event.eventType, event.job.name, event.job.namespace, event.eventTime (5 scalar fields). However, when a row is expanded, <MqJsonView data={event} /> renders the entire JSON blob. So the full payload is legitimately needed for the detail view.

NOTE

The payload is large (nested facets for run, job, datasets), but it's pre-stored JSON — no joins, no N+1, just a sequential scan with an index on event_time. This is the cheapest endpoint in the system.

🟢 #9-15 — Low-Cost / No-Waste Queries
useRunFacets
 / 
useJobFacets
Backend: 
RunFacetsDao.findRunFacetsByRunUuid()
 / 
JobFacetsDao.findJobFacetsByRunUuid()

Single table GROUP BY on run_facets_view / job_facets_view. 1 query, 0 joins, 0% over-fetch. ✅

useLineageMetrics / useIntervalMetrics
Backend: 
StatsDao

Uses generate_series + LEFT JOIN on lineage_events_by_type_hourly_view or jobs/datasets/sources tables. 1 query per call, 2-3 CTEs, 1-2 joins. Returns only startInterval, endInterval, 
count
 or fail/start/complete/abort. No over-fetch. ✅

getNamespaces
Backend: Simple SELECT * FROM namespaces. 1 table, 0 joins, 0% over-fetch. ✅

getSearch
Backend: 
SearchDao

UNION of datasets_view and jobs_view with ILIKE filtering. Returns only 
type
, name, updated_at, namespace_name — exactly what the search UI needs. 0% over-fetch. ✅

getTags
Simple SELECT * FROM tags. 1 table, 0 joins, minimal data. ✅

useColumnLineage
Backend: 
ColumnLineageDao.getLineage()

Recursive CTE over column_lineage → dataset_fields → datasets_view → dataset_symlinks. This is expensive but it's the column lineage graph page — the complexity is inherent to the feature. No over-fetch. ✅

Top 4 SQL Waste Patterns
1️⃣ Jobs List N+1+1 — 31 queries for 10 jobs
findAllWithRun()
 loops in Java firing 3 extra queries per job. Fix: Inline the run data into the main query using LATERAL JOIN, or create a findAllWithLatestRun() that returns everything in one SQL.

2️⃣ DatasetVersions full Run for just a UUID
findAllWithRun()
 fires BASE_FIND_RUN_SQL (6 joins) per version, but createdByRunUuid is already on the version row and createdByRun.id is all the frontend uses. Fix: Stop populating createdByRun and use createdByRunUuid directly in the frontend.

3️⃣ Run query over-joining for unused fields
BASE_FIND_RUN_SQL
 always joins run_facets_view, run_args, runs_input_mapping → dataset_versions, output dataset_versions, dataset_facets_view — but the Runs table only needs 6 fields from runs_view. Fix: Create a findAllLight() method that skips these joins for list views.

4️⃣ Column lineage enrichment on dataset list
DatasetResource.list()
 calls columnLineageService.enrichWithColumnLineage(datasets) for every list request. Column lineage isn't displayed on the list page. Fix: Remove the enrichment from the list endpoint; keep it only for the detail endpoint.


Comment
⌥⌘M
