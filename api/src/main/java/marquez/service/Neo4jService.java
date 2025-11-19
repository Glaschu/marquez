/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.service;

import static org.neo4j.driver.Values.parameters;

import marquez.common.models.DatasetFieldId;
import marquez.common.models.DatasetId;
import marquez.common.models.DatasetName;
import marquez.common.models.FieldName;
import marquez.common.models.JobId;
import marquez.common.models.JobName;
import marquez.common.models.NamespaceName;
import marquez.common.models.RunId;
import marquez.db.models.ColumnLineageRow;
import marquez.db.models.DatasetFieldRow;
import marquez.db.models.JobRow;
import marquez.db.models.RunRow;
import marquez.db.models.UpdateLineageRow;
import marquez.service.models.Edge;
import marquez.service.models.GenericNodeData;
import marquez.service.models.Node;
import marquez.service.models.NodeData;
import marquez.service.models.NodeId;
import marquez.service.models.NodeType;
import marquez.service.models.neo4j.LineageGraph;
import org.neo4j.driver.Driver;
import org.neo4j.driver.Result;
import org.neo4j.driver.Session;
import org.neo4j.driver.Transaction;
import org.neo4j.driver.Value;
import org.neo4j.driver.types.Path;
import org.neo4j.driver.types.Relationship;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;
import java.util.stream.Collectors;

public class Neo4jService {
  private final Driver driver;

  public Neo4jService(Driver driver) {
    this.driver = driver;
  }

  public LineageGraph getLineage(NodeId nodeId, int depth) {
    try (Session session = driver.session()) {
      return session.readTransaction(
          tx -> {
            String namespace;
            String name;
            if (nodeId.isJobType()) {
              namespace = nodeId.asJobId().getNamespace().getValue();
              name = nodeId.asJobId().getName().getValue();
            } else {
              namespace = nodeId.asDatasetId().getNamespace().getValue();
              name = nodeId.asDatasetId().getName().getValue();
            }
            Result result =
                tx.run(
                    "MATCH path = (n)-[*.." + depth + "]-(m) " +
                    "WHERE n.name=$name AND n.namespace=$namespace " +
                    "RETURN path",
                    parameters(
                        "name",
                        name,
                        "namespace",
                        namespace));
            return toLineageGraph(result);
          });
    }
  }

  private LineageGraph toLineageGraph(Result result) {
    List<Path> paths = result.list(record -> record.get("path").asPath());
    if (paths.isEmpty()) {
      return new LineageGraph(Collections.emptyList(), Collections.emptyList());
    }

    Map<String, org.neo4j.driver.types.Node> neoNodesByElementId = new HashMap<>();
    List<Relationship> relationships = new ArrayList<>();

    for (Path path : paths) {
      path.nodes().forEach(node -> neoNodesByElementId.putIfAbsent(node.elementId(), node));
      path.relationships().forEach(relationships::add);
    }

    Map<String, NodeMetadata> metadataByElementId = new HashMap<>();
    for (org.neo4j.driver.types.Node neoNode : neoNodesByElementId.values()) {
      NodeMetadata metadata = toNodeMetadata(neoNode, neoNodesByElementId, relationships);
      if (metadata != null) {
        metadataByElementId.put(neoNode.elementId(), metadata);
      }
    }

    if (metadataByElementId.isEmpty()) {
      return new LineageGraph(Collections.emptyList(), Collections.emptyList());
    }

    Set<Edge> edges = new LinkedHashSet<>();
    for (Relationship relationship : relationships) {
      NodeMetadata origin = metadataByElementId.get(relationship.startNodeElementId());
      NodeMetadata destination = metadataByElementId.get(relationship.endNodeElementId());
      if (origin != null && destination != null) {
        edges.add(Edge.of(origin.nodeId(), destination.nodeId()));
      }
    }

    Map<NodeId, Set<Edge>> inEdges = new HashMap<>();
    Map<NodeId, Set<Edge>> outEdges = new HashMap<>();
    for (Edge edge : edges) {
      outEdges.computeIfAbsent(edge.getOrigin(), ignored -> new TreeSet<>()).add(edge);
      inEdges.computeIfAbsent(edge.getDestination(), ignored -> new TreeSet<>()).add(edge);
    }

    List<Node> nodes =
        metadataByElementId.values().stream()
            .map(
                metadata ->
                    new Node(
                        metadata.nodeId(),
                        metadata.nodeType(),
                        metadata.nodeData(),
                        inEdges.getOrDefault(metadata.nodeId(), Collections.emptySet()),
                        outEdges.getOrDefault(metadata.nodeId(), Collections.emptySet())))
            .sorted(Comparator.comparing(node -> node.getId().getValue()))
            .collect(Collectors.toList());

    return new LineageGraph(nodes, new ArrayList<>(edges));
  }

