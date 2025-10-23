// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/runs'
import {
  FETCH_RUNS,
  FETCH_RUNS_SUCCESS,
  FETCH_LATEST_RUNS,
  FETCH_LATEST_RUNS_SUCCESS,
  RESET_RUNS,
} from '../../store/actionCreators/actionTypes'

const sampleRun = { id: 'run-1', facets: {} } as any

describe('runs reducer', () => {
  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading on FETCH_RUNS', () => {
    const state = reducer(initialState, { type: FETCH_RUNS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should handle FETCH_RUNS_SUCCESS', () => {
    const action = {
      type: FETCH_RUNS_SUCCESS,
      payload: { runs: [sampleRun], totalCount: 1 },
    }
    const state = reducer({ ...initialState, isLoading: true }, action as any)
    expect(state).toEqual({
      ...initialState,
      isLoading: false,
      init: true,
      result: [sampleRun],
      totalCount: 1,
    })
  })

  it('should set latest runs loading flag', () => {
    const state = reducer(initialState, { type: FETCH_LATEST_RUNS } as any)
    expect(state.isLatestRunsLoading).toBe(true)
  })

  it('should handle FETCH_LATEST_RUNS_SUCCESS', () => {
    const state = reducer({ ...initialState, isLatestRunsLoading: true }, {
      type: FETCH_LATEST_RUNS_SUCCESS,
      payload: { runs: [sampleRun] },
    } as any)
    expect(state).toEqual({
      ...initialState,
      latestRuns: [sampleRun],
      isLatestRunsLoading: false,
    })
  })

  it('should reset to initial state', () => {
    const populated = {
      ...initialState,
      init: true,
      result: [sampleRun],
      totalCount: 1,
      latestRuns: [sampleRun],
    }
    expect(reducer(populated as any, { type: RESET_RUNS } as any)).toEqual(initialState)
  })
})
