import datasetsReducer, { initialState } from '../../store/reducers/datasets'
import { AnyAction } from 'redux'

describe('datasets reducer', () => {
  it('should return the initial state', () => {
    expect(datasetsReducer(undefined, {} as AnyAction)).toEqual(initialState)
  })

  it('should handle RESET_DATASETS', () => {
    const action = { type: 'RESET_DATASETS' }
    const state = { ...initialState, isLoading: true, deletedDatasetName: 'something' }
    expect(datasetsReducer(state, action)).toEqual(initialState)
  })
})
