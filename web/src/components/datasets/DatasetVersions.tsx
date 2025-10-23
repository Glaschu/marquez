// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ArrowBackIosRounded } from '@mui/icons-material'
import {
  Box,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { Dataset, DatasetVersion } from '../../types/api'
import { IState } from '../../store/reducers'
import { alpha, createTheme } from '@mui/material/styles'
import { fetchDatasetVersions } from '../../store/actionCreators'
import { useDispatch, useSelector } from 'react-redux'
import { formatUpdatedAt } from '../../helpers'
import { useTheme } from '@emotion/react'
import { useTranslation } from 'react-i18next'
import DatasetInfo from './DatasetInfo'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '../core/tooltip/MQTooltip'
import MqCopy from '../core/copy/MqCopy'
import MqPaging from '../paging/MqPaging'
import MqText from '../core/text/MqText'
import React, { SetStateAction } from 'react'

interface DatasetVersionsProps {
  dataset: Dataset
}

interface VersionsState {
  page: number
}

const PAGE_SIZE = 10

const DatasetVersions = (props: DatasetVersionsProps) => {
  const { dataset } = props
  const versions = useSelector((state: IState) => state.datasetVersions.result.versions)
  const isLoading = useSelector((state: IState) => state.datasetVersions.isLoading)
  const totalCount = useSelector((state: IState) => state.datasetVersions.result.totalCount)
  const dispatch = useDispatch()

  const [state, setState] = React.useState<VersionsState>({
    page: 0,
  })

  const [infoView, setInfoView] = React.useState<DatasetVersion | null>(null)

  const handleClick = (newValue: SetStateAction<DatasetVersion | null>) => {
    setInfoView(newValue)
  }

  const handleClickPage = (direction: 'prev' | 'next') => {
    const directionPage = direction === 'next' ? state.page + 1 : state.page - 1
    window.scrollTo(0, 0)
    setState({ ...state, page: directionPage })
  }

  const { t } = useTranslation()
  const theme = createTheme(useTheme())

  React.useEffect(() => {
    dispatch(fetchDatasetVersions(dataset.namespace, dataset.name, PAGE_SIZE, state.page * PAGE_SIZE))
  }, [state.page, dispatch, dataset.namespace, dataset.name])

  if (!versions || versions.length === 0) {
    return null
  }

  if (isLoading) {
    return (
      <Box display={'flex'} justifyContent={'center'} mt={2}>
        <CircularProgress color='primary' />
      </Box>
    )
  }

  if (infoView) {
    return (
      <>
        <Box display={'flex'} alignItems={'center'} width={'100%'} justifyContent={'space-between'}>
          <Chip size={'small'} variant={'outlined'} label={infoView.version} />
          <IconButton onClick={() => handleClick(null)} size='small'>
            <ArrowBackIosRounded fontSize={'small'} />
          </IconButton>
        </Box>
        <DatasetInfo dataset={dataset} datasetFields={infoView.fields} facets={infoView.facets} />
      </>
    )
  }
  return (
    <>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('dataset_versions_columns.version')}
              </MqText>
            </TableCell>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('dataset_versions_columns.created_at')}
              </MqText>
            </TableCell>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('dataset_versions_columns.fields')}
              </MqText>
            </TableCell>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('dataset_versions_columns.created_by_run')}
              </MqText>
            </TableCell>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('dataset_versions_columns.lifecycle_state')}
              </MqText>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {versions.map((version) => {
            return (
              <TableRow
                sx={{
                  cursor: 'pointer',
                  transition: theme.transitions.create(['background-color']),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                  },
                }}
                key={version.createdAt}
                onClick={() => handleClick(version)}
              >
                <TableCell align='left'>
                  <Box display={'flex'} alignItems={'center'}>
                    <MQTooltip title={version.version}>
                      <MqText font={'mono'}>{version.version.substring(0, 8)}...</MqText>
                    </MQTooltip>
                    <MqCopy string={version.version} />
                  </Box>
                </TableCell>
                <TableCell align='left'>{formatUpdatedAt(version.createdAt)}</TableCell>
                <TableCell align='left'>{version.fields.length}</TableCell>
                <TableCell align='left'>
                  <Box display={'flex'} alignItems={'center'}>
                    {version.createdByRun ? (
                      <>
                        <MqText font={'mono'}>{version.createdByRun.id.substring(0, 8)}...</MqText>
                        <MqCopy string={version.createdByRun.id} />
                      </>
                    ) : (
                      'N/A'
                    )}
                  </Box>
                </TableCell>
                <TableCell align='left'>{version.lifecycleState || 'N/A'}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <MqPaging
        pageSize={PAGE_SIZE}
        currentPage={state.page}
        totalCount={totalCount}
        incrementPage={() => handleClickPage('next')}
        decrementPage={() => handleClickPage('prev')}
      />
    </>
  )
}

export default DatasetVersions
