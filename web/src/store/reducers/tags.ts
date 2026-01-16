// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Tag } from '../../types/api'

export type ITagsState = { isLoading: boolean; tags: Tag[]; init: boolean }

export const initialState: ITagsState = {
  isLoading: false,
  init: false,
  tags: [],
}

export default (state: ITagsState = initialState): ITagsState => {
  return state
}
