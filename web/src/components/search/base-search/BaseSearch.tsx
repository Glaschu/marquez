// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { GroupedSearch } from '../../../types/api'
import { IState } from '../../../store/reducers'
import { useDispatch, useSelector } from 'react-redux'
import { faCog, faDatabase, faSort } from '@fortawesome/free-solid-svg-icons'
import { fetchSearch, setSelectedNode } from '../../../store/actionCreators'
import { parseSearchGroup } from '../../../helpers/nodes'
import { theme } from '../../../helpers/theme'
import { useTranslation } from 'react-i18next'
import Box from '@mui/system/Box'
import MqChipGroup from '../../core/chip/MqChipGroup'
import MqText from '../../core/text/MqText'
import React, { useEffect, useState } from 'react'
import SearchListItem from '../SearchListItem'

interface BaseSearchProps {
  search: string
}

const INITIAL_SEARCH_FILTER = [
  {
    text: 'All',
    value: 'All',
  },
  {
    icon: faCog,
    foregroundColor: theme.palette.common.white,
    backgroundColor: theme.palette.primary.main,
    text: 'JOBS',
    value: 'JOB',
  },
  {
    icon: faDatabase,
    foregroundColor: theme.palette.common.white,
    backgroundColor: theme.palette.info.main,
    text: 'DATASETS',
    value: 'DATASET',
  },
]

const INITIAL_SEARCH_SORT_FILTER = [
  {
    icon: faSort,
    value: 'Sort',
    foregroundColor: theme.palette.common.white,
    backgroundColor: 'transparent',
    selectable: false,
  },
  {
    text: 'Updated at',
    value: 'UPDATE_AT',
  },
  {
    text: 'Name',
    value: 'NAME',
  },
]

const BaseSearch = ({ search }: BaseSearchProps) => {
  const dispatch = useDispatch()
  const searchResults =
    useSelector((state: IState) => state.search.data.results) ?? new Map<string, GroupedSearch[]>()
  const isSearching = useSelector((state: IState) => state.search.isLoading)
  const isSearchingInit = useSelector((state: IState) => state.search.init)
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('UPDATE_AT')

  const { t } = useTranslation()

  const onSelectFilter = (label: string) => {
    setFilter(label)
    dispatch(fetchSearch(search, label.toUpperCase(), sort.toUpperCase()))
  }

  const onSelectSortFilter = (label: string) => {
    setSort(label)
    dispatch(fetchSearch(search, filter.toUpperCase(), label.toUpperCase()))
  }

  const searchApi = (q: string, filter = 'ALL', sort = 'NAME') => {
    dispatch(fetchSearch(q, filter, sort))
  }

  useEffect(() => {
    if (search.length > 0) {
      searchApi(search, filter, sort)
    }
  }, [dispatch, search, filter, sort])

  return (
    <>
      <Box
        sx={{
          padding: theme.spacing(2),
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <MqChipGroup
          chips={INITIAL_SEARCH_FILTER}
          onSelect={onSelectFilter}
          initialSelection={filter}
        />
        <MqChipGroup
          chips={INITIAL_SEARCH_SORT_FILTER}
          onSelect={onSelectSortFilter}
          initialSelection={sort}
        />
      </Box>
      <Box
        sx={{
          margin: 0,
          overflow: 'auto',
          maxHeight: `calc(100vh - ${theme.spacing(20)})`,
          paddingLeft: 0,
          borderBottomLeftRadius: theme.spacing(1),
          borderBottomRightRadius: theme.spacing(1),
        }}
      >
        {searchResults.size === 0 && (
          <Box m={2} display={'flex'} alignItems={'center'} justifyContent={'center'}>
            <MqText>
              {isSearching || !isSearchingInit ? t('search.status') : t('search.none')}
            </MqText>
          </Box>
        )}
        {[...searchResults].map((resultsWithGroups, index) => {
          return resultsWithGroups.map((result) => {
            if (typeof result === 'string') {
              // is group
              if (result.length > 0) {
                return (
                  <Box
                    sx={{
                      borderTop: `2px dashed ${theme.palette.secondary.main}`,
                      borderBottom: `2px dashed ${theme.palette.secondary.main}`,
                      padding: `${theme.spacing(0)} ${theme.spacing(3)} ${theme.spacing(
                        0.5
                      )} ${theme.spacing(1)}`,
                      backgroundColor: theme.palette.background.paper,
                    }}
                    key={result}
                    display={'flex'}
                    justifyContent={'space-between'}
                    alignItems={'center'}
                  >
                    <Box>
                      <MqText bold font={'mono'}>
                        {parseSearchGroup(result, 'group')}
                      </MqText>
                    </Box>
                    <Box>
                      <MqText bold font={'mono'} small>
                        {parseSearchGroup(result, 'namespace')}
                      </MqText>
                    </Box>
                  </Box>
                )
              } else return null
              // is a list of group members
            } else if (result.length) {
              return (
                <Box key={result[0].group + index}>
                  {result.map((listItem) => {
                    return (
                      <React.Fragment key={listItem.name}>
                        <SearchListItem
                          searchResult={listItem}
                          search={search}
                          onClick={() => {
                            dispatch(setSelectedNode(listItem.nodeId))
                          }}
                        />
                      </React.Fragment>
                    )
                  })}
                </Box>
              )
            } else {
              return null
            }
          })
        })}
      </Box>
    </>
  )
}

export default BaseSearch
