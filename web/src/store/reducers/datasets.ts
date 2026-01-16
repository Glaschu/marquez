// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AnyAction } from 'redux'
import { RESET_DATASETS } from '../actionCreators/actionTypes'

export type IDatasetsState = {
  isLoading: boolean
  deletedDatasetName: string
}

export const initialState: IDatasetsState = {
  isLoading: false,
  deletedDatasetName: '',
}

export default (state: IDatasetsState = initialState, action: AnyAction): IDatasetsState => {
  const { type } = action
  switch (type) {
    case RESET_DATASETS:
      return initialState
    default:
      return state
  }
}
