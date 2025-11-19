/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.service.models.neo4j;

import java.util.List;
import java.util.Map;
import lombok.Value;

@Value
public class LineageNodeData {
  List<String> labels;
  Map<String, Object> properties;
}
