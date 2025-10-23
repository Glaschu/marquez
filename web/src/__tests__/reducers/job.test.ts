// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/job'
import { FETCH_JOB, FETCH_JOB_SUCCESS } from '../../store/actionCreators/actionTypes'

const job = {
  name: 'transform_orders',
  namespace: 'analytics',
} as any

describe('job reducer', () => {
  it('should return initial state for unknown action', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading true on FETCH_JOB', () => {
    const state = reducer(initialState, { type: FETCH_JOB } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should store job on FETCH_JOB_SUCCESS', () => {
    const action = { type: FETCH_JOB_SUCCESS, payload: { job } }
    const state = reducer({ ...initialState, isLoading: true }, action as any)
    expect(state).toEqual({ ...initialState, isLoading: false, result: job })
  })
})
