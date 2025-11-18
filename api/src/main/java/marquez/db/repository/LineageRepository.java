/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.db.repository;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import marquez.db.models.ColumnLineageNodeData;
import marquez.db.models.ColumnLineageRow;
import org.apache.commons.lang3.tuple.Pair;

public interface LineageRepository {
  List<ColumnLineageRow> upsertColumnLineageRow(
      UUID outputDatasetVersionUuid,
      UUID outputDatasetFieldUuid,
      List<Pair<UUID, UUID>> inputs,
      String transformationDescription,
      String transformationType,
      Instant now);

  Set<ColumnLineageNodeData> getLineage(
      int depth, List<UUID> datasetFieldUuids, boolean withDownstream, Instant createdAtUntil);

  Set<ColumnLineageNodeData> getLineageRowsForDatasets(List<Pair<String, String>> datasets);
}
