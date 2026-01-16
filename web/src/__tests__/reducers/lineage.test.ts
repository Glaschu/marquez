// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import reducer from '../../store/reducers/lineage'
import {
  SET_SELECTED_NODE,
  SET_BOTTOM_BAR_HEIGHT,
  SET_TAB_INDEX,
  SET_LINEAGE_GRAPH_DEPTH,
  SET_SHOW_FULL_GRAPH,
  RESET_LINEAGE,
} from '../../store/actionCreators/actionTypes'
import { HEADER_HEIGHT } from '../../helpers/theme'

const unknown = { type: 'UNKNOWN' } as any

describe('lineage reducer', () => {
  let originalInnerHeight: number

  beforeEach(() => {
    originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerHeight', { value: 900, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true })
  })

  it('should return the initial state for unknown actions', () => {
    const initialState = reducer(undefined, unknown)
    expect(initialState).toMatchObject({
      selectedNode: null,
      tabIndex: 0,
      showFullGraph: true,
    })
  })

  it('should handle SET_SELECTED_NODE and reset tab index when needed', () => {
    const baseState = reducer(undefined, unknown)
    const state = reducer(baseState, { type: SET_SELECTED_NODE, payload: 'node-1' } as any)
    expect(state.selectedNode).toBe('node-1')
    expect(state.tabIndex).toBe(0)

    const tabState = reducer(
      { ...state, tabIndex: 1 } as any,
      { type: SET_SELECTED_NODE, payload: 'node-2' } as any
    )
    expect(tabState.selectedNode).toBe('node-2')
    expect(tabState.tabIndex).toBe(1)
  })

  it('should clamp bottom bar height', () => {
    const baseState = reducer(undefined, unknown)
    const maxHeight = window.innerHeight - HEADER_HEIGHT - 8
    const state = reducer(baseState, { type: SET_BOTTOM_BAR_HEIGHT, payload: maxHeight + 100 } as any)
    expect(state.bottomBarHeight).toBe(maxHeight)

    const minState = reducer(baseState, { type: SET_BOTTOM_BAR_HEIGHT, payload: 0 } as any)
    expect(minState.bottomBarHeight).toBeGreaterThanOrEqual(2)
  })

  it('should update tab index', () => {
    const baseState = reducer(undefined, unknown)
    const state = reducer(baseState, { type: SET_TAB_INDEX, payload: 2 } as any)
    expect(state.tabIndex).toBe(2)
  })

  it('should update lineage graph depth', () => {
    const baseState = reducer(undefined, unknown)
    const state = reducer(baseState, { type: SET_LINEAGE_GRAPH_DEPTH, payload: 12 } as any)
    expect(state.depth).toBe(12)
  })

  it('should toggle showFullGraph', () => {
    const baseState = reducer(undefined, unknown)
    const state = reducer(baseState, { type: SET_SHOW_FULL_GRAPH, payload: false } as any)
    expect(state.showFullGraph).toBe(false)
  })

  it('should reset state on RESET_LINEAGE', () => {
    const modifiedState = {
      ...reducer(undefined, unknown),
      selectedNode: 'some-node',
    } as any

    const state = reducer(modifiedState, { type: RESET_LINEAGE } as any)
    expect(state.selectedNode).toBe(null)
  })
})
