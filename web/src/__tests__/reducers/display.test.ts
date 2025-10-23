// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer from '../../store/reducers/display'
import { APPLICATION_ERROR, DIALOG_TOGGLE } from '../../store/actionCreators/actionTypes'

const baseState = {
  error: '',
  success: '',
  dialogIsOpen: false,
  editWarningField: '',
  isLoading: true,
}

describe('display reducer', () => {
  it('should return initial state for unknown actions', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(baseState)
  })

  it('should set isLoading to false when handling success-like actions', () => {
    const state = reducer(undefined, { type: 'FETCH_DATA_SUCCESS', payload: {} } as any)
    expect(state.isLoading).toBe(false)
  })

  it('should set isLoading to true when handling fetch-like actions', () => {
    const preloaded = { ...baseState, isLoading: false }
    const state = reducer(preloaded as any, { type: 'FETCH_DATA', payload: {} } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should handle APPLICATION_ERROR', () => {
    const action = { type: APPLICATION_ERROR, payload: { message: 'boom' } }
    const state = reducer(baseState as any, action as any)
    expect(state).toEqual({
      ...baseState,
      error: 'boom',
      dialogIsOpen: true,
    })
  })

  it('should handle DIALOG_TOGGLE', () => {
    const action = { type: DIALOG_TOGGLE, payload: { field: 'name' } }
    const state = reducer(baseState as any, action as any)
    expect(state.dialogIsOpen).toBe(true)
    expect(state.editWarningField).toBe('name')

    const secondState = reducer(state as any, action as any)
    expect(secondState.dialogIsOpen).toBe(false)
  })
})
