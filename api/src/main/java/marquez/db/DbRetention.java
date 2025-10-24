/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.db;

import static marquez.common.base.MorePreconditions.checkNotBlank;

import com.google.common.base.Stopwatch;
import java.sql.Types;
import lombok.NonNull;
import lombok.extern.slf4j.Slf4j;
import marquez.db.exceptions.DbRetentionException;
import org.jdbi.v3.core.Handle;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.core.statement.OutParameters;
import org.jdbi.v3.core.statement.Script;

/**
 * Apply retention policy directly to source, dataset, and job metadata collected by Marquez. When
 * invoking {@link DbRetention#retentionOnDbOrError(Jdbi, int, int)}, retention is applied by
 * invoking the following methods in an order of precedence from first-to-last:
 *
 * <ul>
 *   <li>{@code retentionOnJobs()}
 *   <li>{@code retentionOnJobVersions()}
 *   <li>{@code retentionOnRuns()}
 *   <li>{@code retentionOnDatasets()}
 *   <li>{@code retentionOnDatasetVersions()}
 *   <li>{@code retentionOnLineageEvents()}
 * </ul>
 *
 * <p>Applying retention is not reversible, but can be applied many times. For this to perform well,
 * we delete rows in batches; this divides the deletion process into smaller chunks; the number of
 * rows to delete per batch is configurable. You may also apply retention as a dry run by invoking
 * {@link DbRetention#retentionOnDbOrError(Jdbi, int, int, boolean)}. By default, dry runs are
 * disable.
 *
 * <p>When retention is configured, the following operations will be applied:
 *
 * <ul>
 *   <li>Delete jobs from {@code jobs} table if {@code jobs.updated_at} older than retention days.
 *   <li>Delete job versions from {@code job_versions} table if {@code job_versions.updated_at}
 *       older than retention days; a job version will not be deleted if the job version is the
 *       {@code current} version of a given job.
 *   <li>Delete runs from {@code runs} table if {@code uns.updated_at} older than retention days; a
 *       run will not be deleted if the run is the {@code current} run of a given job version.
 *   <li>Delete dataset from datasets table if {@code datasets.updated_at} older than retention
 *       days; a dataset will not be deleted if the dataset is an input / output of a given job
 *       version.
 *   <li>Delete dataset versions from {@code dataset_versions} table if {@code
 *       dataset_versions.created_at} older than retention days; a dataset version will not be
 *       deleted if the dataset version is the {@code current} version of a given dataset version,
 *       or the input of a run.
 *   <li>Delete lineage events from {@code lineage_events} table if {@code
 *       lineage_events.event_time} older than retentionDays.
 * </ul>
 */
@Slf4j
public final class DbRetention {
  private DbRetention() {}

  /* Default retention days. */
  public static final int DEFAULT_RETENTION_DAYS = 7;

  /* Default number of rows deleted per batch. */
  public static final int DEFAULT_NUMBER_OF_ROWS_PER_BATCH = 1000;

  /* Disable retention dry run by default. */
  public static final boolean DEFAULT_DRY_RUN = false;

  /**
   * Namespaces excluded from keep-at-least-one protection.
   * Records in these namespaces will be deleted based purely on retention days,
   * without preserving the most recent record. Useful for test/temporary namespaces.
   * Example: "local" namespace for local development/testing.
   */
  private static final String[] NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE = {
    "local"
  };

  /**
   * Generates SQL fragment to filter excluded namespaces.
   * Returns SQL condition to add to WHERE clause that excludes namespaces
   * from the keep-at-least-one protection list.
   */
  private static String getNamespaceExclusionFilter(String tableAlias) {
    if (NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE.length == 0) {
      return "";
    }
    StringBuilder filter = new StringBuilder(" AND ");
    filter.append(tableAlias).append(".namespace_uuid NOT IN (");
    filter.append("SELECT uuid FROM namespaces WHERE name IN (");
    for (int i = 0; i < NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE.length; i++) {
      if (i > 0) filter.append(", ");
      filter.append("'").append(NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE[i]).append("'");
    }
    filter.append("))");
    return filter.toString();
  }

  /** Applies the retention policy to database. */
  public static void retentionOnDbOrError(
      @NonNull final Jdbi jdbi, final int numberOfRowsPerBatch, final int retentionDays)
      throws DbRetentionException {
    retentionOnDbOrError(jdbi, numberOfRowsPerBatch, retentionDays, DEFAULT_DRY_RUN);
  }

  /** Applies the retention policy to database; optionally as a dry run if specified. */
  public static void retentionOnDbOrError(
      @NonNull final Jdbi jdbi,
      final int numberOfRowsPerBatch,
      final int retentionDays,
      final boolean dryRun)
      throws DbRetentionException {
    if (dryRun) {
      // On a dry run, add function(s) to return estimate of rows deleted (if not present).
      jdbi.useHandle(
          handle ->
              handle.execute(CREATE_OR_REPLACE_FUNCTION_ESTIMATE_NUMBER_OF_ROWS_OLDER_THAN_X_DAYS));
    }
    // Apply retention policy jobs, job versions, runs, datasets, and dataset versions.
    retentionOnJobs(jdbi, numberOfRowsPerBatch, retentionDays, dryRun);
    retentionOnJobVersions(jdbi, numberOfRowsPerBatch, retentionDays, dryRun);
    retentionOnRuns(jdbi, numberOfRowsPerBatch, retentionDays, dryRun);
    retentionOnDatasets(jdbi, numberOfRowsPerBatch, retentionDays, dryRun);
    retentionOnDatasetVersions(jdbi, numberOfRowsPerBatch, retentionDays, dryRun);

    // Clean up orphaned datasets and dataset versions not connected to any jobs/runs.
    if (!dryRun) {
      retentionOnOrphanedDatasets(jdbi, numberOfRowsPerBatch);
      retentionOnOrphanedDatasetVersions(jdbi, numberOfRowsPerBatch);
    }

    // Finally, apply retention policy to lineage events.
    retentionOnLineageEvents(jdbi, numberOfRowsPerBatch, retentionDays, dryRun);
  }

