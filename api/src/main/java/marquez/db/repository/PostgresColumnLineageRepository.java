/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.db.repository;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import marquez.db.ColumnLineageDao;
import marquez.db.models.ColumnLineageNodeData;
import marquez.db.models.ColumnLineageRow;
import org.apache.commons.lang3.tuple.Pair;

public class PostgresColumnLineageRepository implements LineageRepository {

  private final ColumnLineageDao columnLineageDao;

  public PostgresColumnLineageRepository(ColumnLineageDao columnLineageDao) {
    this.columnLineageDao = columnLineageDao;
  }

  @Override
  public List<ColumnLineageRow> upsertColumnLineageRow(
      UUID outputDatasetVersionUuid,
      UUID outputDatasetFieldUuid,
      List<Pair<UUID, UUID>> inputs,
      String transformationDescription,
      String transformationType,
      Instant now) {
    return columnLineageDao.upsertColumnLineageRow(
        outputDatasetVersionUuid,
        outputDatasetFieldUuid,
        inputs,
        transformationDescription,
        transformationType,
        now);
  }

  @Override
  public Set<ColumnLineageNodeData> getLineage(
      int depth, List<UUID> datasetFieldUuids, boolean withDownstream, Instant createdAtUntil) {
    return columnLineageDao.getLineage(depth, datasetFieldUuids, withDownstream, createdAtUntil);
  }

  @Override
  public Set<ColumnLineageNodeData> getLineageRowsForDatasets(List<Pair<String, String>> datasets) {
    return columnLineageDao.getLineageRowsForDatasets(datasets);
  }
}
