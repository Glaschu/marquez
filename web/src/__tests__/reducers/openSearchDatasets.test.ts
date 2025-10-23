// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/openSearchDatasets'
import {
  FETCH_OPEN_SEARCH_DATASETS,
  FETCH_OPEN_SEARCH_DATASETS_SUCCESS,
} from '../../store/actionCreators/actionTypes'

const payload = {
  hits: [{ id: 'dataset-1' }],
  highlights: [{ id: 'dataset-1', matches: ['dataset'] }],
} as any

describe('openSearch datasets reducer', () => {
  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading on FETCH_OPEN_SEARCH_DATASETS', () => {
    const state = reducer(initialState, { type: FETCH_OPEN_SEARCH_DATASETS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should store data on FETCH_OPEN_SEARCH_DATASETS_SUCCESS', () => {
    const state = reducer({ ...initialState, isLoading: true }, {
      type: FETCH_OPEN_SEARCH_DATASETS_SUCCESS,
      payload,
    } as any)
    expect(state).toEqual({ ...initialState, isLoading: false, init: true, data: payload })
  })
})