  /** Apply retention policy on {@code jobs}. */
  private static void retentionOnJobs(
      @NonNull final Jdbi jdbi,
      final int numberOfRowsPerBatch,
      final int retentionDays,
      final boolean dryRun) {
    if (dryRun) {
      // Get estimate of rows older than X days, then log to console.
      final int rowsOlderThanXDaysEstimated =
          estimateOfRowsOlderThanXDays(
              jdbi, sql(DRY_RUN_DELETE_FROM_JOBS_OLDER_THAN_X_DAYS, retentionDays));
      log.info(
          "A retention policy of '{}' days will delete (estimated): '{}' jobs",
          retentionDays,
          rowsOlderThanXDaysEstimated);
      return;
    }
    log.info("Applying retention policy of '{}' days to jobs...", retentionDays);
    final Stopwatch rowsDeleteTime = Stopwatch.createStarted();
    final int rowsDeleted =
        jdbi.withHandle(
            handle -> {
              handle.execute(
                  sqlWithExclusions(
                      """
                      CREATE OR REPLACE FUNCTION delete_jobs_older_than_x_days()
                        RETURNS INT AS $$
                      DECLARE
                        rows_per_batch INT := ${numberOfRowsPerBatch};
                        rows_deleted INT;
                        rows_deleted_total INT := 0;
                      BEGIN
                        -- Keep at least one job per namespace+name combination (the most recent one)
                        -- Excludes namespaces in the exclusion list (e.g., 'local')
                        CREATE TEMPORARY TABLE most_recent_job_per_name AS (
                          SELECT DISTINCT ON (j.namespace_uuid, j.name) j.uuid
                            FROM jobs AS j
                           WHERE j.namespace_uuid NOT IN (
                             SELECT uuid FROM namespaces 
                              WHERE name IN (${excludedNamespaces})
                           )
                           ORDER BY j.namespace_uuid, j.name, j.updated_at DESC
                        );
                        
                        CREATE INDEX IF NOT EXISTS idx_most_recent_job ON most_recent_job_per_name(uuid);
                        
                        LOOP
                          WITH deleted_rows AS (
                            DELETE FROM jobs
                              WHERE uuid IN (
                                SELECT j.uuid
                                  FROM jobs AS j
                                 WHERE j.updated_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                                   AND NOT EXISTS (
                                     SELECT 1
                                       FROM most_recent_job_per_name AS mrj
                                      WHERE j.uuid = mrj.uuid
                                   )
                                   FOR UPDATE OF j SKIP LOCKED
                                 LIMIT rows_per_batch
                              ) RETURNING uuid
                          )
                          SELECT COUNT(*) INTO rows_deleted FROM deleted_rows;
                          rows_deleted_total := rows_deleted_total + rows_deleted;
                          EXIT WHEN rows_deleted = 0;
                          PERFORM pg_sleep(0.1);
                        END LOOP;
                        
                        DROP TABLE most_recent_job_per_name;
                        RETURN rows_deleted_total;
                      END;
                      $$ LANGUAGE plpgsql;""",
                      numberOfRowsPerBatch,
                      retentionDays));
              return callWith(handle, "delete_jobs_older_than_x_days()");
            });
    rowsDeleteTime.stop();
    log.info("Deleted '{}' jobs in '{}' ms!", rowsDeleted, rowsDeleteTime.elapsed().toMillis());
  }

  /** Apply retention policy on {@code job versions}. */
  private static void retentionOnJobVersions(
      @NonNull final Jdbi jdbi,
      final int numberOfRowsPerBatch,
      final int retentionDays,
      final boolean dryRun) {
    if (dryRun) {
      // Get estimate of rows older than X days, then log to console.
      final int rowsOlderThanXDaysEstimated =
          estimateOfRowsOlderThanXDays(
              jdbi, sql(DRY_RUN_DELETE_FROM_JOB_VERSIONS_OLDER_THAN_X_DAYS, retentionDays));
      log.info(
          "A retention policy of '{}' days will delete (estimated): '{}' job versions",
          retentionDays,
          rowsOlderThanXDaysEstimated);
      return;
    }
    log.info("Applying retention policy of '{}' days to job versions...", retentionDays);
    final Stopwatch rowsDeleteTime = Stopwatch.createStarted();
    final int rowsDeleted =
        jdbi.withHandle(
            handle -> {
              handle.execute(
                  sqlWithExclusions(
                      """
                      CREATE OR REPLACE FUNCTION delete_job_versions_older_than_x_days()
                        RETURNS INT AS $$
                      DECLARE
                        rows_per_batch INT := ${numberOfRowsPerBatch};
                        rows_deleted INT;
                        rows_deleted_total INT := 0;
                      BEGIN
                        CREATE TEMPORARY TABLE used_job_versions_as_current_in_x_days AS (
                          SELECT current_version_uuid
                            FROM jobs
                           WHERE updated_at >= CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                        );
                        
                        -- Keep at least one job_version per job (the most recent one)
                        -- Excludes job versions for jobs in excluded namespaces
                        CREATE TEMPORARY TABLE most_recent_job_version_per_job AS (
                          SELECT DISTINCT ON (jv.job_uuid) jv.uuid
                            FROM job_versions AS jv
                           INNER JOIN jobs AS j ON jv.job_uuid = j.uuid
                           WHERE j.namespace_uuid NOT IN (
                             SELECT uuid FROM namespaces 
                              WHERE name IN (${excludedNamespaces})
                           )
                           ORDER BY jv.job_uuid, jv.created_at DESC
                        );
                        
                        CREATE INDEX IF NOT EXISTS idx_used_jv_current ON used_job_versions_as_current_in_x_days(current_version_uuid);
                        CREATE INDEX IF NOT EXISTS idx_most_recent_jv ON most_recent_job_version_per_job(uuid);
                        
                        LOOP
                          WITH deleted_rows AS (
                            DELETE FROM job_versions AS jv
                              WHERE uuid IN (
                                SELECT uuid
                                  FROM job_versions
                                 WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                                   FOR UPDATE SKIP LOCKED
                                 LIMIT rows_per_batch
                              ) AND NOT EXISTS (
                                SELECT 1
                                  FROM used_job_versions_as_current_in_x_days AS ujvc
                                 WHERE jv.uuid = ujvc.current_version_uuid
                              ) AND NOT EXISTS (
                                SELECT 1
                                  FROM most_recent_job_version_per_job AS mrjv
                                 WHERE jv.uuid = mrjv.uuid
                              ) RETURNING uuid
                          )
                          SELECT COUNT(*) INTO rows_deleted FROM deleted_rows;
                          rows_deleted_total := rows_deleted_total + rows_deleted;
                          EXIT WHEN rows_deleted = 0;
                          PERFORM pg_sleep(0.1);
                        END LOOP;
                        DROP TABLE used_job_versions_as_current_in_x_days;
                        DROP TABLE most_recent_job_version_per_job;
                        RETURN rows_deleted_total;
                      END;
                      $$ LANGUAGE plpgsql;""",
                      numberOfRowsPerBatch,
                      retentionDays));
              return callWith(handle, "delete_job_versions_older_than_x_days()");
            });
    rowsDeleteTime.stop();
    log.info(
        "Deleted '{}' job versions in '{}' ms!", rowsDeleted, rowsDeleteTime.elapsed().toMillis());
  }

