// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer from '../../store/reducers/jobsByState'
import {
  FETCH_JOBS_BY_STATE,
  FETCH_JOBS_BY_STATE_SUCCESS,
} from '../../store/actionCreators/actionTypes'

const baseState = {
  jobs: [],
  totalCount: 0,
  loading: false,
  error: null,
}

describe('jobsByState reducer', () => {
  it('should return initial state when action is unknown', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(baseState)
  })

  it('should set loading true on FETCH_JOBS_BY_STATE', () => {
    const state = reducer(baseState as any, { type: FETCH_JOBS_BY_STATE } as any)
    expect(state).toEqual({ ...baseState, loading: true })
  })

  it('should store jobs on FETCH_JOBS_BY_STATE_SUCCESS', () => {
    const payload = {
      jobs: [{ id: 'job-1' }],
      totalCount: 1,
    }
    const action = { type: FETCH_JOBS_BY_STATE_SUCCESS, payload }
    const state = reducer({ ...baseState, loading: true } as any, action as any)
    expect(state).toEqual({ jobs: payload.jobs, totalCount: 1, loading: false, error: null })
  })
})
