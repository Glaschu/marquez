// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as actionCreators from '../../../store/actionCreators'
import * as actionTypes from '../../../store/actionCreators/actionTypes'

import {
  ColumnLineageGraph,
  Dataset,
  DatasetVersion,
  Events,
  Facets,
  Job,
  LineageGraph,
  Namespace,
  OpenSearchResultDatasets,
  OpenSearchResultJobs,
  Run,
  RunState,
  Search,
  Tag,
} from '../../../types/api'
import { IntervalMetric } from '../../../store/requests/intervalMetrics'
import { JobOrDataset } from '../../../types/lineage'
import { LineageMetric } from '../../../store/requests/lineageMetrics'

type Case = {
  name: keyof typeof actionCreators
  args: unknown[]
  expected: unknown
}

describe('store/actionCreators', () => {
  const eventsSample = {
    events: [],
    totalCount: 0,
  } as unknown as Events
  const dataset = { name: 'users', namespace: 'analytics' } as unknown as Dataset
  const datasetVersion = { version: 'v1' } as unknown as DatasetVersion
  const job = { name: 'daily-job' } as unknown as Job
  const run = { id: 'run-1' } as unknown as Run
  const lineageGraph = { graph: [] } as unknown as LineageGraph
  const columnLineageGraph = { graph: [] } as unknown as ColumnLineageGraph
  const facetsSample = {
    runId: 'run-1',
    facets: { sql: { query: 'SELECT 1' } },
  } as unknown as Facets
  const namespaceObj: Namespace = {
    name: 'analytics',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    ownerName: 'data-eng',
    description: 'Analytics namespace',
    isHidden: false,
  }
  const tagObj: Tag = { name: 'priority', description: 'High priority data' }
  const searchSample = {
    totalCount: 1,
    results: [
      {
        name: 'job',
        namespace: 'analytics',
        nodeId: 'job:analytics.job',
        type: 'JOB',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ],
  } as unknown as Search
  const openSearchJobs = { hits: [], highlights: [] } as unknown as OpenSearchResultJobs
  const openSearchDatasets = {
    hits: [],
    highlights: {},
  } as unknown as OpenSearchResultDatasets
  const lineageMetrics: LineageMetric[] = [
    {
      startInterval: '2024-01-01',
      endInterval: '2024-01-07',
      fail: 1,
      start: 2,
      complete: 3,
      abort: 0,
    },
  ]
  const intervalMetrics: IntervalMetric[] = [
    {
      startInterval: '2024-01-01',
      endInterval: '2024-01-07',
      count: 5,
    },
  ]
  const jobsByStateRunState: RunState = 'COMPLETED'
  const fetchJobsRunState: RunState = 'RUNNING'
  const nodeType: JobOrDataset = 'JOB'

  const cases: Case[] = [
    {
      name: 'fetchEvents',
      args: ['2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 50, 10],
      expected: {
        type: actionTypes.FETCH_EVENTS,
        payload: {
          before: '2024-01-02T00:00:00Z',
          after: '2024-01-01T00:00:00Z',
          limit: 50,
          offset: 10,
        },
      },
    },
    {
      name: 'fetchEventsSuccess',
      args: [eventsSample],
      expected: {
        type: actionTypes.FETCH_EVENTS_SUCCESS,
        payload: {
          events: eventsSample,
        },
      },
    },
    {
      name: 'resetEvents',
      args: [],
      expected: {
        type: actionTypes.RESET_EVENTS,
      },
    },
    {
      name: 'fetchDatasets',
      args: ['analytics', 25, 5],
      expected: {
        type: actionTypes.FETCH_DATASETS,
        payload: {
          namespace: 'analytics',
          limit: 25,
          offset: 5,
        },
      },
    },
    {
      name: 'fetchDatasetsSuccess',
      args: [[dataset], 42],
      expected: {
        type: actionTypes.FETCH_DATASETS_SUCCESS,
        payload: {
          datasets: [dataset],
          totalCount: 42,
        },
      },
    },
    {
      name: 'fetchDataset',
      args: ['analytics', 'users'],
      expected: {
        type: actionTypes.FETCH_DATASET,
        payload: {
          namespace: 'analytics',
          name: 'users',
        },
      },
    },
    {
      name: 'fetchDatasetSuccess',
      args: [dataset],
      expected: {
        type: actionTypes.FETCH_DATASET_SUCCESS,
        payload: {
          dataset,
        },
      },
    },
    {
      name: 'fetchDatasetVersions',
      args: ['analytics', 'users', 10, 1],
      expected: {
        type: actionTypes.FETCH_DATASET_VERSIONS,
        payload: {
          namespace: 'analytics',
          name: 'users',
          limit: 10,
          offset: 1,
        },
      },
    },
    {
      name: 'fetchDatasetVersionsSuccess',
      args: [[datasetVersion], 11],
      expected: {
        type: actionTypes.FETCH_DATASET_VERSIONS_SUCCESS,
        payload: {
          versions: [datasetVersion],
          totalCount: 11,
        },
      },
    },
    {
      name: 'fetchInitialDatasetVersions',
      args: ['analytics', 'users'],
      expected: {
        type: actionTypes.FETCH_INITIAL_DATASET_VERSIONS,
        payload: {
          namespace: 'analytics',
          name: 'users',
        },
      },
    },
    {
      name: 'fetchInitialDatasetVersionsSuccess',
      args: [[datasetVersion], 3],
      expected: {
        type: actionTypes.FETCH_INITIAL_DATASET_VERSIONS_SUCCESS,
        payload: {
          versions: [datasetVersion],
          totalCount: 3,
        },
      },
    },
    {
      name: 'resetDatasetVersions',
      args: [],
      expected: {
        type: actionTypes.RESET_DATASET_VERSIONS,
      },
    },
    {
      name: 'resetDataset',
      args: [],
      expected: {
        type: actionTypes.RESET_DATASET,
      },
    },
    {
      name: 'deleteDataset',
      args: ['users', 'analytics'],
      expected: {
        type: actionTypes.DELETE_DATASET,
        payload: {
          datasetName: 'users',
          namespace: 'analytics',
        },
      },
    },
    {
      name: 'deleteDatasetSuccess',
      args: ['users'],
      expected: {
        type: actionTypes.DELETE_DATASET_SUCCESS,
        payload: {
          datasetName: 'users',
        },
      },
    },
    {
      name: 'deleteJobTag',
      args: ['analytics', 'daily-job', 'priority'],
      expected: {
        type: actionTypes.DELETE_JOB_TAG,
        payload: {
          namespace: 'analytics',
          jobName: 'daily-job',
          tag: 'priority',
        },
      },
    },
    {
      name: 'deleteJobTagSuccess',
      args: ['analytics', 'daily-job', 'priority'],
      expected: {
        type: actionTypes.DELETE_JOB_TAG_SUCCESS,
        payload: {
          namespace: 'analytics',
          jobName: 'daily-job',
          tag: 'priority',
        },
      },
    },
    {
      name: 'deleteDatasetTag',
      args: ['analytics', 'users', 'pii'],
      expected: {
        type: actionTypes.DELETE_DATASET_TAG,
        payload: {
          namespace: 'analytics',
          datasetName: 'users',
          tag: 'pii',
        },
      },
    },
    {
      name: 'deleteDatasetTagSuccess',
      args: ['analytics', 'users', 'pii'],
      expected: {
        type: actionTypes.DELETE_DATASET_TAG_SUCCESS,
        payload: {
          namespace: 'analytics',
          datasetName: 'users',
          tag: 'pii',
        },
      },
    },
    {
      name: 'deleteDatasetFieldTag',
      args: ['analytics', 'users', 'pii', 'email'],
      expected: {
        type: actionTypes.DELETE_DATASET_FIELD_TAG,
        payload: {
          namespace: 'analytics',
          datasetName: 'users',
          tag: 'pii',
          field: 'email',
        },
      },
    },
    {
      name: 'deleteDatasetFieldTagSuccess',
      args: ['analytics', 'users', 'email', 'pii'],
      expected: {
        type: actionTypes.DELETE_DATASET_FIELD_TAG_SUCCESS,
        payload: {
          namespace: 'analytics',
          datasetName: 'users',
          tag: 'pii',
          field: 'email',
        },
      },
    },
    {
      name: 'addJobTag',
      args: ['analytics', 'daily-job', 'priority'],
      expected: {
        type: actionTypes.ADD_JOB_TAG,
        payload: {
          namespace: 'analytics',
          jobName: 'daily-job',
          tag: 'priority',
        },
      },
    },
    {
      name: 'addJobTagSuccess',
      args: ['analytics', 'daily-job', 'priority'],
      expected: {
        type: actionTypes.ADD_JOB_TAG_SUCCESS,
        payload: {
          namespace: 'analytics',
          jobName: 'daily-job',
          tag: 'priority',
        },
      },
    },
    {
      name: 'addDatasetTag',
      args: ['analytics', 'users', 'pii'],
      expected: {
        type: actionTypes.ADD_DATASET_TAG,
        payload: {
          namespace: 'analytics',
          datasetName: 'users',
          tag: 'pii',
        },
      },
    },
    {
      name: 'addDatasetTagSuccess',
      args: ['analytics', 'users', 'pii'],
      expected: {
        type: actionTypes.ADD_DATASET_TAG_SUCCESS,
        payload: {
          namespace: 'analytics',
          datasetName: 'users',
          tag: 'pii',
        },
      },
    },
    {
      name: 'addDatasetFieldTag',
      args: ['analytics', 'users', 'pii', 'email'],
      expected: {
        type: actionTypes.ADD_DATASET_FIELD_TAG,
        payload: {
          namespace: 'analytics',
          datasetName: 'users',
          tag: 'pii',
          field: 'email',
        },
      },
    },
    {
      name: 'addDatasetFieldTagSuccess',
      args: ['analytics', 'users', 'email', 'pii'],
      expected: {
        type: actionTypes.ADD_DATASET_FIELD_TAG_SUCCESS,
        payload: {
          namespace: 'analytics',
          datasetName: 'users',
          field: 'email',
          tag: 'pii',
        },
      },
    },
    {
      name: 'resetDatasets',
      args: [],
      expected: {
        type: actionTypes.RESET_DATASETS,
      },
    },
    {
      name: 'fetchJobs',
      args: ['analytics', 20, 0, fetchJobsRunState],
      expected: {
        type: actionTypes.FETCH_JOBS,
        payload: {
          namespace: 'analytics',
          limit: 20,
          offset: 0,
          lastRunStates: fetchJobsRunState,
        },
      },
    },
    {
      name: 'fetchJobsSuccess',
      args: [[job], 12],
      expected: {
        type: actionTypes.FETCH_JOBS_SUCCESS,
        payload: {
          jobs: [job],
          totalCount: 12,
        },
      },
    },
    {
      name: 'fetchJob',
      args: ['analytics', 'daily-job'],
      expected: {
        type: actionTypes.FETCH_JOB,
        payload: {
          namespace: 'analytics',
          job: 'daily-job',
        },
      },
    },
    {
      name: 'fetchJobSuccess',
      args: [job],
      expected: {
        type: actionTypes.FETCH_JOB_SUCCESS,
        payload: {
          job,
        },
      },
    },
    {
      name: 'resetJobs',
      args: [],
      expected: {
        type: actionTypes.RESET_JOBS,
      },
    },
    {
      name: 'deleteJob',
      args: ['daily-job', 'analytics'],
      expected: {
        type: actionTypes.DELETE_JOB,
        payload: {
          jobName: 'daily-job',
          namespace: 'analytics',
        },
      },
    },
    {
      name: 'deleteJobSuccess',
      args: ['daily-job'],
      expected: {
        type: actionTypes.DELETE_JOB_SUCCESS,
        payload: {
          jobName: 'daily-job',
        },
      },
    },
    {
      name: 'fetchRuns',
      args: ['daily-job', 'analytics', 30, 2],
      expected: {
        type: actionTypes.FETCH_RUNS,
        payload: {
          jobName: 'daily-job',
          namespace: 'analytics',
          limit: 30,
          offset: 2,
        },
      },
    },
    {
      name: 'fetchRunsSuccess',
      args: ['daily-job', [run], 7],
      expected: {
        type: actionTypes.FETCH_RUNS_SUCCESS,
        payload: {
          jobName: 'daily-job',
          runs: [run],
          totalCount: 7,
        },
      },
    },
    {
      name: 'fetchLatestRuns',
      args: ['daily-job', 'analytics'],
      expected: {
        type: actionTypes.FETCH_LATEST_RUNS,
        payload: {
          jobName: 'daily-job',
          namespace: 'analytics',
        },
      },
    },
    {
      name: 'fetchLatestRunsSuccess',
      args: [[run]],
      expected: {
        type: actionTypes.FETCH_LATEST_RUNS_SUCCESS,
        payload: {
          runs: [run],
        },
      },
    },
    {
      name: 'fetchRunFacets',
      args: ['run-1'],
      expected: {
        type: actionTypes.FETCH_RUN_FACETS,
        payload: {
          runId: 'run-1',
        },
      },
    },
    {
      name: 'fetchJobFacets',
      args: ['run-1'],
      expected: {
        type: actionTypes.FETCH_JOB_FACETS,
        payload: {
          runId: 'run-1',
        },
      },
    },
    {
      name: 'fetchFacetsSuccess',
      args: [facetsSample],
      expected: {
        type: actionTypes.FETCH_FACETS_SUCCESS,
        payload: {
          facets: facetsSample.facets,
        },
      },
    },
    {
      name: 'resetFacets',
      args: [],
      expected: {
        type: actionTypes.RESET_FACETS,
      },
    },
    {
      name: 'resetRuns',
      args: [],
      expected: {
        type: actionTypes.RESET_RUNS,
      },
    },
    {
      name: 'fetchNamespacesSuccess',
      args: [[namespaceObj]],
      expected: {
        type: actionTypes.FETCH_NAMESPACES_SUCCESS,
        payload: {
          namespaces: [namespaceObj],
        },
      },
    },
    {
      name: 'fetchTags',
      args: [],
      expected: {
        type: actionTypes.FETCH_TAGS,
      },
    },
    {
      name: 'fetchTagsSuccess',
      args: [[tagObj]],
      expected: {
        type: actionTypes.FETCH_TAGS_SUCCESS,
        payload: {
          tags: [tagObj],
        },
      },
    },
    {
      name: 'addTags',
      args: ['priority', 'High priority data'],
      expected: {
        type: actionTypes.ADD_TAGS,
        payload: {
          tag: 'priority',
          description: 'High priority data',
        },
      },
    },
    {
      name: 'addTagsSuccess',
      args: [],
      expected: {
        type: actionTypes.ADD_TAGS_SUCCESS,
      },
    },
    {
      name: 'applicationError',
      args: ['Something went wrong'],
      expected: {
        type: actionTypes.APPLICATION_ERROR,
        payload: {
          message: 'Something went wrong',
        },
      },
    },
    {
      name: 'dialogToggle',
      args: ['jobDialog'],
      expected: {
        type: actionTypes.DIALOG_TOGGLE,
        payload: {
          field: 'jobDialog',
        },
      },
    },
    {
      name: 'setSelectedNode',
      args: ['node-123'],
      expected: {
        type: actionTypes.SET_SELECTED_NODE,
        payload: 'node-123',
      },
    },
    {
      name: 'setBottomBarHeight',
      args: [320],
      expected: {
        type: actionTypes.SET_BOTTOM_BAR_HEIGHT,
        payload: 320,
      },
    },
    {
      name: 'setTabIndex',
      args: [2],
      expected: {
        type: actionTypes.SET_TAB_INDEX,
        payload: 2,
      },
    },
    {
      name: 'fetchLineage',
      args: [nodeType, 'analytics', 'users', 2],
      expected: {
        type: actionTypes.FETCH_LINEAGE,
        payload: {
          nodeType,
          namespace: 'analytics',
          name: 'users',
          depth: 2,
        },
      },
    },
    {
      name: 'fetchColumnLineage',
      args: [nodeType, 'analytics', 'users', 3],
      expected: {
        type: actionTypes.FETCH_COLUMN_LINEAGE,
        payload: {
          nodeType,
          namespace: 'analytics',
          name: 'users',
          depth: 3,
        },
      },
    },
    {
      name: 'fetchLineageSuccess',
      args: [lineageGraph],
      expected: {
        type: actionTypes.FETCH_LINEAGE_SUCCESS,
        payload: lineageGraph,
      },
    },
    {
      name: 'fetchColumnLineageSuccess',
      args: [columnLineageGraph],
      expected: {
        type: actionTypes.FETCH_COLUMN_LINEAGE_SUCCESS,
        payload: columnLineageGraph,
      },
    },
    {
      name: 'resetLineage',
      args: [],
      expected: {
        type: actionTypes.RESET_LINEAGE,
      },
    },
    {
      name: 'setLineageGraphDepth',
      args: [4],
      expected: {
        type: actionTypes.SET_LINEAGE_GRAPH_DEPTH,
        payload: 4,
      },
    },
    {
      name: 'setShowFullGraph',
      args: [true],
      expected: {
        type: actionTypes.SET_SHOW_FULL_GRAPH,
        payload: true,
      },
    },
    {
      name: 'selectNamespace',
      args: ['analytics'],
      expected: {
        type: actionTypes.SELECT_NAMESPACE,
        payload: 'analytics',
      },
    },
    {
      name: 'fetchSearch',
      args: ['spark', 'datasets', 'desc'],
      expected: {
        type: actionTypes.FETCH_SEARCH,
        payload: {
          q: 'spark',
          filter: 'datasets',
          sort: 'desc',
        },
      },
    },
    {
      name: 'fetchSearchSuccess',
      args: [searchSample],
      expected: {
        type: actionTypes.FETCH_SEARCH_SUCCESS,
        payload: searchSample,
      },
    },
    {
      name: 'setColumnLineageGraphDepth',
      args: [5],
      expected: {
        type: actionTypes.SET_COLUMN_LINEAGE_GRAPH_DEPTH,
        payload: 5,
      },
    },
    {
      name: 'fetchOpenSearchJobs',
      args: ['spark'],
      expected: {
        type: actionTypes.FETCH_OPEN_SEARCH_JOBS,
        payload: {
          q: 'spark',
        },
      },
    },
    {
      name: 'fetchOpenSearchJobsSuccess',
      args: [openSearchJobs],
      expected: {
        type: actionTypes.FETCH_OPEN_SEARCH_JOBS_SUCCESS,
        payload: openSearchJobs,
      },
    },
    {
      name: 'fetchOpenSearchDatasets',
      args: ['users'],
      expected: {
        type: actionTypes.FETCH_OPEN_SEARCH_DATASETS,
        payload: {
          q: 'users',
        },
      },
    },
    {
      name: 'fetchOpenSearchDatasetsSuccess',
      args: [openSearchDatasets],
      expected: {
        type: actionTypes.FETCH_OPEN_SEARCH_DATASETS_SUCCESS,
        payload: openSearchDatasets,
      },
    },
    {
      name: 'fetchLineageMetrics',
      args: ['week'],
      expected: {
        type: actionTypes.FETCH_LINEAGE_METRICS,
        payload: {
          unit: 'week',
        },
      },
    },
    {
      name: 'fetchLineageMetricsSuccess',
      args: [lineageMetrics],
      expected: {
        type: actionTypes.FETCH_LINEAGE_METRICS_SUCCESS,
        payload: lineageMetrics,
      },
    },
    {
      name: 'fetchJobMetrics',
      args: ['day'],
      expected: {
        type: actionTypes.FETCH_JOB_METRICS,
        payload: {
          unit: 'day',
        },
      },
    },
    {
      name: 'fetchJobMetricsSuccess',
      args: [intervalMetrics],
      expected: {
        type: actionTypes.FETCH_JOB_METRICS_SUCCESS,
        payload: intervalMetrics,
      },
    },
    {
      name: 'fetchDatasetMetrics',
      args: ['week'],
      expected: {
        type: actionTypes.FETCH_DATASET_METRICS,
        payload: {
          unit: 'week',
        },
      },
    },
    {
      name: 'fetchDatasetMetricsSuccess',
      args: [intervalMetrics],
      expected: {
        type: actionTypes.FETCH_DATASET_METRICS_SUCCESS,
        payload: intervalMetrics,
      },
    },
    {
      name: 'fetchSourceMetrics',
      args: ['day'],
      expected: {
        type: actionTypes.FETCH_SOURCE_METRICS,
        payload: {
          unit: 'day',
        },
      },
    },
    {
      name: 'fetchSourceMetricsSuccess',
      args: [intervalMetrics],
      expected: {
        type: actionTypes.FETCH_SOURCE_METRICS_SUCCESS,
        payload: intervalMetrics,
      },
    },
    {
      name: 'fetchJobsByState',
      args: [jobsByStateRunState, 15, 1],
      expected: {
        type: actionTypes.FETCH_JOBS_BY_STATE,
        payload: {
          state: jobsByStateRunState,
          limit: 15,
          offset: 1,
        },
      },
    },
    {
      name: 'fetchJobsByStateSuccess',
      args: [[job], 5],
      expected: {
        type: actionTypes.FETCH_JOBS_BY_STATE_SUCCESS,
        payload: {
          jobs: [job],
          totalCount: 5,
        },
      },
    },
  ]

  it.each(cases)('%s returns expected action shape', ({ name, args, expected }) => {
    const creator = actionCreators[name]
    expect(typeof creator).toBe('function')
    const result = (creator as (...creatorArgs: unknown[]) => unknown)(...args)
    expect(result).toEqual(expected)
  })
})