  /** Apply retention policy on {@code runs}. */
  private static void retentionOnRuns(
      @NonNull final Jdbi jdbi,
      final int numberOfRowsPerBatch,
      final int retentionDays,
      final boolean dryRun) {
    if (dryRun) {
      // Get estimate of rows older than X days, then log to console.
      final int rowsOlderThanXDaysEstimated =
          estimateOfRowsOlderThanXDays(
              jdbi, sql(DRY_RUN_DELETE_FROM_RUNS_OLDER_THAN_X_DAYS, retentionDays));
      log.info(
          "A retention policy of '{}' days will delete (estimated): '{}' runs",
          retentionDays,
          rowsOlderThanXDaysEstimated);
      return;
    }
    log.info("Applying retention policy of '{}' days to runs...", retentionDays);
    final Stopwatch rowsDeleteTime = Stopwatch.createStarted();
    final int rowsDeleted =
        jdbi.withHandle(
            handle -> {
              handle.execute(
                  sql(
                      """
                      CREATE OR REPLACE FUNCTION delete_runs_older_than_x_days()
                        RETURNS INT AS $$
                      DECLARE
                        rows_per_batch INT := ${numberOfRowsPerBatch};
                        rows_deleted INT;
                        rows_deleted_total INT := 0;
                      BEGIN
                        LOOP
                          WITH deleted_rows AS (
                            DELETE FROM runs
                              WHERE uuid IN (
                                SELECT uuid
                                  FROM runs
                                 WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                                   FOR UPDATE SKIP LOCKED
                                 LIMIT rows_per_batch
                              ) RETURNING uuid
                          )
                          SELECT COUNT(*) INTO rows_deleted FROM deleted_rows;
                          rows_deleted_total := rows_deleted_total + rows_deleted;
                          EXIT WHEN rows_deleted = 0;
                          PERFORM pg_sleep(0.1);
                        END LOOP;
                        RETURN rows_deleted_total;
                      END;
                      $$ LANGUAGE plpgsql;""",
                      numberOfRowsPerBatch,
                      retentionDays));
              return callWith(handle, "delete_runs_older_than_x_days()");
            });
    rowsDeleteTime.stop();
    log.info("Deleted '{}' runs in '{}' ms!", rowsDeleted, rowsDeleteTime.elapsed().toMillis());
  }

