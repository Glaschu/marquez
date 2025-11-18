/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.service;

import static org.neo4j.driver.Values.parameters;

import marquez.db.models.ColumnLineageRow;
import marquez.db.models.DatasetFieldRow;
import marquez.db.models.JobRow;
import marquez.db.models.RunRow;
import marquez.db.models.UpdateLineageRow;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Session;
import org.neo4j.driver.Transaction;

public class Neo4jService {
  private final Driver driver;

  public Neo4jService(Driver driver) {
    this.driver = driver;
  }

  public void updateMarquezModel(UpdateLineageRow row) {
    if (row == null) {
      return;
    }
    try (Session session = driver.session()) {
      session.writeTransaction(
          tx -> {
            if (row.getJob() != null) {
              createJobNode(tx, row.getJob());
            }
            if (row.getRun() != null) {
              createRunNode(tx, row.getRun(), row.getJob());
            }

            if (row.getInputs().isPresent()) {
              for (UpdateLineageRow.DatasetRecord dr : row.getInputs().get()) {
                createDatasetGraph(tx, dr, row.getRun(), true);
              }
            }
            if (row.getOutputs().isPresent()) {
              for (UpdateLineageRow.DatasetRecord dr : row.getOutputs().get()) {
                createDatasetGraph(tx, dr, row.getRun(), false);
              }
            }
            return null;
          });
    }
  }

  private void createJobNode(Transaction tx, JobRow job) {
    tx.run(
        "MERGE (j:Job {uuid: $uuid}) SET j.name = $name, j.namespace = $namespace",
        parameters(
            "uuid",
            job.getUuid().toString(),
            "name",
            job.getName(),
            "namespace",
            job.getNamespaceName()));
  }

  private void createRunNode(Transaction tx, RunRow run, JobRow job) {
    tx.run(
        "MERGE (r:Run {uuid: $uuid}) SET r.state = $state",
        parameters(
            "uuid", run.getUuid().toString(), "state", run.getCurrentRunState().orElse(null)));
    if (job != null) {
      tx.run(
          "MATCH (j:Job {uuid: $jobUuid}), (r:Run {uuid: $runUuid}) MERGE (j)-[:HAS_RUN]->(r)",
          parameters("jobUuid", job.getUuid().toString(), "runUuid", run.getUuid().toString()));
    }
  }

  private void createDatasetGraph(
      Transaction tx, UpdateLineageRow.DatasetRecord dr, RunRow run, boolean isInput) {
    // Dataset
    tx.run(
        "MERGE (d:Dataset {uuid: $uuid}) SET d.name = $name, d.namespace = $namespace",
        parameters(
            "uuid",
            dr.getDatasetRow().getUuid().toString(),
            "name",
            dr.getDatasetRow().getName(),
            "namespace",
            dr.getDatasetRow().getNamespaceName()));

    // DatasetVersion
    tx.run(
        "MERGE (dv:DatasetVersion {uuid: $uuid})",
        parameters("uuid", dr.getDatasetVersionRow().getUuid().toString()));
    tx.run(
        "MATCH (d:Dataset {uuid: $dUuid}), (dv:DatasetVersion {uuid: $dvUuid}) MERGE (dv)-[:VERSION_OF]->(d)",
        parameters(
            "dUuid",
            dr.getDatasetRow().getUuid().toString(),
            "dvUuid",
            dr.getDatasetVersionRow().getUuid().toString()));

    if (run != null) {
      if (isInput) {
        tx.run(
            "MATCH (r:Run {uuid: $runUuid}), (dv:DatasetVersion {uuid: $dvUuid}) MERGE (r)-[:CONSUMED]->(dv)",
            parameters(
                "runUuid",
                run.getUuid().toString(),
                "dvUuid",
                dr.getDatasetVersionRow().getUuid().toString()));
      } else {
        tx.run(
            "MATCH (r:Run {uuid: $runUuid}), (dv:DatasetVersion {uuid: $dvUuid}) MERGE (dv)-[:PRODUCED_BY]->(r)",
            parameters(
                "runUuid",
                run.getUuid().toString(),
                "dvUuid",
                dr.getDatasetVersionRow().getUuid().toString()));
      }
    }

    // Fields and Column Lineage
    if (dr.getFields() != null) {
      for (DatasetFieldRow field : dr.getFields()) {
        tx.run(
            "MERGE (f:DatasetField {uuid: $uuid}) SET f.name = $name",
            parameters("uuid", field.getUuid().toString(), "name", field.getName()));
        tx.run(
            "MATCH (d:Dataset {uuid: $dUuid}), (f:DatasetField {uuid: $fUuid}) MERGE (f)-[:IS_PART_OF]->(d)",
            parameters(
                "dUuid",
                dr.getDatasetRow().getUuid().toString(),
                "fUuid",
                field.getUuid().toString()));
      }
    }

    for (ColumnLineageRow cl : dr.getColumnLineageRows()) {
      tx.run(
          "MERGE (output:DatasetField {uuid: $outputFieldUuid}) "
              + "MERGE (input:DatasetField {uuid: $inputFieldUuid}) "
              + "MERGE (output)-[r:DERIVED_FROM]->(input) "
              + "SET r.transformationDescription = $desc, r.transformationType = $type",
          parameters(
              "outputFieldUuid",
              cl.getOutputDatasetFieldUuid().toString(),
              "inputFieldUuid",
              cl.getInputDatasetFieldUuid().toString(),
              "desc",
              cl.getTransformationDescription().orElse(null),
              "type",
              cl.getTransformationType().orElse(null)));
    }
  }
}
