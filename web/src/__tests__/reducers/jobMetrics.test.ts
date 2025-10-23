// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/jobMetrics'
import { FETCH_JOB_METRICS, FETCH_JOB_METRICS_SUCCESS } from '../../store/actionCreators/actionTypes'

const metrics = [
  { timestamp: '2024-01-01T00:00:00Z', value: 42 },
] as any

describe('jobMetrics reducer', () => {
  it('should return initial state for unknown actions', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading on FETCH_JOB_METRICS', () => {
    const state = reducer(initialState, { type: FETCH_JOB_METRICS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should store metrics on FETCH_JOB_METRICS_SUCCESS', () => {
    const action = { type: FETCH_JOB_METRICS_SUCCESS, payload: metrics }
    const state = reducer({ ...initialState, isLoading: true }, action as any)
    expect(state).toEqual({ ...initialState, isLoading: false, init: true, data: metrics })
  })
})