  /** Apply retention policy on {@code datasets}. */
  private static void retentionOnDatasets(
      @NonNull final Jdbi jdbi,
      final int numberOfRowsPerBatch,
      final int retentionDays,
      final boolean dryRun) {
    if (dryRun) {
      // On a dry run, add function(s) to return estimate of rows deleted.
      jdbi.useHandle(
          handle -> {
            try (final Script script =
                handle.createScript(sql(DRY_RUN_CREATE_TEMP_TABLES_FOR_DATASETS, retentionDays))) {
              script.execute();
            }
          });
      // Get estimate of rows older than X days, then log to console.
      final int rowsOlderThanXDaysEstimated =
          estimateOfRowsOlderThanXDays(
              jdbi, sql(DRY_RUN_DELETE_FROM_DATASETS_OLDER_THAN_X_DAYS, retentionDays));
      log.info(
          "A retention policy of '{}' days will delete (estimated): '{}' datasets",
          retentionDays,
          rowsOlderThanXDaysEstimated);
      // Drop function(s) used to return estimate of rows deleted.
      jdbi.useHandle(
          handle -> {
            try (final Script script = handle.createScript(DRY_RUN_DROP_TEMP_TABLES_FOR_DATASETS)) {
              script.execute();
            }
          });
      return;
    }
    log.info("Applying retention policy of '{}' days to datasets...", retentionDays);
    final Stopwatch rowsDeleteTime = Stopwatch.createStarted();
    final int rowsDeleted =
        jdbi.withHandle(
            handle -> {
              handle.execute(
                  sqlWithExclusions(
                      """
                      CREATE OR REPLACE FUNCTION delete_datasets_older_than_x_days()
                        RETURNS INT AS $$
                      DECLARE
                        rows_per_batch INT := ${numberOfRowsPerBatch};
                        rows_deleted INT;
                        rows_deleted_total INT := 0;
                      BEGIN
                        CREATE TEMPORARY TABLE used_datasets_as_io_in_x_days AS (
                          SELECT dataset_uuid
                            FROM job_versions_io_mapping AS jvio INNER JOIN job_versions AS jv
                              ON jvio.job_version_uuid = jv.uuid
                           WHERE jv.created_at >= CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                        );
                        
                        -- Keep at least one dataset per namespace+name combination (the most recent one)
                        -- Excludes datasets in excluded namespaces
                        CREATE TEMPORARY TABLE most_recent_dataset_per_name AS (
                          SELECT DISTINCT ON (d.namespace_uuid, d.name) d.uuid
                            FROM datasets AS d
                           WHERE d.namespace_uuid NOT IN (
                             SELECT uuid FROM namespaces 
                              WHERE name IN (${excludedNamespaces})
                           )
                           ORDER BY d.namespace_uuid, d.name, d.updated_at DESC
                        );
                        
                        -- Create index for better performance
                        CREATE INDEX IF NOT EXISTS idx_used_datasets_io ON used_datasets_as_io_in_x_days(dataset_uuid);
                        CREATE INDEX IF NOT EXISTS idx_most_recent_dataset ON most_recent_dataset_per_name(uuid);
                        
                        LOOP
                          -- Create temp table with batch of datasets to delete
                          CREATE TEMPORARY TABLE IF NOT EXISTS datasets_to_delete (uuid UUID);
                          TRUNCATE TABLE datasets_to_delete;
                          
                          INSERT INTO datasets_to_delete
                          SELECT d.uuid
                            FROM datasets AS d
                           WHERE d.updated_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                             AND NOT EXISTS (
                               SELECT 1
                                 FROM used_datasets_as_io_in_x_days AS udaio
                                WHERE d.uuid = udaio.dataset_uuid
                             ) AND NOT EXISTS (
                               SELECT 1
                                 FROM most_recent_dataset_per_name AS mrd
                                WHERE d.uuid = mrd.uuid
                             )
                           LIMIT rows_per_batch
                             FOR UPDATE OF d SKIP LOCKED;
                          
                          GET DIAGNOSTICS rows_deleted = ROW_COUNT;
                          EXIT WHEN rows_deleted = 0;
                          
                          -- Manually delete dependent records in batches to avoid CASCADE overhead
                          -- Delete from dataset_facets
                          DELETE FROM dataset_facets
                           WHERE dataset_uuid IN (SELECT uuid FROM datasets_to_delete);
                          
                          -- Delete from datasets_tag_mapping
                          DELETE FROM datasets_tag_mapping
                           WHERE dataset_uuid IN (SELECT uuid FROM datasets_to_delete);
                          
                          -- Delete from job_versions_io_mapping
                          DELETE FROM job_versions_io_mapping
                           WHERE dataset_uuid IN (SELECT uuid FROM datasets_to_delete);
                          
                          -- Get dataset_fields to delete (for subsequent cascade deletes)
                          CREATE TEMPORARY TABLE IF NOT EXISTS dataset_fields_to_delete (uuid UUID);
                          TRUNCATE TABLE dataset_fields_to_delete;
                          
                          INSERT INTO dataset_fields_to_delete
                          SELECT uuid FROM dataset_fields
                           WHERE dataset_uuid IN (SELECT uuid FROM datasets_to_delete);
                          
                          -- Delete from dataset_fields_tag_mapping
                          DELETE FROM dataset_fields_tag_mapping
                           WHERE dataset_field_uuid IN (SELECT uuid FROM dataset_fields_to_delete);
                          
                          -- Delete from column_lineage (field references)
                          DELETE FROM column_lineage
                           WHERE output_dataset_field_uuid IN (SELECT uuid FROM dataset_fields_to_delete);
                          
                          DELETE FROM column_lineage
                           WHERE input_dataset_field_uuid IN (SELECT uuid FROM dataset_fields_to_delete);
                          
                          -- Delete from dataset_versions_field_mapping
                          DELETE FROM dataset_versions_field_mapping
                           WHERE dataset_field_uuid IN (SELECT uuid FROM dataset_fields_to_delete);
                          
                          -- Delete from dataset_fields
                          DELETE FROM dataset_fields
                           WHERE uuid IN (SELECT uuid FROM dataset_fields_to_delete);
                          
                          -- Get dataset_versions to delete (for subsequent cascade deletes)
                          CREATE TEMPORARY TABLE IF NOT EXISTS dataset_versions_to_delete_cascade (uuid UUID);
                          TRUNCATE TABLE dataset_versions_to_delete_cascade;
                          
                          INSERT INTO dataset_versions_to_delete_cascade
                          SELECT uuid FROM dataset_versions
                           WHERE dataset_uuid IN (SELECT uuid FROM datasets_to_delete);
                          
                          -- Delete dependent records of dataset_versions
                          DELETE FROM column_lineage
                           WHERE output_dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete_cascade);
                          
                          DELETE FROM column_lineage
                           WHERE input_dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete_cascade);
                          
                          DELETE FROM dataset_facets
                           WHERE dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete_cascade);
                          
                          DELETE FROM dataset_versions_field_mapping
                           WHERE dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete_cascade);
                          
                          DELETE FROM runs_input_mapping
                           WHERE dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete_cascade);
                          
                          DELETE FROM stream_versions
                           WHERE dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete_cascade);
                          
                          -- Disable triggers to skip CASCADE constraint validation
                          ALTER TABLE dataset_versions DISABLE TRIGGER ALL;
                          
                          -- Delete dataset_versions
                          DELETE FROM dataset_versions
                           WHERE uuid IN (SELECT uuid FROM dataset_versions_to_delete_cascade);
                          
                          -- Re-enable triggers
                          ALTER TABLE dataset_versions ENABLE TRIGGER ALL;
                          
                          -- Disable triggers on datasets to skip CASCADE constraint validation
                          ALTER TABLE datasets DISABLE TRIGGER ALL;
                          
                          -- Finally delete the datasets themselves
                          DELETE FROM datasets
                           WHERE uuid IN (SELECT uuid FROM datasets_to_delete);
                          
                          -- Re-enable triggers
                          ALTER TABLE datasets ENABLE TRIGGER ALL;
                          
                          rows_deleted_total := rows_deleted_total + rows_deleted;
                          
                          -- Sleep briefly to reduce load on the database
                          PERFORM pg_sleep(0.1);
                        END LOOP;
                        
                        DROP TABLE IF EXISTS datasets_to_delete;
                        DROP TABLE IF EXISTS dataset_fields_to_delete;
                        DROP TABLE IF EXISTS dataset_versions_to_delete_cascade;
                        DROP TABLE used_datasets_as_io_in_x_days;
                        DROP TABLE most_recent_dataset_per_name;
                        RETURN rows_deleted_total;
                      END;
                      $$ LANGUAGE plpgsql;""",
                      numberOfRowsPerBatch,
                      retentionDays));
              return callWith(handle, "delete_datasets_older_than_x_days()");
            });
    rowsDeleteTime.stop();
    log.info("Deleted '{}' datasets in '{}' ms!", rowsDeleted, rowsDeleteTime.elapsed().toMillis());
  }

