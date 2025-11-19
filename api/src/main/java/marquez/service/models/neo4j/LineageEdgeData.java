/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.service.models.neo4j;

import java.util.Map;
import lombok.Value;

@Value
public class LineageEdgeData {
  String type;
  Map<String, Object> properties;
}
