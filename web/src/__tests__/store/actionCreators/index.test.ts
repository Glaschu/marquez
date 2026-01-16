// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as actionCreators from '../../../store/actionCreators'
import * as actionTypes from '../../../store/actionCreators/actionTypes'

import { Namespace, Tag } from '../../../types/api'

type Case = {
  name: keyof typeof actionCreators
  args: unknown[]
  expected: unknown
}

describe('store/actionCreators', () => {
  const namespaceObj: Namespace = {
    name: 'analytics',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    ownerName: 'data-eng',
    description: 'Analytics namespace',
    isHidden: false,
  }
  const tagObj: Tag = { name: 'priority', description: 'High priority data' }

  const cases: Case[] = [
    {
      name: 'resetEvents',
      args: [],
      expected: {
        type: actionTypes.RESET_EVENTS,
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
      name: 'resetDatasets',
      args: [],
      expected: {
        type: actionTypes.RESET_DATASETS,
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
      name: 'setColumnLineageGraphDepth',
      args: [5],
      expected: {
        type: actionTypes.SET_COLUMN_LINEAGE_GRAPH_DEPTH,
        payload: 5,
      },
    },
  ]

  it.each(cases)('%s returns expected action shape', ({ name, args, expected }) => {
    const creator = actionCreators[name]
    expect(typeof creator).toBe('function')
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const result = (creator as (...args: unknown[]) => unknown)(...args)
    expect(result).toEqual(expected)
  })
})
