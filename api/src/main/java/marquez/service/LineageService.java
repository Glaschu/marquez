/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.service;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.toList;

import marquez.common.models.RunId;
import marquez.db.JobDao;
import marquez.db.LineageDao;
import marquez.db.RunDao;
import marquez.service.DelegatingDaos.DelegatingLineageDao;
import marquez.service.LineageService.UpstreamRunLineage;
import marquez.service.models.Lineage;
import marquez.service.models.NodeId;
import marquez.service.models.neo4j.LineageGraph;

import javax.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static java.util.stream.Collectors.groupingBy;
import static java.util.stream.Collectors.toList;

@Slf4j
public class LineageService extends DelegatingLineageDao {

  public record UpstreamRunLineage(List<UpstreamRun> runs) {}

  public record UpstreamRun(LineageDao.JobSummary job, LineageDao.RunSummary run, List<LineageDao.DatasetSummary> inputs) {}

  private final JobDao jobDao;
  private final RunDao runDao;
  private final Neo4jService neo4jService;

  public LineageService(LineageDao delegate, JobDao jobDao, RunDao runDao, Neo4jService neo4jService) {
    super(delegate);
    this.jobDao = jobDao;
    this.runDao = runDao;
    this.neo4jService = neo4jService;
  }

  public Lineage lineage(NodeId nodeId, int depth) {
    log.debug("Attempting to get lineage for node '{}' with depth '{}'", nodeId.getValue(), depth);
    LineageGraph graph = neo4jService.getLineage(nodeId, depth);
    return new Lineage(com.google.common.collect.ImmutableSortedSet.copyOf(graph.getNodes()));
  }

  /**
   * Returns the upstream lineage for a given run. Recursively: run -> dataset version it read from
   * -> the run that produced it
   *
   * @param runId the run to get upstream lineage from
   * @param depth the maximum depth of the upstream lineage
   * @return the upstream lineage for that run up to `detph` levels
   */
  public UpstreamRunLineage upstream(@NotNull RunId runId, int depth) {
    List<UpstreamRunRow> upstreamRuns = getUpstreamRuns(runId.getValue(), depth);
    Map<RunId, List<UpstreamRunRow>> collect =
        upstreamRuns.stream().collect(groupingBy(r -> r.run().id(), java.util.LinkedHashMap::new, toList()));
    List<UpstreamRun> runs =
        collect.entrySet().stream()
            .map(
                row -> {
                  UpstreamRunRow upstreamRunRow = row.getValue().get(0);
                  List<LineageDao.DatasetSummary> inputs =
                      row.getValue().stream()
                          .map(UpstreamRunRow::input)
                          .filter(i -> i != null)
                          .collect(toList());
                  return new UpstreamRun(upstreamRunRow.job(), upstreamRunRow.run(), inputs);
                })
            .collect(toList());
    return new UpstreamRunLineage(runs);
  }
}
