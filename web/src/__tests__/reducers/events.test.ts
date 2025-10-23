// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer, { initialState } from '../../store/reducers/events'
import { FETCH_EVENTS, FETCH_EVENTS_SUCCESS, RESET_EVENTS } from '../../store/actionCreators/actionTypes'

const sampleEvent = {
  id: 'event-1',
  run: { id: 'run-1' },
} as any

const successPayload = {
  events: {
    events: [sampleEvent],
    totalCount: 1,
  },
}

describe('events reducer', () => {
  it('should return the initial state by default', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(initialState)
  })

  it('should set loading when FETCH_EVENTS dispatched', () => {
    const state = reducer(initialState, { type: FETCH_EVENTS } as any)
    expect(state.isLoading).toBe(true)
  })

  it('should store events on FETCH_EVENTS_SUCCESS', () => {
    const action = { type: FETCH_EVENTS_SUCCESS, payload: successPayload }
    const state = reducer({ ...initialState, isLoading: true }, action as any)
    expect(state).toEqual({
      ...initialState,
      isLoading: false,
      init: true,
      result: successPayload.events.events,
      totalCount: 1,
    })
  })

  it('should reset to initial state on RESET_EVENTS', () => {
    const populated = {
      ...initialState,
      init: true,
      totalCount: 3,
      result: [sampleEvent],
    }
    expect(reducer(populated as any, { type: RESET_EVENTS } as any)).toEqual(initialState)
  })
})
