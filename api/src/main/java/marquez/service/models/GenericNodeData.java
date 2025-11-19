/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez.service.models;

import java.util.Map;
import lombok.Value;

@Value
public class GenericNodeData implements NodeData {
  Map<String, Object> properties;
}
