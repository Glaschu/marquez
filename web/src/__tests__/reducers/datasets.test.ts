// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import * as actionTypes from '../../store/actionCreators/actionTypes'
import datasetsReducer, { IDatasetsAction, initialState } from '../../store/reducers/datasets'
import { Dataset } from '../../types/api'

const datasets = [{ name: 'd1' }, { name: 'd2' }] as Dataset[]

describe('datasets reducer', () => {
  it('should return the initial state for unknown actions', () => {
    expect(datasetsReducer(undefined, { type: 'UNKNOWN_ACTION' } as any)).toEqual(initialState)
  })

  it('should handle FETCH_DATASETS', () => {
    const action = {
      type: actionTypes.FETCH_DATASETS,
      payload: {
        namespace: 'test',
        limit: 20,
        offset: 0,
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual({
      ...initialState,
      isLoading: true,
    })
  })

  it('should handle FETCH_DATASETS_SUCCESS', () => {
    const action = {
      type: actionTypes.FETCH_DATASETS_SUCCESS,
      payload: {
        datasets: datasets,
        totalCount: 16,
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual({
      init: true,
      isLoading: false,
      result: datasets,
      totalCount: 16,
      deletedDatasetName: '',
      refreshTags: false,
    })
  })

  it('should handle DELETE_DATASET', () => {
    const currentState = { ...initialState, result: datasets }
    const action = {
      type: actionTypes.DELETE_DATASET,
      payload: {
        datasetName: 'd1',
        namespace: 'test',
      },
    } as IDatasetsAction
    expect(datasetsReducer(currentState, action).result.length).toBe(1)
  })

  it('should handle DELETE_DATASET_SUCCESS', () => {
    const action = {
      type: actionTypes.DELETE_DATASET_SUCCESS,
      payload: {
        datasetName: 'd1',
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action).deletedDatasetName).toBe('d1')
  })

  it('should handle RESET_DATASETS', () => {
    const action = {
      type: actionTypes.RESET_DATASETS,
    } as IDatasetsAction
    const currentState = {
      ...initialState,
      result: datasets,
      totalCount: 2,
      isLoading: true,
      init: true,
    }
    expect(datasetsReducer(currentState, action)).toStrictEqual(initialState)
  })

  it('should handle DELETE_DATASET_TAG (no-op)', () => {
    const action = {
      type: actionTypes.DELETE_DATASET_TAG,
      payload: {
        namespace: 'test',
        datasetName: 'd1',
        tag: 'PII',
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual(initialState)
  })

  it('should handle DELETE_DATASET_TAG_SUCCESS (no-op)', () => {
    const action = {
      type: actionTypes.DELETE_DATASET_TAG_SUCCESS,
      payload: {
        namespace: 'test',
        datasetName: 'd1',
        tag: 'PII',
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual(initialState)
  })

  it('should handle DELETE_DATASET_FIELD_TAG (no-op)', () => {
    const action = {
      type: actionTypes.DELETE_DATASET_FIELD_TAG,
      payload: {
        namespace: 'test',
        datasetName: 'd1',
        tag: 'PII',
        field: 'email',
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual(initialState)
  })

  it('should handle DELETE_DATASET_FIELD_TAG_SUCCESS (no-op)', () => {
    const action = {
      type: actionTypes.DELETE_DATASET_FIELD_TAG_SUCCESS,
      payload: {
        namespace: 'test',
        datasetName: 'd1',
        tag: 'PII',
        field: 'email',
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual(initialState)
  })

  it('should handle ADD_DATASET_TAG (no-op)', () => {
    const action = {
      type: actionTypes.ADD_DATASET_TAG,
      payload: {
        namespace: 'test',
        datasetName: 'd1',
        tag: 'PII',
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual(initialState)
  })

  it('should handle ADD_DATASET_TAG_SUCCESS (set refreshTags)', () => {
    const action = {
      type: actionTypes.ADD_DATASET_TAG_SUCCESS,
      payload: {
        namespace: 'test',
        datasetName: 'd1',
        tag: 'PII',
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual({
      ...initialState,
      refreshTags: true,
    })
  })

  it('should handle ADD_DATASET_FIELD_TAG (no-op)', () => {
    const action = {
      type: actionTypes.ADD_DATASET_FIELD_TAG,
      payload: {
        namespace: 'test',
        datasetName: 'd1',
        tag: 'PII',
        field: 'email',
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual(initialState)
  })

  it('should handle ADD_DATASET_FIELD_TAG_SUCCESS (set refreshTags)', () => {
    const action = {
      type: actionTypes.ADD_DATASET_FIELD_TAG_SUCCESS,
      payload: {
        namespace: 'test',
        datasetName: 'd1',
        tag: 'PII',
        field: 'email',
      },
    } as IDatasetsAction
    expect(datasetsReducer(initialState, action)).toStrictEqual({
      ...initialState,
      refreshTags: true,
    })
  })
})