  /** Apply retention policy on {@code dataset versions}. */
  private static void retentionOnDatasetVersions(
      @NonNull final Jdbi jdbi,
      final int numberOfRowsPerBatch,
      final int retentionDays,
      final boolean dryRun) {
    if (dryRun) {
      // On a dry run, add function(s) to return estimate of rows deleted.
      jdbi.useHandle(
          handle -> {
            try (final Script script =
                handle.createScript(
                    sql(DRY_RUN_CREATE_TEMP_TABLES_FOR_DATASET_VERSIONS, retentionDays))) {
              script.execute();
            }
          });
      // Get estimate of rows older than X days, then log to console.
      final int rowsOlderThanXDaysEstimated =
          estimateOfRowsOlderThanXDays(
              jdbi, sql(DRY_RUN_DELETE_FROM_DATASET_VERSIONS_OLDER_THAN_X_DAYS, retentionDays));
      log.info(
          "A retention policy of '{}' days will delete (estimated): '{}' dataset versions",
          retentionDays,
          rowsOlderThanXDaysEstimated);
      // Drop function(s) used to return estimate of rows deleted.
      jdbi.useHandle(
          handle -> {
            try (final Script script =
                handle.createScript(DRY_RUN_DROP_TEMP_TABLES_FOR_DATASET_VERSIONS)) {
              script.execute();
            }
          });
      return;
    }
    log.info("Applying retention policy of '{}' days to dataset versions...", retentionDays);
    final Stopwatch rowsDeleteTime = Stopwatch.createStarted();
    final int rowsDeleted =
        jdbi.withHandle(
            handle -> {
              handle.execute(
                  sqlWithExclusions(
                      """
                      CREATE OR REPLACE FUNCTION delete_dataset_versions_older_than_x_days()
                        RETURNS INT AS $$
                      DECLARE
                        rows_per_batch INT := ${numberOfRowsPerBatch};
                        rows_deleted INT;
                        rows_deleted_total INT := 0;
                      BEGIN
                        CREATE TEMPORARY TABLE used_dataset_versions_as_input_in_x_days AS (
                          SELECT dataset_version_uuid
                            FROM runs_input_mapping AS ri INNER JOIN runs AS r
                              ON ri.run_uuid = r.uuid
                           WHERE r.created_at >= CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                        );
                        CREATE TEMPORARY TABLE used_dataset_versions_as_current_in_x_days AS (
                          SELECT current_version_uuid
                            FROM datasets
                           WHERE updated_at >= CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                        );
                        
                        -- Keep at least one dataset_version per dataset (the most recent one)
                        -- Excludes dataset versions for datasets in excluded namespaces
                        CREATE TEMPORARY TABLE most_recent_dataset_version_per_dataset AS (
                          SELECT DISTINCT ON (dv.dataset_uuid) dv.uuid
                            FROM dataset_versions AS dv
                           INNER JOIN datasets AS d ON dv.dataset_uuid = d.uuid
                           WHERE d.namespace_uuid NOT IN (
                             SELECT uuid FROM namespaces 
                              WHERE name IN (${excludedNamespaces})
                           )
                           ORDER BY dv.dataset_uuid, dv.created_at DESC
                        );
                        
                        -- Create index on temp tables for better performance
                        CREATE INDEX IF NOT EXISTS idx_used_dv_input ON used_dataset_versions_as_input_in_x_days(dataset_version_uuid);
                        CREATE INDEX IF NOT EXISTS idx_used_dv_current ON used_dataset_versions_as_current_in_x_days(current_version_uuid);
                        CREATE INDEX IF NOT EXISTS idx_most_recent_dv ON most_recent_dataset_version_per_dataset(uuid);
                        
                        LOOP
                          -- Create temp table with batch of dataset_versions to delete
                          CREATE TEMPORARY TABLE IF NOT EXISTS dataset_versions_to_delete (uuid UUID);
                          TRUNCATE TABLE dataset_versions_to_delete;
                          
                          INSERT INTO dataset_versions_to_delete
                          SELECT dv.uuid
                            FROM dataset_versions AS dv
                           WHERE dv.created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                             AND NOT EXISTS (
                               SELECT 1
                                 FROM used_dataset_versions_as_input_in_x_days AS udvi
                                WHERE dv.uuid = udvi.dataset_version_uuid
                             ) AND NOT EXISTS (
                               SELECT 1
                                 FROM used_dataset_versions_as_current_in_x_days AS udvc
                                WHERE dv.uuid = udvc.current_version_uuid
                             ) AND NOT EXISTS (
                               SELECT 1
                                 FROM most_recent_dataset_version_per_dataset AS mrdv
                                WHERE dv.uuid = mrdv.uuid
                             )
                           LIMIT rows_per_batch
                             FOR UPDATE OF dv SKIP LOCKED;
                          
                          GET DIAGNOSTICS rows_deleted = ROW_COUNT;
                          EXIT WHEN rows_deleted = 0;
                          
                          -- Manually delete dependent records in batches to avoid CASCADE overhead
                          -- These tables have no outgoing CASCADE constraints, so deletion is fast
                          
                          -- Delete from column_lineage (both input and output references)
                          DELETE FROM column_lineage
                           WHERE output_dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete);
                          
                          DELETE FROM column_lineage
                           WHERE input_dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete);
                          
                          -- Delete from dataset_facets
                          DELETE FROM dataset_facets
                           WHERE dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete);
                          
                          -- Delete from dataset_versions_field_mapping
                          DELETE FROM dataset_versions_field_mapping
                           WHERE dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete);
                          
                          -- Delete from runs_input_mapping
                          DELETE FROM runs_input_mapping
                           WHERE dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete);
                          
                          -- Delete from stream_versions
                          DELETE FROM stream_versions
                           WHERE dataset_version_uuid IN (SELECT uuid FROM dataset_versions_to_delete);
                          
                          -- Disable triggers on dataset_versions to skip CASCADE constraint validation
                          -- We've already manually deleted all dependent records, so validation is unnecessary
                          ALTER TABLE dataset_versions DISABLE TRIGGER ALL;
                          
                          -- Finally delete the dataset_versions themselves
                          -- With triggers disabled, this is a simple DELETE without any CASCADE overhead
                          DELETE FROM dataset_versions
                           WHERE uuid IN (SELECT uuid FROM dataset_versions_to_delete);
                          
                          -- Re-enable triggers for subsequent operations
                          ALTER TABLE dataset_versions ENABLE TRIGGER ALL;
                          
                          rows_deleted_total := rows_deleted_total + rows_deleted;
                          
                          -- Sleep briefly to reduce load on the database
                          PERFORM pg_sleep(0.1);
                        END LOOP;
                        
                        DROP TABLE IF EXISTS dataset_versions_to_delete;
                        DROP TABLE used_dataset_versions_as_input_in_x_days;
                        DROP TABLE used_dataset_versions_as_current_in_x_days;
                        DROP TABLE most_recent_dataset_version_per_dataset;
                        RETURN rows_deleted_total;
                      END;
                      $$ LANGUAGE plpgsql;""",
                      numberOfRowsPerBatch,
                      retentionDays));
              return callWith(handle, "delete_dataset_versions_older_than_x_days()");
            });
    rowsDeleteTime.stop();
    log.info(
        "Deleted '{}' dataset versions in '{}' ms!",
        rowsDeleted,
        rowsDeleteTime.elapsed().toMillis());
  }

