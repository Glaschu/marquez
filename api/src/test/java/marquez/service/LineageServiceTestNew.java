/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.service;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.google.common.collect.ImmutableList;
import marquez.common.models.JobName;
import marquez.common.models.NamespaceName;
import marquez.db.JobDao;
import marquez.db.LineageDao;
import marquez.db.RunDao;
import marquez.service.models.Lineage;
import marquez.service.models.Node;
import marquez.service.models.NodeId;
import marquez.service.models.NodeType;
import marquez.service.models.neo4j.LineageGraph;
import org.junit.jupiter.api.Test;

public class LineageServiceTestNew {

  @Test
  public void testLineage() {
    Neo4jService neo4jService = mock(Neo4jService.class);
    LineageDao lineageDao = mock(LineageDao.class);
    JobDao jobDao = mock(JobDao.class);
    RunDao runDao = mock(RunDao.class);

    LineageService lineageService = new LineageService(lineageDao, jobDao, runDao, neo4jService);

    NodeId nodeId = NodeId.of(new NamespaceName("test"), new JobName("test"));
    int depth = 2;

    when(neo4jService.getLineage(nodeId, depth))
        .thenReturn(
            new LineageGraph(
                ImmutableList.of(
                    new Node(nodeId, NodeType.JOB, null, null, null)),
                ImmutableList.of()));

    Lineage lineage = lineageService.lineage(nodeId, depth);

    assert lineage.getGraph().size() == 1;
    assert lineage.getGraph().asList().get(0).getId().equals(nodeId);
  }
}
