// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/dataset'
import { FETCH_DATASET, FETCH_DATASET_SUCCESS, RESET_DATASET } from '../../store/actionCreators/actionTypes'

const dataset = {
  name: 'orders',
  namespace: 'analytics',
} as any

describe('dataset reducer', () => {
  it('should return the initial state for unknown actions', () => {
    expect(reducer(undefined, { type: 'UNKNOWN_ACTION' } as any)).toEqual(initialState)
  })

  it('should handle FETCH_DATASET by setting loading state', () => {
    const state = reducer(initialState, { type: FETCH_DATASET } as any)
    expect(state).toEqual({ ...initialState, isLoading: true })
  })

  it('should handle FETCH_DATASET_SUCCESS by storing the dataset', () => {
    const action = { type: FETCH_DATASET_SUCCESS, payload: { dataset } }
    const state = reducer({ ...initialState, isLoading: true }, action as any)
    expect(state).toEqual({ ...initialState, isLoading: false, init: true, result: dataset })
  })

  it('should reset to initial state on RESET_DATASET', () => {
    const action = { type: RESET_DATASET }
    const modifiedState = { ...initialState, isLoading: true, result: dataset, init: true }
    expect(reducer(modifiedState, action as any)).toEqual(initialState)
  })
})
