// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/sourceMetrics'
import { FETCH_SOURCE_METRICS, FETCH_SOURCE_METRICS_SUCCESS } from '../../store/actionCreators/actionTypes'

const metrics = [
  { timestamp: '2024-01-01T00:00:00Z', value: 12 },
] as any

describe('sourceMetrics reducer', () => {
  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading on FETCH_SOURCE_METRICS', () => {
    const state = reducer(initialState, { type: FETCH_SOURCE_METRICS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should populate data on FETCH_SOURCE_METRICS_SUCCESS', () => {
    const state = reducer({ ...initialState, isLoading: true }, {
      type: FETCH_SOURCE_METRICS_SUCCESS,
      payload: metrics,
    } as any)
    expect(state).toEqual({ ...initialState, isLoading: false, init: true, data: metrics })
  })
})
