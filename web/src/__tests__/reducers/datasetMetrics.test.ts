// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/datasetMetrics'
import {
  FETCH_DATASET_METRICS,
  FETCH_DATASET_METRICS_SUCCESS,
} from '../../store/actionCreators/actionTypes'

const sampleMetrics = [
  { timestamp: '2024-01-01T00:00:00Z', value: 5 },
  { timestamp: '2024-01-02T00:00:00Z', value: 10 },
] as any

describe('datasetMetrics reducer', () => {
  it('should return initial state for unknown action', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading true on FETCH_DATASET_METRICS', () => {
    const state = reducer(initialState, { type: FETCH_DATASET_METRICS } as any)
    expect(state).toEqual({ ...initialState, isLoading: true })
  })

  it('should store metrics on FETCH_DATASET_METRICS_SUCCESS', () => {
    const action = { type: FETCH_DATASET_METRICS_SUCCESS, payload: sampleMetrics }
    const state = reducer({ ...initialState, isLoading: true }, action as any)
    expect(state).toEqual({ ...initialState, isLoading: false, init: true, data: sampleMetrics })
  })
})