  private NodeMetadata toNodeMetadata(
      org.neo4j.driver.types.Node neoNode,
      Map<String, org.neo4j.driver.types.Node> neoNodesByElementId,
      List<Relationship> relationships) {
    Set<String> labels = new LinkedHashSet<>();
    neoNode.labels().forEach(labels::add);

    if (labels.contains("Job")) {
      String namespace = readStringProperty(neoNode, "namespace");
      String name = readStringProperty(neoNode, "name");
      if (namespace == null || name == null) {
        return null;
      }
      NodeId nodeId = NodeId.of(NamespaceName.of(namespace), JobName.of(name));
      return new NodeMetadata(nodeId, NodeType.JOB, new GenericNodeData(neoNode.asMap()));
    }

    if (labels.contains("DatasetVersion")) {
      String uuidValue = readStringProperty(neoNode, "uuid");
      if (uuidValue == null) {
        return null;
      }
      org.neo4j.driver.types.Node datasetNode =
          findRelatedNode(neoNode.elementId(), relationships, neoNodesByElementId, "VERSION_OF", true);
      if (datasetNode == null) {
        datasetNode =
            findRelatedNode(neoNode.elementId(), relationships, neoNodesByElementId, "VERSION_OF", false);
      }
      if (datasetNode == null) {
        return null;
      }
      String namespace = readStringProperty(datasetNode, "namespace");
      String name = readStringProperty(datasetNode, "name");
      if (namespace == null || name == null) {
        return null;
      }
      NodeId nodeId =
          NodeId.of(
              NamespaceName.of(namespace),
              DatasetName.of(name),
              UUID.fromString(uuidValue));
      return new NodeMetadata(nodeId, NodeType.DATASETSVERSION, new GenericNodeData(neoNode.asMap()));
    }

    if (labels.contains("Dataset")) {
      String namespace = readStringProperty(neoNode, "namespace");
      String name = readStringProperty(neoNode, "name");
      if (namespace == null || name == null) {
        return null;
      }
      NodeId nodeId = NodeId.of(NamespaceName.of(namespace), DatasetName.of(name));
      return new NodeMetadata(nodeId, NodeType.DATASET, new GenericNodeData(neoNode.asMap()));
    }

    if (labels.contains("Run")) {
      String uuidValue = readStringProperty(neoNode, "uuid");
      if (uuidValue == null) {
        return null;
      }
      NodeId nodeId = NodeId.of(RunId.of(UUID.fromString(uuidValue)));
      return new NodeMetadata(nodeId, NodeType.RUN, new GenericNodeData(neoNode.asMap()));
    }

    if (labels.contains("DatasetField")) {
      String fieldName = readStringProperty(neoNode, "name");
      if (fieldName == null) {
        return null;
      }
      org.neo4j.driver.types.Node datasetNode =
          findRelatedNode(neoNode.elementId(), relationships, neoNodesByElementId, "IS_PART_OF", true);
      if (datasetNode == null) {
        datasetNode =
            findRelatedNode(neoNode.elementId(), relationships, neoNodesByElementId, "IS_PART_OF", false);
      }
      if (datasetNode == null) {
        return null;
      }
      String namespace = readStringProperty(datasetNode, "namespace");
      String name = readStringProperty(datasetNode, "name");
      if (namespace == null || name == null) {
        return null;
      }
      NodeId nodeId =
          NodeId.of(
              new DatasetFieldId(
                  new DatasetId(NamespaceName.of(namespace), DatasetName.of(name)),
                  FieldName.of(fieldName)));
      return new NodeMetadata(nodeId, NodeType.DATASET_FIELD, new GenericNodeData(neoNode.asMap()));
    }

    return null;
  }

  private org.neo4j.driver.types.Node findRelatedNode(
      String elementId,
      List<Relationship> relationships,
      Map<String, org.neo4j.driver.types.Node> neoNodesByElementId,
      String relationshipType,
      boolean outgoing) {
    for (Relationship relationship : relationships) {
      if (!relationshipType.equals(relationship.type())) {
        continue;
      }
      if (outgoing && relationship.startNodeElementId().equals(elementId)) {
        return neoNodesByElementId.get(relationship.endNodeElementId());
      }
      if (!outgoing && relationship.endNodeElementId().equals(elementId)) {
        return neoNodesByElementId.get(relationship.startNodeElementId());
      }
    }
    return null;
  }

  private String readStringProperty(org.neo4j.driver.types.Node node, String property) {
    if (!node.containsKey(property)) {
      return null;
    }
    Value value = node.get(property);
    return value.isNull() ? null : value.asString();
  }

  private record NodeMetadata(NodeId nodeId, NodeType nodeType, NodeData nodeData) {}


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
