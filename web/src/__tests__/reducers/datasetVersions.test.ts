// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/datasetVersions'
import {
  FETCH_DATASET_VERSIONS,
  FETCH_DATASET_VERSIONS_SUCCESS,
  FETCH_INITIAL_DATASET_VERSIONS,
  FETCH_INITIAL_DATASET_VERSIONS_SUCCESS,
  RESET_DATASET_VERSIONS,
} from '../../store/actionCreators/actionTypes'

const versionsPayload = { totalCount: 2, versions: [{ version: 'v1' }, { version: 'v2' }] } as any

const initialVersionsPayload = { totalCount: 1, versions: [{ version: 'initial' }] } as any

describe('datasetVersions reducer', () => {
  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading true on FETCH_DATASET_VERSIONS', () => {
    const state = reducer(initialState, { type: FETCH_DATASET_VERSIONS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should handle FETCH_DATASET_VERSIONS_SUCCESS', () => {
    const action = { type: FETCH_DATASET_VERSIONS_SUCCESS, payload: versionsPayload }
    const state = reducer({ ...initialState, isLoading: true }, action as any)
    expect(state).toEqual({
      ...initialState,
      isLoading: false,
      init: true,
      result: versionsPayload,
    })
  })

  it('should set init versions loading on FETCH_INITIAL_DATASET_VERSIONS', () => {
    const state = reducer(initialState, { type: FETCH_INITIAL_DATASET_VERSIONS } as any)
    expect(state.isInitDsVerLoading).toBe(true)
  })

  it('should handle FETCH_INITIAL_DATASET_VERSIONS_SUCCESS', () => {
    const action = {
      type: FETCH_INITIAL_DATASET_VERSIONS_SUCCESS,
      payload: initialVersionsPayload,
    }
    const state = reducer(
      { ...initialState, isInitDsVerLoading: true },
      action as any
    )
    expect(state).toEqual({
      ...initialState,
      initDsVersion: initialVersionsPayload,
      isInitDsVerLoading: false,
    })
  })

  it('should reset state on RESET_DATASET_VERSIONS', () => {
    const modifiedState = {
      ...initialState,
      init: true,
      result: versionsPayload,
      initDsVersion: initialVersionsPayload,
    }
    expect(reducer(modifiedState as any, { type: RESET_DATASET_VERSIONS } as any)).toEqual(initialState)
  })
})
