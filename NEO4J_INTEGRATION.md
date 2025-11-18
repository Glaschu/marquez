# Neo4j Integration

This document describes the integration of Neo4j into the Marquez API for handling complex lineage data.

## Summary

The Marquez API has been updated to support a dual-database setup, using both PostgreSQL and Neo4j. PostgreSQL continues to be used for relational data, while Neo4j is now used to store and manage complex lineage information. This allows for more efficient querying and visualization of data lineage.

The integration is designed to be seamless. OpenLineage events sent to the `/api/v1/lineage` endpoint are processed and persisted to both PostgreSQL and Neo4j databases.

## Configuration

To enable the Neo4j integration, you need to add the following configuration to your `marquez.yml` file:

```yaml
neo4j:
  uri: "bolt://localhost:7687"
  username: "neo4j"
  password: "password"
```

These are the default values. You can change them to match your Neo4j instance configuration.

## Implementation Details

The following changes were made to integrate Neo4j:

-   **`Neo4jConfig.java`**: A new configuration class was added to hold Neo4j connection details.
-   **`MarquezConfig.java`**: The main configuration class was updated to include the `Neo4jConfig`.
-   **`build.gradle`**: The `neo4j-java-driver` dependency was added to the `api` subproject.
-   **`MarquezApp.java`**: The main application class now initializes the Neo4j `Driver` and manages its lifecycle.
-   **`Neo4jService.java`**: A new service was created to encapsulate all Neo4j database operations. This service is responsible for creating nodes and relationships in the Neo4j database.
-   **`MarquezContext.java`**: The application context was updated to create and provide the `Neo4jService` to other services.
-   **`OpenLineageService.java`**: This service was updated to call the `Neo4jService` when processing OpenLineage events, ensuring that lineage data is persisted to Neo4j.
-   **`UpdateLineageRow.java`**: The `DatasetRecord` inner class was updated to include field information, which is necessary for creating the column-level lineage graph in Neo4j.

## Data Model

The data model in Neo4j is designed to represent the lineage graph. The following nodes and relationships are created:

### Nodes

-   `Namespace`: Represents a namespace.
-   `Job`: Represents a job.
-   `Run`: Represents a run of a job.
-   `Dataset`: Represents a dataset.
-   `DatasetVersion`: Represents a version of a dataset.
-   `DatasetField`: Represents a field within a dataset.

### Relationships

-   `(Job)-[:HAS_RUN]->(Run)`
-   `(Job)-[:IN_NAMESPACE]->(Namespace)`
-   `(Run)-[:CONSUMED]->(DatasetVersion)`
-   `(DatasetVersion)-[:PRODUCED_BY]->(Run)`
-   `(DatasetVersion)-[:VERSION_OF]->(Dataset)`
-   `(DatasetField)-[:IS_PART_OF]->(Dataset)`
-   `(DatasetField)-[:DERIVED_FROM]->(DatasetField)`: Represents column-level lineage.
