// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, beforeEach } from 'vitest'
import reducer from '../../store/reducers/namespaces'
import { FETCH_NAMESPACES_SUCCESS, SELECT_NAMESPACE } from '../../store/actionCreators/actionTypes'

const baseState = { result: [], selectedNamespace: null }

const createNamespacesPayload = (namespaces: any[]) => ({ namespaces })

describe('namespaces reducer', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value)
        },
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
      configurable: true,
    })
  })

  it('should return initial state for unknown actions', () => {
    expect(reducer(undefined, { type: 'UNKNOWN' } as any)).toEqual(baseState)
  })

  it('should handle FETCH_NAMESPACES_SUCCESS using stored selection when available', () => {
    const payload = createNamespacesPayload([
      { name: 'analytics', isHidden: false },
      { name: 'ml', isHidden: true },
    ])
    window.localStorage.setItem('selectedNamespace', 'analytics')

    const state = reducer(baseState as any, { type: FETCH_NAMESPACES_SUCCESS, payload } as any)
    expect(state.result).toEqual([{ name: 'analytics', isHidden: false }])
    expect(state.selectedNamespace).toBe('analytics')
  })

  it('should fall back to first namespace when stored value missing', () => {
    const payload = createNamespacesPayload([
      { name: 'default', isHidden: false },
      { name: 'archive', isHidden: false },
    ])
    const state = reducer(baseState as any, { type: FETCH_NAMESPACES_SUCCESS, payload } as any)
    expect(state.selectedNamespace).toBe('default')
  })

  it('should handle SELECT_NAMESPACE and persist selection', () => {
    const initial = { result: [{ name: 'default', isHidden: false }], selectedNamespace: 'default' }
    const action = { type: SELECT_NAMESPACE, payload: 'ml' }
    const state = reducer(initial as any, action as any)
    expect(state.selectedNamespace).toBe('ml')
    expect(window.localStorage.getItem('selectedNamespace')).toBe('ml')
  })
})
