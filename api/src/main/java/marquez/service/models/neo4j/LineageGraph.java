/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.service.models.neo4j;

import java.util.List;
import lombok.Value;
import marquez.service.models.Edge;
import marquez.service.models.Node;

@Value
public class LineageGraph {
  List<Node> nodes;
  List<Edge> edges;
}
