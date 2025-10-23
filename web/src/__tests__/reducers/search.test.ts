// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/search'
import { FETCH_SEARCH, FETCH_SEARCH_SUCCESS } from '../../store/actionCreators/actionTypes'

const baseResult = {
  namespace: 'analytics',
  name: 'sales.daily',
  type: 'DATASET',
} as any

const secondResult = {
  namespace: 'analytics',
  name: 'sales.monthly',
  type: 'DATASET',
} as any

const payload = { results: [baseResult, secondResult] }

const expectedGroup = `${encodeURIComponent(baseResult.namespace)}:${encodeURIComponent(
  baseResult.name.substring(0, baseResult.name.lastIndexOf('.'))
)}`

describe('search reducer', () => {
  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading true on FETCH_SEARCH', () => {
    const state = reducer(initialState, { type: FETCH_SEARCH } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should group results on FETCH_SEARCH_SUCCESS', () => {
    const action = { type: FETCH_SEARCH_SUCCESS, payload }
    const state = reducer({ ...initialState, isLoading: true }, action as any)

    expect(state.isLoading).toBe(false)
    expect(state.init).toBe(true)
    expect(state.data.rawResults).toHaveLength(2)
    expect(state.data.results.get(expectedGroup)?.length).toBe(2)
    state.data.rawResults.forEach((result) => {
      expect(result.group).toBe(expectedGroup)
    })
  })
})