  /**
   * Apply retention policy on orphaned {@code datasets}.
   * Deletes datasets that are not referenced by any job as input or output.
   */
  private static void retentionOnOrphanedDatasets(
      @NonNull final Jdbi jdbi, final int numberOfRowsPerBatch) {
    log.info("Deleting orphaned datasets not connected to any jobs...");
    final Stopwatch rowsDeleteTime = Stopwatch.createStarted();
    final int rowsDeleted =
        jdbi.withHandle(
            handle -> {
              handle.execute(
                  sql(
                      """
                      CREATE OR REPLACE FUNCTION delete_orphaned_datasets()
                        RETURNS INT AS $$
                      DECLARE
                        rows_per_batch INT := ${numberOfRowsPerBatch};
                        rows_deleted INT;
                        rows_deleted_total INT := 0;
                      BEGIN
                        LOOP
                          -- Create temp table with batch of orphaned datasets to delete
                          CREATE TEMPORARY TABLE IF NOT EXISTS orphaned_datasets_to_delete (uuid UUID);
                          TRUNCATE TABLE orphaned_datasets_to_delete;
                          
                          INSERT INTO orphaned_datasets_to_delete
                          SELECT d.uuid
                            FROM datasets AS d
                           WHERE NOT EXISTS (
                             SELECT 1
                               FROM job_versions_io_mapping AS jvio
                              WHERE jvio.dataset_uuid = d.uuid
                           )
                           LIMIT rows_per_batch
                             FOR UPDATE OF d SKIP LOCKED;
                          
                          GET DIAGNOSTICS rows_deleted = ROW_COUNT;
                          EXIT WHEN rows_deleted = 0;
                          
                          -- Manually delete dependent records to avoid CASCADE overhead
                          
                          -- Delete from dataset_facets
                          DELETE FROM dataset_facets
                           WHERE dataset_uuid IN (SELECT uuid FROM orphaned_datasets_to_delete);
                          
                          -- Delete from datasets_tag_mapping
                          DELETE FROM datasets_tag_mapping
                           WHERE dataset_uuid IN (SELECT uuid FROM orphaned_datasets_to_delete);
                          
                          -- Get dataset_fields to delete
                          CREATE TEMPORARY TABLE IF NOT EXISTS orphaned_dataset_fields_to_delete (uuid UUID);
                          TRUNCATE TABLE orphaned_dataset_fields_to_delete;
                          
                          INSERT INTO orphaned_dataset_fields_to_delete
                          SELECT uuid FROM dataset_fields
                           WHERE dataset_uuid IN (SELECT uuid FROM orphaned_datasets_to_delete);
                          
                          -- Delete from dataset_fields_tag_mapping
                          DELETE FROM dataset_fields_tag_mapping
                           WHERE dataset_field_uuid IN (SELECT uuid FROM orphaned_dataset_fields_to_delete);
                          
                          -- Delete from column_lineage (field references)
                          DELETE FROM column_lineage
                           WHERE output_dataset_field_uuid IN (SELECT uuid FROM orphaned_dataset_fields_to_delete);
                          
                          DELETE FROM column_lineage
                           WHERE input_dataset_field_uuid IN (SELECT uuid FROM orphaned_dataset_fields_to_delete);
                          
                          -- Delete from dataset_versions_field_mapping
                          DELETE FROM dataset_versions_field_mapping
                           WHERE dataset_field_uuid IN (SELECT uuid FROM orphaned_dataset_fields_to_delete);
                          
                          -- Delete from dataset_fields
                          DELETE FROM dataset_fields
                           WHERE uuid IN (SELECT uuid FROM orphaned_dataset_fields_to_delete);
                          
                          -- Get dataset_versions to delete
                          CREATE TEMPORARY TABLE IF NOT EXISTS orphaned_dataset_versions_to_delete (uuid UUID);
                          TRUNCATE TABLE orphaned_dataset_versions_to_delete;
                          
                          INSERT INTO orphaned_dataset_versions_to_delete
                          SELECT uuid FROM dataset_versions
                           WHERE dataset_uuid IN (SELECT uuid FROM orphaned_datasets_to_delete);
                          
                          -- Delete dependent records of dataset_versions
                          DELETE FROM column_lineage
                           WHERE output_dataset_version_uuid IN (SELECT uuid FROM orphaned_dataset_versions_to_delete);
                          
                          DELETE FROM column_lineage
                           WHERE input_dataset_version_uuid IN (SELECT uuid FROM orphaned_dataset_versions_to_delete);
                          
                          DELETE FROM dataset_facets
                           WHERE dataset_version_uuid IN (SELECT uuid FROM orphaned_dataset_versions_to_delete);
                          
                          DELETE FROM dataset_versions_field_mapping
                           WHERE dataset_version_uuid IN (SELECT uuid FROM orphaned_dataset_versions_to_delete);
                          
                          DELETE FROM runs_input_mapping
                           WHERE dataset_version_uuid IN (SELECT uuid FROM orphaned_dataset_versions_to_delete);
                          
                          DELETE FROM stream_versions
                           WHERE dataset_version_uuid IN (SELECT uuid FROM orphaned_dataset_versions_to_delete);
                          
                          -- Disable triggers for dataset_versions
                          ALTER TABLE dataset_versions DISABLE TRIGGER ALL;
                          
                          -- Delete dataset_versions
                          DELETE FROM dataset_versions
                           WHERE uuid IN (SELECT uuid FROM orphaned_dataset_versions_to_delete);
                          
                          -- Re-enable triggers
                          ALTER TABLE dataset_versions ENABLE TRIGGER ALL;
                          
                          -- Disable triggers for datasets
                          ALTER TABLE datasets DISABLE TRIGGER ALL;
                          
                          -- Finally delete the orphaned datasets themselves
                          DELETE FROM datasets
                           WHERE uuid IN (SELECT uuid FROM orphaned_datasets_to_delete);
                          
                          -- Re-enable triggers
                          ALTER TABLE datasets ENABLE TRIGGER ALL;
                          
                          rows_deleted_total := rows_deleted_total + rows_deleted;
                          
                          -- Sleep briefly to reduce load on the database
                          PERFORM pg_sleep(0.1);
                        END LOOP;
                        
                        DROP TABLE IF EXISTS orphaned_datasets_to_delete;
                        DROP TABLE IF EXISTS orphaned_dataset_fields_to_delete;
                        DROP TABLE IF EXISTS orphaned_dataset_versions_to_delete;
                        RETURN rows_deleted_total;
                      END;
                      $$ LANGUAGE plpgsql;""",
                      numberOfRowsPerBatch,
                      0)); // retentionDays not applicable for orphaned cleanup
              return callWith(handle, "delete_orphaned_datasets()");
            });
    rowsDeleteTime.stop();
    log.info(
        "Deleted '{}' orphaned datasets in '{}' ms!",
        rowsDeleted,
        rowsDeleteTime.elapsed().toMillis());
  }

