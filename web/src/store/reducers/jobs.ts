// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AnyAction } from 'redux'
import { RESET_JOBS } from '../actionCreators/actionTypes'

export type IJobsState = {
  // Legacy or unused? Keeping empty for now to avoid breaking imports immediately
  // If no UI state is needed, this can be removed from root reducer eventually
  isLoading: boolean
}

export const initialState: IJobsState = {
  isLoading: false,
}

export default (state = initialState, action: AnyAction): IJobsState => {
  const { type } = action
  switch (type) {
    case RESET_JOBS:
      return initialState
    default:
      return state
  }
}
