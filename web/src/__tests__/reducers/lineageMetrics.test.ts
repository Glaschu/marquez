// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/lineageMetrics'
import { FETCH_LINEAGE_METRICS, FETCH_LINEAGE_METRICS_SUCCESS } from '../../store/actionCreators/actionTypes'

const metrics = [
  { nodeId: 'node-1', inputs: 5, outputs: 2 },
] as any

describe('lineageMetrics reducer', () => {
  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading on FETCH_LINEAGE_METRICS', () => {
    const state = reducer(initialState, { type: FETCH_LINEAGE_METRICS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should store metrics on FETCH_LINEAGE_METRICS_SUCCESS', () => {
    const state = reducer({ ...initialState, isLoading: true }, {
      type: FETCH_LINEAGE_METRICS_SUCCESS,
      payload: metrics,
    } as any)
    expect(state).toEqual({ ...initialState, isLoading: false, init: true, data: metrics })
  })
})
