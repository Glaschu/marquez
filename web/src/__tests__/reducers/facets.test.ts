// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/facets'
import {
  FETCH_FACETS_SUCCESS,
  FETCH_JOB_FACETS,
  FETCH_RUN_FACETS,
  RESET_FACETS,
} from '../../store/actionCreators/actionTypes'

const sampleFacets = { inputs: ['a'], outputs: ['b'] } as any

describe('facets reducer', () => {
  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading when FETCH_JOB_FACETS dispatched', () => {
    const state = reducer(initialState, { type: FETCH_JOB_FACETS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should set loading when FETCH_RUN_FACETS dispatched', () => {
    const state = reducer(initialState, { type: FETCH_RUN_FACETS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should handle FETCH_FACETS_SUCCESS', () => {
    const state = reducer({ ...initialState, isLoading: true }, {
      type: FETCH_FACETS_SUCCESS,
      payload: { facets: sampleFacets },
    } as any)
    expect(state).toEqual({ ...initialState, isLoading: false, init: true, result: sampleFacets })
  })

  it('should reset on RESET_FACETS', () => {
    const populated = { ...initialState, init: true, result: sampleFacets }
    expect(reducer(populated as any, { type: RESET_FACETS } as any)).toEqual(initialState)
  })
})
