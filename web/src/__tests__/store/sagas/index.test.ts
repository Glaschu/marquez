// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { testSaga } from 'redux-saga-test-plan'
import { call as callEffect, AllEffect } from 'redux-saga/effects'

import {
  fetchTags as fetchTagsSaga,
  fetchNamespaces as fetchNamespacesSaga,
  fetchLineage as fetchLineageSaga,
  fetchColumnLineage as fetchColumnLineageSaga,
  fetchSearch as fetchSearchSaga,
  fetchRunsSaga,
  fetchLatestRunsSaga,
  fetchJobsSaga,
  fetchJobSaga,
  deleteJobSaga,
  fetchDatasetsSaga,
  fetchEventsSaga,
  fetchDatasetSaga,
  deleteDatasetSaga,
  deleteJobTagSaga,
  deleteDatasetTagSaga,
  deleteDatasetFieldTagSaga,
  addJobTagSaga,
  addDatasetTagSaga,
  addDatasetFieldTagSaga,
  addTagsSaga,
  fetchDatasetVersionsSaga,
  fetchInitialDatasetVersionsSaga,
  fetchJobFacetsSaga,
  fetchRunFacetsSaga,
  fetchOpenSearchJobsSaga,
  fetchOpenSearchDatasetsSaga,
  fetchLineageMetricsSaga,
  fetchJobMetricsSaga,
  fetchDatasetMetricsSaga,
  fetchSourceMetricsSaga,
  fetchJobsByState as fetchJobsByStateWatcher,
  default as rootSaga,
} from '../../../store/sagas'
import {
  fetchTagsSuccess,
  fetchNamespacesSuccess,
  fetchLineageSuccess,
  fetchColumnLineageSuccess,
  fetchSearchSuccess,
  fetchRunsSuccess,
  fetchLatestRunsSuccess,
  fetchJobsSuccess,
  fetchJobSuccess,
  deleteJobSuccess,
  fetchDatasetsSuccess,
  fetchEventsSuccess,
  fetchDatasetSuccess,
  deleteDatasetSuccess,
  deleteJobTagSuccess,
  deleteDatasetTagSuccess,
  deleteDatasetFieldTagSuccess,
  addJobTagSuccess,
  addDatasetTagSuccess,
  addDatasetFieldTagSuccess,
  addTagsSuccess,
  fetchDatasetVersionsSuccess,
  fetchInitialDatasetVersionsSuccess,
  fetchFacetsSuccess,
  fetchOpenSearchJobsSuccess,
  fetchOpenSearchDatasetsSuccess,
  fetchLineageMetricsSuccess,
  fetchJobMetricsSuccess,
  fetchDatasetMetricsSuccess,
  fetchSourceMetricsSuccess,
  applicationError,
} from '../../../store/actionCreators'
import * as actionTypes from '../../../store/actionCreators/actionTypes'
import {
  getDatasets,
  getDataset,
  deleteDataset,
  deleteDatasetTag,
  addDatasetTag,
  deleteDatasetFieldTag,
  addDatasetFieldTag,
  getDatasetVersions,
  getEvents,
  getJobFacets,
  getRunFacets,
  getJobs,
  getRuns,
  getJob,
  deleteJob,
  deleteJobTag,
  addJobTag,
  addTags,
  getTags,
  getNamespaces,
  getJobsByState,
} from '../../../store/requests'
import { getLineage } from '../../../store/requests/lineage'
import { getColumnLineage } from '../../../store/requests/columnlineage'
import { getOpenSearchJobs, getOpenSearchDatasets, getSearch } from '../../../store/requests/search'
import { getLineageMetrics, LineageMetric } from '../../../store/requests/lineageMetrics'
import { getIntervalMetrics, IntervalMetric } from '../../../store/requests/intervalMetrics'
import {
  ColumnLineageGraph,
  Dataset,
  DatasetVersion,
  DatasetVersions,
  Datasets,
  Events,
  Facets,
  Job,
  Jobs,
  LineageGraph,
  Namespace,
  Namespaces,
  OpenSearchResultDatasets,
  OpenSearchResultJobs,
  Run,
  Runs,
  Search,
  Tag,
  Tags,
  RunState,
} from '../../../types/api'
import { JobOrDataset } from '../../../types/lineage'

