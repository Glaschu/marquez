// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/tags'
import { ADD_TAGS, ADD_TAGS_SUCCESS, FETCH_TAGS, FETCH_TAGS_SUCCESS } from '../../store/actionCreators/actionTypes'

const tags = [{ name: 'pii' }] as any

describe('tags reducer', () => {
  it('should return initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading on FETCH_TAGS', () => {
    const state = reducer(initialState, { type: FETCH_TAGS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should store tags on FETCH_TAGS_SUCCESS', () => {
    const state = reducer({ ...initialState, isLoading: true }, {
      type: FETCH_TAGS_SUCCESS,
      payload: { tags },
    } as any)
    expect(state).toEqual({ ...initialState, isLoading: false, init: true, tags })
  })

  it('should leave state unchanged on ADD_TAGS and ADD_TAGS_SUCCESS', () => {
    const intermediate = reducer({ ...initialState, init: true }, { type: ADD_TAGS } as any)
    expect(intermediate).toEqual({ ...initialState, init: true })

    const finalState = reducer(intermediate, { type: ADD_TAGS_SUCCESS, payload: { tags } } as any)
    expect(finalState).toEqual(intermediate)
  })
})