  /**
   * Apply retention policy on orphaned {@code dataset versions}.
   * Deletes dataset versions that are not referenced by any run as input.
   */
  private static void retentionOnOrphanedDatasetVersions(
      @NonNull final Jdbi jdbi, final int numberOfRowsPerBatch) {
    log.info("Deleting orphaned dataset versions not connected to any runs...");
    final Stopwatch rowsDeleteTime = Stopwatch.createStarted();
    final int rowsDeleted =
        jdbi.withHandle(
            handle -> {
              handle.execute(
                  sql(
                      """
                      CREATE OR REPLACE FUNCTION delete_orphaned_dataset_versions()
                        RETURNS INT AS $$
                      DECLARE
                        rows_per_batch INT := ${numberOfRowsPerBatch};
                        rows_deleted INT;
                        rows_deleted_total INT := 0;
                      BEGIN
                        LOOP
                          -- Create temp table with batch of orphaned dataset_versions to delete
                          CREATE TEMPORARY TABLE IF NOT EXISTS orphaned_dv_to_delete (uuid UUID);
                          TRUNCATE TABLE orphaned_dv_to_delete;
                          
                          INSERT INTO orphaned_dv_to_delete
                          SELECT dv.uuid
                            FROM dataset_versions AS dv
                           WHERE NOT EXISTS (
                             SELECT 1
                               FROM runs_input_mapping AS rim
                              WHERE rim.dataset_version_uuid = dv.uuid
                           ) AND dv.uuid NOT IN (
                             -- Don't delete current versions of datasets
                             SELECT current_version_uuid
                               FROM datasets
                              WHERE current_version_uuid IS NOT NULL
                           )
                           LIMIT rows_per_batch
                             FOR UPDATE OF dv SKIP LOCKED;
                          
                          GET DIAGNOSTICS rows_deleted = ROW_COUNT;
                          EXIT WHEN rows_deleted = 0;
                          
                          -- Manually delete dependent records to avoid CASCADE overhead
                          
                          -- Delete from column_lineage (both input and output references)
                          DELETE FROM column_lineage
                           WHERE output_dataset_version_uuid IN (SELECT uuid FROM orphaned_dv_to_delete);
                          
                          DELETE FROM column_lineage
                           WHERE input_dataset_version_uuid IN (SELECT uuid FROM orphaned_dv_to_delete);
                          
                          -- Delete from dataset_facets
                          DELETE FROM dataset_facets
                           WHERE dataset_version_uuid IN (SELECT uuid FROM orphaned_dv_to_delete);
                          
                          -- Delete from dataset_versions_field_mapping
                          DELETE FROM dataset_versions_field_mapping
                           WHERE dataset_version_uuid IN (SELECT uuid FROM orphaned_dv_to_delete);
                          
                          -- Delete from stream_versions
                          DELETE FROM stream_versions
                           WHERE dataset_version_uuid IN (SELECT uuid FROM orphaned_dv_to_delete);
                          
                          -- Disable triggers on dataset_versions
                          ALTER TABLE dataset_versions DISABLE TRIGGER ALL;
                          
                          -- Finally delete the orphaned dataset_versions themselves
                          DELETE FROM dataset_versions
                           WHERE uuid IN (SELECT uuid FROM orphaned_dv_to_delete);
                          
                          -- Re-enable triggers
                          ALTER TABLE dataset_versions ENABLE TRIGGER ALL;
                          
                          rows_deleted_total := rows_deleted_total + rows_deleted;
                          
                          -- Sleep briefly to reduce load on the database
                          PERFORM pg_sleep(0.1);
                        END LOOP;
                        
                        DROP TABLE IF EXISTS orphaned_dv_to_delete;
                        RETURN rows_deleted_total;
                      END;
                      $$ LANGUAGE plpgsql;""",
                      numberOfRowsPerBatch,
                      0)); // retentionDays not applicable for orphaned cleanup
              return callWith(handle, "delete_orphaned_dataset_versions()");
            });
    rowsDeleteTime.stop();
    log.info(
        "Deleted '{}' orphaned dataset versions in '{}' ms!",
        rowsDeleted,
        rowsDeleteTime.elapsed().toMillis());
  }

  private static void retentionOnLineageEvents(
      @NonNull final Jdbi jdbi,
      final int numberOfRowsPerBatch,
      final int retentionDays,
      final boolean dryRun) {
    if (dryRun) {
      // Get estimate of rows older than X days, then log to console.
      final int rowsOlderThanXDaysEstimated =
          estimateOfRowsOlderThanXDays(
              jdbi, sql(DRY_RUN_DELETE_FROM_LINEAGE_EVENTS_OLDER_THAN_X_DAYS, retentionDays));
      log.info(
          "A retention policy of '{}' days will delete (estimated): '{}' lineage events",
          retentionDays,
          rowsOlderThanXDaysEstimated);
      return;
    }
    log.info("Applying retention policy of '{}' days to lineage events...", retentionDays);
    final Stopwatch rowsDeleteTime = Stopwatch.createStarted();
    final int rowsDeleted =
        jdbi.withHandle(
            handle -> {
              handle.execute(
                  sql(
                      """
                      CREATE OR REPLACE FUNCTION delete_lineage_events_older_than_x_days()
                        RETURNS INT AS $$
                      DECLARE
                        rows_per_batch INT := ${numberOfRowsPerBatch};
                        rows_deleted INT;
                        rows_deleted_total INT := 0;
                      BEGIN
                        LOOP
                          WITH deleted_rows AS (
                            DELETE FROM lineage_events
                              WHERE run_uuid IN (
                               SELECT run_uuid
                                 FROM lineage_events
                                WHERE event_time < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
                                  FOR UPDATE SKIP LOCKED
                                LIMIT rows_per_batch
                              ) RETURNING run_uuid
                          )
                          SELECT COUNT(*) INTO rows_deleted FROM deleted_rows;
                          rows_deleted_total := rows_deleted_total + rows_deleted;
                          EXIT WHEN rows_deleted = 0;
                          PERFORM pg_sleep(0.1);
                        END LOOP;
                        RETURN rows_deleted_total;
                      END;
                      $$ LANGUAGE plpgsql;""",
                      numberOfRowsPerBatch,
                      retentionDays));
              return callWith(handle, "delete_lineage_events_older_than_x_days()");
            });
    rowsDeleteTime.stop();
    log.info(
        "Deleted '{}' lineage events in '{}' ms!",
        rowsDeleted,
        rowsDeleteTime.elapsed().toMillis());
  }

  /**
   * Returns generated {@code sql} using the {@code sqlTemplate} and the provided values for {@code
   * numberOfRowsPerBatch} and {@code retentionDays}.
   */
  private static String sql(
      @NonNull final String sqlTemplate, final int numberOfRowsPerBatch, final int retentionDays) {
    return checkNotBlank(sqlTemplate)
        .replace("${numberOfRowsPerBatch}", String.valueOf(numberOfRowsPerBatch))
        .replace("${retentionDays}", String.valueOf(retentionDays));
  }

  /**
   * Returns {@code sql} using the {@code sqlTemplate} and the provided value for {@code
   * retentionDays}.
   */
  private static String sql(@NonNull final String sqlTemplate, final int retentionDays) {
    return checkNotBlank(sqlTemplate).replace("${retentionDays}", String.valueOf(retentionDays));
  }

