// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/openSearch'
import {
  FETCH_OPEN_SEARCH_JOBS,
  FETCH_OPEN_SEARCH_JOBS_SUCCESS,
} from '../../store/actionCreators/actionTypes'

const payload = {
  hits: [{ id: 'job-1' }],
  highlights: [{ id: 'job-1', matches: ['job'] }],
} as any

describe('openSearch jobs reducer', () => {
  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading on FETCH_OPEN_SEARCH_JOBS', () => {
    const state = reducer(initialState, { type: FETCH_OPEN_SEARCH_JOBS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should store data on FETCH_OPEN_SEARCH_JOBS_SUCCESS', () => {
    const state = reducer({ ...initialState, isLoading: true }, {
      type: FETCH_OPEN_SEARCH_JOBS_SUCCESS,
      payload,
    } as any)
    expect(state).toEqual({ ...initialState, isLoading: false, init: true, data: payload })
  })
})
