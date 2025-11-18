/*
 * Copyright 2018-2023 contributors to the Marquez project
 * SPDX-License-Identifier: Apache-2.0
 */

package marquez;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Configuration for Neo4j database */
@NoArgsConstructor
public class Neo4jConfig {
  @Getter @JsonProperty private String uri = "bolt://localhost:7687";
  @Getter @JsonProperty private String username = "neo4j";
  @Getter @JsonProperty private String password = "password";
}
