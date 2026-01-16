// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as actionTypes from './actionTypes'

export const resetEvents = () => ({
  type: actionTypes.RESET_EVENTS,
})

export const resetDatasetVersions = () => ({
  type: actionTypes.RESET_DATASET_VERSIONS,
})

export const resetDataset = () => ({
  type: actionTypes.RESET_DATASET,
})

export const resetDatasets = () => ({
  type: actionTypes.RESET_DATASETS,
})

export const resetJobs = () => ({
  type: actionTypes.RESET_JOBS,
})

export const fetchRunFacets = (runId: string) => ({
  type: actionTypes.FETCH_RUN_FACETS,
  payload: {
    runId,
  },
})

export const fetchJobFacets = (runId: string) => ({
  type: actionTypes.FETCH_JOB_FACETS,
  payload: {
    runId,
  },
})

export const resetFacets = () => ({
  type: actionTypes.RESET_FACETS,
})

export const resetRuns = () => ({
  type: actionTypes.RESET_RUNS,
})

export const applicationError = (message: string) => ({
  type: actionTypes.APPLICATION_ERROR,
  payload: {
    message,
  },
})

export const dialogToggle = (field: string) => ({
  type: actionTypes.DIALOG_TOGGLE,
  payload: {
    field,
  },
})

export const setSelectedNode = (node: string) => ({
  type: actionTypes.SET_SELECTED_NODE,
  payload: node,
})

export const setBottomBarHeight = (height: number) => ({
  type: actionTypes.SET_BOTTOM_BAR_HEIGHT,
  payload: height,
})

export const setTabIndex = (index: number) => ({
  type: actionTypes.SET_TAB_INDEX,
  payload: index,
})

export const resetLineage = () => ({
  type: actionTypes.RESET_LINEAGE,
})

export const setLineageGraphDepth = (depth: number) => ({
  type: actionTypes.SET_LINEAGE_GRAPH_DEPTH,
  payload: depth,
})

export const setShowFullGraph = (showFullGraph: boolean) => ({
  type: actionTypes.SET_SHOW_FULL_GRAPH,
  payload: showFullGraph,
})

export const selectNamespace = (namespace: string) => ({
  type: actionTypes.SELECT_NAMESPACE,
  payload: namespace,
})

export const setColumnLineageGraphDepth = (depth: number) => ({
  type: actionTypes.SET_COLUMN_LINEAGE_GRAPH_DEPTH,
  payload: depth,
})