  /**
   * Returns {@code sql} with excluded namespaces replaced.
   * Generates SQL-safe quoted list like: 'local', 'test'
   */
  private static String getExcludedNamespacesForSql() {
    if (NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE.length == 0) {
      return "''";  // Empty string will never match
    }
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE.length; i++) {
      if (i > 0) sb.append(", ");
      sb.append("'").append(NAMESPACES_EXCLUDED_FROM_KEEP_AT_LEAST_ONE[i]).append("'");
    }
    return sb.toString();
  }

  /**
   * Returns {@code sql} with parameters replaced including excluded namespaces.
   */
  private static String sqlWithExclusions(
      @NonNull final String sqlTemplate, final int numberOfRowsPerBatch, final int retentionDays) {
    return checkNotBlank(sqlTemplate)
        .replace("${numberOfRowsPerBatch}", String.valueOf(numberOfRowsPerBatch))
        .replace("${retentionDays}", String.valueOf(retentionDays))
        .replace("${excludedNamespaces}", getExcludedNamespacesForSql());
  }

  /** Returns estimate of rows older than X days. */
  private static int estimateOfRowsOlderThanXDays(
      @NonNull final Jdbi jdbi, @NonNull final String retentionQuery) {
    return jdbi.withHandle(
        handle -> {
          final OutParameters result =
              handle
                  .createCall(
                      "{:estimate = call estimate_number_of_rows_older_than_x_days(:retentionQuery)}")
                  .bind("retentionQuery", retentionQuery)
                  .registerOutParameter("estimate", Types.INTEGER)
                  .invoke();
          return result.getInt("estimate");
        });
  }

  /** Call function with the specified {@code handle}. */
  private static int callWith(@NonNull final Handle handle, @NonNull String functionName) {
    final OutParameters result =
        handle
            .createCall(
                """
                {:rows_deleted_total = call ${functionName}}
                """
                    .replace("${functionName}", functionName))
            .registerOutParameter("rows_deleted_total", Types.INTEGER)
            .invoke();
    return result.getInt("rows_deleted_total");
  }

  /** Create {@code estimate_number_of_rows_older_than_x_days()}. */
  private static final String CREATE_OR_REPLACE_FUNCTION_ESTIMATE_NUMBER_OF_ROWS_OLDER_THAN_X_DAYS =
      """
      CREATE OR REPLACE FUNCTION estimate_number_of_rows_older_than_x_days(retention_query TEXT)
        RETURNS INT AS $$
      DECLARE
        query_plan_as_json JSON;
      BEGIN
        EXECUTE 'EXPLAIN (FORMAT JSON) ' || retention_query INTO query_plan_as_json;
        RETURN (query_plan_as_json -> 0 -> 'Plan' ->> 'Plan Rows')::INT;
      END;
      $$ LANGUAGE plpgsql;
      """;

  private static final String DRY_RUN_DELETE_FROM_JOBS_OLDER_THAN_X_DAYS =
      """
      DELETE FROM jobs
        WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
      """;

  private static final String DRY_RUN_DELETE_FROM_JOB_VERSIONS_OLDER_THAN_X_DAYS =
      """
      DELETE FROM job_versions
        WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
      """;

  private static final String DRY_RUN_DELETE_FROM_RUNS_OLDER_THAN_X_DAYS =
      """
      DELETE FROM runs
        WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
      """;

  /** Create {@code used_datasets_as_input_in_x_days()}. */
  private static final String DRY_RUN_CREATE_TEMP_TABLES_FOR_DATASETS =
      """
      CREATE TEMPORARY TABLE used_datasets_as_input_in_x_days AS (
        SELECT dataset_uuid
          FROM job_versions_io_mapping AS jvio INNER JOIN job_versions AS jv
            ON jvio.job_version_uuid = jv.uuid
         WHERE jv.created_at >= CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
           AND jvio.io_type = 'INPUT'
      );
      """;

  private static final String DRY_RUN_DELETE_FROM_DATASETS_OLDER_THAN_X_DAYS =
      """
      DELETE FROM datasets AS d
        WHERE d.uuid IN (
          SELECT uuid
            FROM datasets
           WHERE updated_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
        ) AND NOT EXISTS (
          SELECT 1
            FROM used_datasets_as_input_in_x_days AS udi
           WHERE d.uuid = udi.dataset_uuid
        )
      """;

  /** Drop {@code used_datasets_as_input_in_x_days()} */
  private static final String DRY_RUN_DROP_TEMP_TABLES_FOR_DATASETS =
      """
      DROP TABLE used_datasets_as_input_in_x_days;
      """;

  /**
   * Create {@code used_dataset_versions_as_input_in_x_days()} and {@code
   * used_dataset_versions_as_current_in_x_days()}.
   */
  private static final String DRY_RUN_CREATE_TEMP_TABLES_FOR_DATASET_VERSIONS =
      """
      CREATE TEMPORARY TABLE used_dataset_versions_as_input_in_x_days AS (
        SELECT dataset_version_uuid
          FROM runs_input_mapping AS ri INNER JOIN runs AS r
            ON ri.run_uuid = r.uuid
         WHERE r.created_at >= CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
      );
      CREATE TEMPORARY TABLE used_dataset_versions_as_current_in_x_days AS (
        SELECT current_version_uuid
          FROM datasets
         WHERE updated_at >= CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
      );
      """;

  private static final String DRY_RUN_DELETE_FROM_DATASET_VERSIONS_OLDER_THAN_X_DAYS =
      """
      DELETE FROM dataset_versions AS dv
        WHERE dv.uuid IN (
          SELECT uuid
            FROM dataset_versions
           WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
        ) AND NOT EXISTS (
          SELECT 1
            FROM used_dataset_versions_as_input_in_x_days AS udvi
           WHERE dv.uuid = udvi.dataset_version_uuid
        ) OR NOT EXISTS (
          SELECT 1
            FROM used_dataset_versions_as_current_in_x_days AS udvc
           WHERE dv.uuid = udvc.current_version_uuid
        ) RETURNING uuid
      """;

  /**
   * Drop {@code used_dataset_versions_as_input_in_x_days()} and {@code
   * used_dataset_versions_as_current_in_x_days()}.
   */
  private static final String DRY_RUN_DROP_TEMP_TABLES_FOR_DATASET_VERSIONS =
      """
      DROP TABLE used_dataset_versions_as_input_in_x_days;
      DROP TABLE used_dataset_versions_as_current_in_x_days;
      """;

  private static final String DRY_RUN_DELETE_FROM_LINEAGE_EVENTS_OLDER_THAN_X_DAYS =
      """
      DELETE FROM lineage_events
        WHERE event_time < CURRENT_TIMESTAMP - INTERVAL '${retentionDays} days'
      """;
}
