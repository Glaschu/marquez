// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { HEADER_HEIGHT } from '../../helpers/theme'
import { Nullable } from '../../types/util/Nullable'
import {
  RESET_LINEAGE,
  SET_BOTTOM_BAR_HEIGHT,
  SET_LINEAGE_GRAPH_DEPTH,
  SET_SELECTED_NODE,
  SET_SHOW_FULL_GRAPH,
  SET_TAB_INDEX,
} from '../actionCreators/actionTypes'

export interface ILineageState {
  selectedNode: Nullable<string>
  bottomBarHeight: number
  depth: number
  tabIndex: number
  showFullGraph: boolean
  // lineage: LineageGraph // Removed
}

const initialState: ILineageState = {
  selectedNode: null,
  bottomBarHeight: (window.innerHeight - HEADER_HEIGHT) / 3,
  depth: 5,
  tabIndex: 0,
  showFullGraph: true,
}

const DRAG_BAR_HEIGHT = 8

export default (state = initialState, action: any) => {
  switch (action.type) {
    case SET_SELECTED_NODE:
      // reset the selected index if we are not on the i/o tab
      return { ...state, selectedNode: action.payload, tabIndex: state.tabIndex === 1 ? 1 : 0 }
    case SET_BOTTOM_BAR_HEIGHT:
      return {
        ...state,
        bottomBarHeight: Math.min(
          window.innerHeight - HEADER_HEIGHT - DRAG_BAR_HEIGHT,
          Math.max(2, action.payload)
        ),
      }
    case SET_TAB_INDEX:
      return {
        ...state,
        tabIndex: action.payload,
      }
    case SET_LINEAGE_GRAPH_DEPTH:
      return {
        ...state,
        depth: action.payload,
      }
    case SET_SHOW_FULL_GRAPH:
      return {
        ...state,
        showFullGraph: action.payload,
      }
    case RESET_LINEAGE: {
      return initialState
    }
    default:
      return state
  }
}
