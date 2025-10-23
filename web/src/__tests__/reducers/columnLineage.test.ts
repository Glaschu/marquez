// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import reducer from '../../store/reducers/columnLineage'
import { FETCH_COLUMN_LINEAGE_SUCCESS } from '../../store/actionCreators/actionTypes'

const unknownAction = { type: 'UNKNOWN_ACTION' } as any

describe('columnLineage reducer', () => {
  it('should return the initial state when action is unknown', () => {
    expect(reducer(undefined, unknownAction)).toEqual({ columnLineage: { graph: [] } })
  })

  it('should handle FETCH_COLUMN_LINEAGE_SUCCESS', () => {
    const payload = { graph: [{ id: 'node-1' }] }
    const action = { type: FETCH_COLUMN_LINEAGE_SUCCESS, payload }
    expect(reducer(undefined, action as any)).toEqual({ columnLineage: payload })
  })
})