const error = new Error('boom')

const tagObj = { name: 'priority', description: 'High priority data' } as Tag
const tagsResponse = { tags: [tagObj] } as Tags
const namespaceObj = {
  name: 'analytics',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-02T00:00:00Z',
  ownerName: 'data-team',
  description: 'Analytics namespace',
  isHidden: false,
} as Namespace
const namespacesResponse = { namespaces: [namespaceObj] } as Namespaces
const dataset = { name: 'users', namespace: 'analytics' } as unknown as Dataset
const datasetsResponse = {
  datasets: [dataset],
  totalCount: 1,
} as unknown as Datasets
const datasetVersion = { version: 'v1' } as unknown as DatasetVersion
const datasetVersionsResponse = {
  versions: [datasetVersion],
  totalCount: 2,
} as unknown as DatasetVersions
const run = { id: 'run-1' } as unknown as Run
const runsResponse = {
  runs: [run],
  totalCount: 3,
} as unknown as Runs
const eventsResponse = {
  events: [],
  totalCount: 0,
} as unknown as Events
const jobEntity = { name: 'daily-job' } as unknown as Job
const jobsResponse = {
  jobs: [jobEntity],
  totalCount: 4,
} as unknown as Jobs
const facetsResponse = {
  runId: 'run-1',
  facets: {},
} as unknown as Facets
const lineageGraph = { graph: [] } as unknown as LineageGraph
const columnLineageGraph = { graph: [] } as unknown as ColumnLineageGraph
const searchResponse = {
  totalCount: 1,
  results: [],
} as unknown as Search
const openSearchJobsResponse = {
  hits: [],
  highlights: [],
} as unknown as OpenSearchResultJobs
const openSearchDatasetsResponse = {
  hits: [],
  highlights: {},
} as unknown as OpenSearchResultDatasets
const lineageMetrics: LineageMetric[] = [
  {
    startInterval: '2024-01-01',
    endInterval: '2024-01-07',
    fail: 0,
    start: 1,
    complete: 1,
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

const lineagePayload = {
  nodeType: 'JOB' as JobOrDataset,
  namespace: 'analytics',
  name: 'users',
  depth: 2,
}
const columnLineagePayload = {
  nodeType: 'DATASET' as JobOrDataset,
  namespace: 'analytics',
  name: 'users',
  depth: 3,
}
const searchPayload = { q: 'spark', filter: 'ALL', sort: 'NAME' }
const runsPayload = { jobName: 'daily-job', namespace: 'analytics', limit: 10, offset: 1 }
const latestRunsPayload = { jobName: 'daily-job', namespace: 'analytics' }
const jobsPayload = {
  namespace: 'analytics',
  limit: 20,
  offset: 2,
  lastRunStates: 'RUNNING' as RunState,
}
const jobPayload = { namespace: 'analytics', job: 'daily-job' }
const deleteJobPayload = { namespace: 'analytics', jobName: 'daily-job' }
const datasetsPayload = { namespace: 'analytics', limit: 10, offset: 0 }
const eventsPayload = {
  after: '2024-01-01',
  before: '2024-01-02',
  limit: 5,
  offset: 0,
}
const datasetPayload = { namespace: 'analytics', name: 'users' }
const deleteDatasetPayload = { namespace: 'analytics', datasetName: 'users' }
const deleteJobTagPayload = { namespace: 'analytics', jobName: 'daily-job', tag: 'priority' }
const deleteDatasetTagPayload = { namespace: 'analytics', datasetName: 'users', tag: 'pii' }
const deleteDatasetFieldTagPayload = {
  namespace: 'analytics',
  datasetName: 'users',
  field: 'email',
  tag: 'pii',
}
const addTagsPayload = { tag: 'priority', description: 'High priority data' }
const datasetVersionsPayload = {
  namespace: 'analytics',
  name: 'users',
  limit: 5,
  offset: 1,
}
const initialDatasetVersionsPayload = { namespace: 'analytics', name: 'users' }
const jobFacetsPayload = { runId: 'run-1' }
const runFacetsPayload = { runId: 'run-1' }
const openSearchJobsPayload = { q: 'spark' }
const openSearchDatasetsPayload = { q: 'users' }
const lineageMetricsPayload = { unit: 'day' as 'day' | 'week' }
const jobMetricsPayload = { unit: 'week' as 'day' | 'week' }
const datasetMetricsPayload = { unit: 'week' as 'day' | 'week' }
const sourceMetricsPayload = { unit: 'day' as 'day' | 'week' }
const jobsByStatePayload = { runState: 'COMPLETED' as RunState, limit: 6, offset: 3 }

const jobDeletionResponse = { name: 'daily-job' } as unknown as Job
const datasetDeletionResponse = { name: 'users' } as unknown as Dataset

interface LoopSagaCase {
  name: string
  saga: () => Generator
  actionType: string
  actionPayload: Record<string, unknown>
  callArgs: [callFn: any, ...params: any[]]
  response?: unknown
  successAction: unknown
  errorMessage: string
  afterSuccess?: (chain: any) => any
  afterError?: (chain: any) => any
}

const loopSagaCases: LoopSagaCase[] = [
  {
    name: 'fetchLineageSaga',
    saga: fetchLineageSaga,
    actionType: actionTypes.FETCH_LINEAGE,
    actionPayload: lineagePayload,
    callArgs: [
      getLineage,
      lineagePayload.nodeType,
      lineagePayload.namespace,
      lineagePayload.name,
      lineagePayload.depth,
    ],
    response: lineageGraph,
    successAction: fetchLineageSuccess(lineageGraph),
    errorMessage: 'Something went wrong while fetching lineage',
  },
  {
    name: 'fetchColumnLineageSaga',
    saga: fetchColumnLineageSaga,
    actionType: actionTypes.FETCH_COLUMN_LINEAGE,
    actionPayload: columnLineagePayload,
    callArgs: [
      getColumnLineage,
      columnLineagePayload.nodeType,
      columnLineagePayload.namespace,
      columnLineagePayload.name,
      columnLineagePayload.depth,
    ],
    response: columnLineageGraph,
    successAction: fetchColumnLineageSuccess(columnLineageGraph),
    errorMessage: 'Something went wrong while fetching lineage',
  },
  {
    name: 'fetchSearchSaga',
    saga: fetchSearchSaga,
    actionType: actionTypes.FETCH_SEARCH,
    actionPayload: searchPayload,
    callArgs: [getSearch, searchPayload.q, searchPayload.filter, searchPayload.sort],
    response: searchResponse,
    successAction: fetchSearchSuccess(searchResponse),
    errorMessage: 'Something went wrong while fetching search',
  },
  {
    name: 'fetchRunsSaga',
    saga: fetchRunsSaga,
    actionType: actionTypes.FETCH_RUNS,
    actionPayload: runsPayload,
    callArgs: [
      getRuns,
      runsPayload.jobName,
      runsPayload.namespace,
      runsPayload.limit,
      runsPayload.offset,
    ],
    response: runsResponse,
    successAction: fetchRunsSuccess(
      runsPayload.jobName,
      runsResponse.runs,
      runsResponse.totalCount
    ),
    errorMessage: 'Something went wrong while fetching job runs',
  },
  {
    name: 'fetchLatestRunsSaga',
    saga: fetchLatestRunsSaga,
    actionType: actionTypes.FETCH_LATEST_RUNS,
    actionPayload: latestRunsPayload,
    callArgs: [
      getRuns,
      latestRunsPayload.jobName,
      latestRunsPayload.namespace,
      14,
      0,
    ],
    response: runsResponse,
    successAction: fetchLatestRunsSuccess(runsResponse.runs),
    errorMessage: 'Something went wrong while fetching latest job runs',
  },
  {
    name: 'fetchJobsSaga',
    saga: fetchJobsSaga,
    actionType: actionTypes.FETCH_JOBS,
    actionPayload: jobsPayload,
    callArgs: [
      getJobs,
      jobsPayload.namespace,
      jobsPayload.limit,
      jobsPayload.offset,
      jobsPayload.lastRunStates,
    ],
    response: jobsResponse,
    successAction: fetchJobsSuccess(jobsResponse.jobs, jobsResponse.totalCount),
    errorMessage: 'Something went wrong while fetching job runs',
  },
  {
    name: 'fetchJobSaga',
    saga: fetchJobSaga,
    actionType: actionTypes.FETCH_JOB,
    actionPayload: jobPayload,
    callArgs: [getJob, jobPayload.namespace, jobPayload.job],
    response: jobEntity,
    successAction: fetchJobSuccess(jobEntity),
    errorMessage: 'Something went wrong while fetching job runs',
  },
  {
    name: 'deleteJobSaga',
    saga: deleteJobSaga,
    actionType: actionTypes.DELETE_JOB,
    actionPayload: deleteJobPayload,
    callArgs: [deleteJob, deleteJobPayload.namespace, deleteJobPayload.jobName],
    response: jobDeletionResponse,
    successAction: deleteJobSuccess(jobDeletionResponse.name),
    errorMessage: 'Something went wrong while removing job',
  },
  {
    name: 'fetchDatasetsSaga',
    saga: fetchDatasetsSaga,
    actionType: actionTypes.FETCH_DATASETS,
    actionPayload: datasetsPayload,
    callArgs: [
      getDatasets,
      datasetsPayload.namespace,
      datasetsPayload.limit,
      datasetsPayload.offset,
    ],
    response: datasetsResponse,
    successAction: fetchDatasetsSuccess(
      datasetsResponse.datasets,
      datasetsResponse.totalCount
    ),
    errorMessage: 'Something went wrong while fetching dataset runs',
  },
  {
    name: 'fetchEventsSaga',
    saga: fetchEventsSaga,
    actionType: actionTypes.FETCH_EVENTS,
    actionPayload: eventsPayload,
    callArgs: [
      getEvents,
      eventsPayload.after,
      eventsPayload.before,
      eventsPayload.limit,
      eventsPayload.offset,
    ],
    response: eventsResponse,
    successAction: fetchEventsSuccess(eventsResponse),
    errorMessage: 'Something went wrong while fetching event runs',
  },
  {
    name: 'fetchDatasetSaga',
    saga: fetchDatasetSaga,
    actionType: actionTypes.FETCH_DATASET,
    actionPayload: datasetPayload,
    callArgs: [getDataset, datasetPayload.namespace, datasetPayload.name],
    response: dataset,
    successAction: fetchDatasetSuccess(dataset),
    errorMessage: 'Something went wrong while fetching dataset',
  },
  {
    name: 'deleteDatasetSaga',
    saga: deleteDatasetSaga,
    actionType: actionTypes.DELETE_DATASET,
    actionPayload: deleteDatasetPayload,
    callArgs: [
      deleteDataset,
      deleteDatasetPayload.namespace,
      deleteDatasetPayload.datasetName,
    ],
    response: datasetDeletionResponse,
    successAction: deleteDatasetSuccess(datasetDeletionResponse.name),
    errorMessage: 'Something went wrong while removing job',
  },
  {
    name: 'deleteJobTagSaga',
    saga: deleteJobTagSaga,
    actionType: actionTypes.DELETE_JOB_TAG,
    actionPayload: deleteJobTagPayload,
    callArgs: [
      deleteJobTag,
      deleteJobTagPayload.namespace,
      deleteJobTagPayload.jobName,
      deleteJobTagPayload.tag,
    ],
    successAction: deleteJobTagSuccess(
      deleteJobTagPayload.namespace,
      deleteJobTagPayload.jobName,
      deleteJobTagPayload.tag
    ),
    errorMessage: 'Something went wrong while removing tag from job',
  },
  {
    name: 'deleteDatasetTagSaga',
    saga: deleteDatasetTagSaga,
    actionType: actionTypes.DELETE_DATASET_TAG,
    actionPayload: deleteDatasetTagPayload,
    callArgs: [
      deleteDatasetTag,
      deleteDatasetTagPayload.namespace,
      deleteDatasetTagPayload.datasetName,
      deleteDatasetTagPayload.tag,
    ],
    successAction: deleteDatasetTagSuccess(
      deleteDatasetTagPayload.namespace,
      deleteDatasetTagPayload.datasetName,
      deleteDatasetTagPayload.tag
    ),
    errorMessage: 'Something went wrong while removing tag from dataset',
  },
  {
    name: 'deleteDatasetFieldTagSaga',
    saga: deleteDatasetFieldTagSaga,
    actionType: actionTypes.DELETE_DATASET_FIELD_TAG,
    actionPayload: deleteDatasetFieldTagPayload,
    callArgs: [
      deleteDatasetFieldTag,
      deleteDatasetFieldTagPayload.namespace,
      deleteDatasetFieldTagPayload.datasetName,
      deleteDatasetFieldTagPayload.field,
      deleteDatasetFieldTagPayload.tag,
    ],
    successAction: deleteDatasetFieldTagSuccess(
      deleteDatasetFieldTagPayload.namespace,
      deleteDatasetFieldTagPayload.datasetName,
      deleteDatasetFieldTagPayload.field,
      deleteDatasetFieldTagPayload.tag
    ),
    errorMessage: 'Something went wrong while removing tag from dataset field',
  },
  {
    name: 'addJobTagSaga',
    saga: addJobTagSaga,
    actionType: actionTypes.ADD_JOB_TAG,
    actionPayload: deleteJobTagPayload,
    callArgs: [
      addJobTag,
      deleteJobTagPayload.namespace,
      deleteJobTagPayload.jobName,
      deleteJobTagPayload.tag,
    ],
    successAction: addJobTagSuccess(
      deleteJobTagPayload.namespace,
      deleteJobTagPayload.jobName,
      deleteJobTagPayload.tag
    ),
    errorMessage: 'Something went wrong while adding tag to job',
  },
  {
    name: 'addDatasetTagSaga',
    saga: addDatasetTagSaga,
    actionType: actionTypes.ADD_DATASET_TAG,
    actionPayload: deleteDatasetTagPayload,
    callArgs: [
      addDatasetTag,
      deleteDatasetTagPayload.namespace,
      deleteDatasetTagPayload.datasetName,
      deleteDatasetTagPayload.tag,
    ],
    successAction: addDatasetTagSuccess(
      deleteDatasetTagPayload.namespace,
      deleteDatasetTagPayload.datasetName,
      deleteDatasetTagPayload.tag
    ),
    errorMessage: 'Something went wrong while adding tag to dataset',
  },
  {
    name: 'addDatasetFieldTagSaga',
    saga: addDatasetFieldTagSaga,
    actionType: actionTypes.ADD_DATASET_FIELD_TAG,
    actionPayload: deleteDatasetFieldTagPayload,
    callArgs: [
      addDatasetFieldTag,
      deleteDatasetFieldTagPayload.namespace,
      deleteDatasetFieldTagPayload.datasetName,
      deleteDatasetFieldTagPayload.field,
      deleteDatasetFieldTagPayload.tag,
    ],
    successAction: addDatasetFieldTagSuccess(
      deleteDatasetFieldTagPayload.namespace,
      deleteDatasetFieldTagPayload.datasetName,
      deleteDatasetFieldTagPayload.field,
      deleteDatasetFieldTagPayload.tag
    ),
    errorMessage: 'Something went wrong while adding tag to dataset field.',
  },
  {
    name: 'addTagsSaga',
    saga: addTagsSaga,
    actionType: actionTypes.ADD_TAGS,
    actionPayload: addTagsPayload,
    callArgs: [addTags, addTagsPayload.tag, addTagsPayload.description],
    successAction: addTagsSuccess(),
    errorMessage: 'Something went wrong while adding a tag.',
    afterSuccess: (chain) =>
      chain
        .call(fetchTagsSaga)
        .next()
        .take(actionTypes.ADD_TAGS),
  },
  {
    name: 'fetchDatasetVersionsSaga',
    saga: fetchDatasetVersionsSaga,
    actionType: actionTypes.FETCH_DATASET_VERSIONS,
    actionPayload: datasetVersionsPayload,
    callArgs: [
      getDatasetVersions,
      datasetVersionsPayload.namespace,
      datasetVersionsPayload.name,
      datasetVersionsPayload.limit,
      datasetVersionsPayload.offset,
    ],
    response: datasetVersionsResponse,
    successAction: fetchDatasetVersionsSuccess(
      datasetVersionsResponse.versions,
      datasetVersionsResponse.totalCount
    ),
    errorMessage: 'Something went wrong while fetching dataset runs',
  },
  {
    name: 'fetchInitialDatasetVersionsSaga',
    saga: fetchInitialDatasetVersionsSaga,
    actionType: actionTypes.FETCH_INITIAL_DATASET_VERSIONS,
    actionPayload: initialDatasetVersionsPayload,
    callArgs: [
      getDatasetVersions,
      initialDatasetVersionsPayload.namespace,
      initialDatasetVersionsPayload.name,
      1,
      0,
    ],
    response: datasetVersionsResponse,
    successAction: fetchInitialDatasetVersionsSuccess(
      datasetVersionsResponse.versions,
      datasetVersionsResponse.totalCount
    ),
    errorMessage: 'Something went wrong while fetching dataset versions',
  },
  {
    name: 'fetchJobFacetsSaga',
    saga: fetchJobFacetsSaga,
    actionType: actionTypes.FETCH_JOB_FACETS,
    actionPayload: jobFacetsPayload,
    callArgs: [getJobFacets, jobFacetsPayload.runId],
    response: facetsResponse,
    successAction: fetchFacetsSuccess(facetsResponse),
    errorMessage: 'Something went wrong while fetching job facets',
  },
  {
    name: 'fetchRunFacetsSaga',
    saga: fetchRunFacetsSaga,
    actionType: actionTypes.FETCH_RUN_FACETS,
    actionPayload: runFacetsPayload,
    callArgs: [getRunFacets, runFacetsPayload.runId],
    response: facetsResponse,
    successAction: fetchFacetsSuccess(facetsResponse),
    errorMessage: 'Something went wrong while fetching run facets',
  },
  {
    name: 'fetchOpenSearchJobsSaga',
    saga: fetchOpenSearchJobsSaga,
    actionType: actionTypes.FETCH_OPEN_SEARCH_JOBS,
    actionPayload: openSearchJobsPayload,
    callArgs: [getOpenSearchJobs, openSearchJobsPayload.q],
    response: openSearchJobsResponse,
    successAction: fetchOpenSearchJobsSuccess(openSearchJobsResponse),
    errorMessage: 'Something went wrong while searching',
  },
  {
    name: 'fetchOpenSearchDatasetsSaga',
    saga: fetchOpenSearchDatasetsSaga,
    actionType: actionTypes.FETCH_OPEN_SEARCH_DATASETS,
    actionPayload: openSearchDatasetsPayload,
    callArgs: [getOpenSearchDatasets, openSearchDatasetsPayload.q],
    response: openSearchDatasetsResponse,
    successAction: fetchOpenSearchDatasetsSuccess(openSearchDatasetsResponse),
    errorMessage: 'Something went wrong while searching',
  },
  {
    name: 'fetchLineageMetricsSaga',
    saga: fetchLineageMetricsSaga,
    actionType: actionTypes.FETCH_LINEAGE_METRICS,
    actionPayload: lineageMetricsPayload,
    callArgs: [getLineageMetrics, lineageMetricsPayload],
    response: lineageMetrics,
    successAction: fetchLineageMetricsSuccess(lineageMetrics),
    errorMessage: 'Something went wrong while getting lineage metrics',
  },
  {
    name: 'fetchJobMetricsSaga',
    saga: fetchJobMetricsSaga,
    actionType: actionTypes.FETCH_JOB_METRICS,
    actionPayload: jobMetricsPayload,
    callArgs: [
      getIntervalMetrics,
      { unit: jobMetricsPayload.unit, asset: 'jobs' as const },
    ],
    response: intervalMetrics,
    successAction: fetchJobMetricsSuccess(intervalMetrics),
    errorMessage: 'Something went wrong while getting job metrics',
  },
  {
    name: 'fetchDatasetMetricsSaga',
    saga: fetchDatasetMetricsSaga,
    actionType: actionTypes.FETCH_DATASET_METRICS,
    actionPayload: datasetMetricsPayload,
    callArgs: [
      getIntervalMetrics,
      { unit: datasetMetricsPayload.unit, asset: 'datasets' as const },
    ],
    response: intervalMetrics,
    successAction: fetchDatasetMetricsSuccess(intervalMetrics),
    errorMessage: 'Something went wrong while getting dataset metrics',
  },
  {
    name: 'fetchSourceMetricsSaga',
    saga: fetchSourceMetricsSaga,
    actionType: actionTypes.FETCH_SOURCE_METRICS,
    actionPayload: sourceMetricsPayload,
    callArgs: [
      getIntervalMetrics,
      { unit: sourceMetricsPayload.unit, asset: 'sources' as const },
    ],
    response: intervalMetrics,
    successAction: fetchSourceMetricsSuccess(intervalMetrics),
    errorMessage: 'Something went wrong while getting source metrics',
  },
  {
    name: 'fetchJobsByStateWatcher',
    saga: fetchJobsByStateWatcher,
    actionType: actionTypes.FETCH_JOBS_BY_STATE,
    actionPayload: jobsByStatePayload,
    callArgs: [
      getJobsByState,
      jobsByStatePayload.runState,
      jobsByStatePayload.limit,
      jobsByStatePayload.offset,
    ],
    response: jobsResponse,
    successAction: fetchJobsSuccess(jobsResponse.jobs, jobsResponse.totalCount),
    errorMessage: 'Something went wrong while getting jobs by state',
  },
]

describe('store/sagas/fetchTags', () => {
  it('handles success', () => {
    testSaga(fetchTagsSaga)
      .next()
      .call(getTags)
      .next(tagsResponse)
      .put(fetchTagsSuccess(tagsResponse.tags))
      .next()
      .isDone()
  })

  it('handles failure', () => {
    testSaga(fetchTagsSaga)
      .next()
      .call(getTags)
      .throw(error)
      .put(applicationError('Something went wrong while fetching initial data.'))
      .next()
      .isDone()
  })
})

describe('store/sagas/fetchNamespaces', () => {
  it('handles success', () => {
    testSaga(fetchNamespacesSaga)
      .next()
      .call(getNamespaces)
      .next(namespacesResponse)
      .put(fetchNamespacesSuccess(namespacesResponse.namespaces))
      .next()
      .isDone()
  })

  it('handles failure', () => {
    testSaga(fetchNamespacesSaga)
      .next()
      .call(getNamespaces)
      .throw(error)
      .put(applicationError('Something went wrong while fetching initial data.'))
      .next()
      .isDone()
  })
})

describe('store/sagas loop watchers', () => {
  loopSagaCases.forEach((testCase) => {
    it(`${testCase.name} handles success`, () => {
      let chain: any = testSaga(testCase.saga)
        .next()
        .take(testCase.actionType)
        .next({ payload: testCase.actionPayload })
        .call(testCase.callArgs[0], ...testCase.callArgs.slice(1))

      if (testCase.response !== undefined) {
        chain = chain.next(testCase.response)
      } else {
        chain = chain.next()
      }

      chain = chain.put(testCase.successAction).next()

      if (testCase.afterSuccess) {
        chain = testCase.afterSuccess(chain)
      } else {
        chain = chain.take(testCase.actionType)
      }
    })

    it(`${testCase.name} handles errors`, () => {
      let chain: any = testSaga(testCase.saga)
        .next()
        .take(testCase.actionType)
        .next({ payload: testCase.actionPayload })
        .call(testCase.callArgs[0], ...testCase.callArgs.slice(1))
        .throw(error)
        .put(applicationError(testCase.errorMessage))
        .next()

      if (testCase.afterError) {
        chain = testCase.afterError(chain)
      } else {
        chain = chain.take(testCase.actionType)
      }
    })
  })
})

describe('store/sagas/rootSaga', () => {
  it('combines all sagas', () => {
    const iterator = rootSaga()
    const effect = iterator.next().value as AllEffect<Generator>

    expect(effect.type).toBe('ALL')
    expect(Array.isArray(effect.payload)).toBe(true)
    expect(effect.payload).toHaveLength(32)

    const [namespacesTask, tagsTask, ...watchers] = effect.payload as Generator[]

    expect(namespacesTask.next().value).toEqual(callEffect(getNamespaces))
    expect(tagsTask.next().value).toEqual(callEffect(getTags))

    const watcherFirstEffects = watchers.map((gen) => gen.next().value)
    const watcherTakePatterns = watcherFirstEffects.map((firstEffect) => {
      if (!firstEffect) {
        return undefined
      }
      if (firstEffect.type === 'TAKE') {
        return firstEffect.payload?.pattern
      }
      return firstEffect.type
    })

    const expectedActionTypes = [
      actionTypes.FETCH_JOBS,
      actionTypes.FETCH_RUNS,
      actionTypes.FETCH_LATEST_RUNS,
      actionTypes.FETCH_DATASETS,
      actionTypes.FETCH_DATASET,
      actionTypes.FETCH_DATASET_VERSIONS,
      actionTypes.FETCH_INITIAL_DATASET_VERSIONS,
      actionTypes.FETCH_EVENTS,
      actionTypes.FETCH_JOB_FACETS,
      actionTypes.FETCH_RUN_FACETS,
      actionTypes.FETCH_LINEAGE,
      actionTypes.FETCH_COLUMN_LINEAGE,
      actionTypes.FETCH_SEARCH,
      actionTypes.DELETE_JOB,
      actionTypes.FETCH_OPEN_SEARCH_JOBS,
      actionTypes.FETCH_OPEN_SEARCH_DATASETS,
      actionTypes.DELETE_DATASET,
      actionTypes.DELETE_DATASET_TAG,
      actionTypes.DELETE_JOB_TAG,
      actionTypes.ADD_DATASET_TAG,
      actionTypes.ADD_JOB_TAG,
      actionTypes.DELETE_DATASET_FIELD_TAG,
      actionTypes.ADD_DATASET_FIELD_TAG,
      actionTypes.ADD_TAGS,
      actionTypes.FETCH_JOB,
      actionTypes.FETCH_LINEAGE_METRICS,
      actionTypes.FETCH_JOBS_BY_STATE,
      actionTypes.FETCH_JOB_METRICS,
      actionTypes.FETCH_DATASET_METRICS,
      actionTypes.FETCH_SOURCE_METRICS,
    ]

    expectedActionTypes.forEach((expectedType) => {
      expect(watcherTakePatterns).toContain(expectedType)
    })
  })
})
