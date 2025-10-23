// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { ArrowBackIosRounded } from '@mui/icons-material'
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { IState } from '../../store/reducers'
import { Run } from '../../types/api'
import { alpha, createTheme } from '@mui/material/styles'
import { fetchRuns } from '../../store/actionCreators'
import { useDispatch, useSelector } from 'react-redux'
import { formatUpdatedAt } from '../../helpers'
import { runStateColor } from '../../helpers/nodes'
import { stopWatchDuration } from '../../helpers/time'
import { useTheme } from '@emotion/react'
import { useTranslation } from 'react-i18next'
import MQTooltip from '../core/tooltip/MQTooltip'
import MqCode from '../core/code/MqCode'
import MqCopy from '../core/copy/MqCopy'
import MqEmpty from '../core/empty/MqEmpty'
import MqPaging from '../paging/MqPaging'
import MqStatus from '../core/status/MqStatus'
import MqText from '../core/text/MqText'
import React, { SetStateAction } from 'react'
import RunInfo from './RunInfo'

interface RunsProps {
  jobName: string
  jobNamespace: string
  facets?: object
}

interface RunsState {
  page: number
}

const PAGE_SIZE = 10

const Runs = (props: RunsProps) => {
  const { jobName, jobNamespace, facets } = props
  const runs = useSelector((state: IState) => state.runs.result)
  const totalCount = useSelector((state: IState) => state.runs.totalCount)
  const runsLoading = useSelector((state: IState) => state.runs.isLoading)
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const [state, setState] = React.useState<RunsState>({
    page: 0,
  })

  const [infoView, setInfoView] = React.useState<Run | null>(null)
  const handleClick = (newValue: SetStateAction<Run | null>) => {
    setInfoView(newValue)
  }

  const handleClickPage = (direction: 'prev' | 'next') => {
    const directionPage = direction === 'next' ? state.page + 1 : state.page - 1
    window.scrollTo(0, 0)
    setState({ ...state, page: directionPage })
  }

  React.useEffect(() => {
    dispatch(fetchRuns(jobName, jobNamespace, PAGE_SIZE, state.page * PAGE_SIZE))
  }, [state.page, dispatch, jobName, jobNamespace])

  const theme = createTheme(useTheme())

  if (!runs || runs.length === 0) {
    return <MqEmpty title={t('jobs.empty_title')} body={t('jobs.empty_body')} />
  }

  if (runsLoading) {
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
          <Chip size={'small'} variant={'outlined'} label={infoView.id} />
          <IconButton onClick={() => handleClick(null)} size='small'>
            <ArrowBackIosRounded fontSize={'small'} />
          </IconButton>
        </Box>
        <RunInfo run={infoView} />
      </>
    )
  }

  return (
    <Box>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('runs_columns.id')}
              </MqText>
            </TableCell>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('runs_columns.state')}
              </MqText>
            </TableCell>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('runs_columns.created_at')}
              </MqText>
            </TableCell>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('runs_columns.started_at')}
              </MqText>
            </TableCell>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('runs_columns.ended_at')}
              </MqText>
            </TableCell>
            <TableCell align='left'>
              <MqText subheading inline>
                {t('runs_columns.duration')}
              </MqText>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {runs.map((run) => {
            return run.durationMs > 0 ? (
              <TableRow
                key={run.id}
                sx={{
                  cursor: 'pointer',
                  transition: theme.transitions.create(['background-color']),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                  },
                }}
                onClick={() => handleClick(run)}
              >
                <TableCell align='left'>
                  <Box display={'flex'} alignItems={'center'}>
                    <MQTooltip title={run.id}>
                      <Box>
                        <MqText font={'mono'}>{run.id.substring(0, 8)}...</MqText>
                      </Box>
                    </MQTooltip>
                    <MqCopy string={run.id} />
                  </Box>
                </TableCell>
                <TableCell align='left'>
                  <MqStatus color={runStateColor(run.state)} label={run.state} />
                </TableCell>
                <TableCell align='left'>{formatUpdatedAt(run.createdAt)}</TableCell>
                <TableCell align='left'>{formatUpdatedAt(run.startedAt)}</TableCell>
                <TableCell align='left'>{formatUpdatedAt(run.endedAt)}</TableCell>
                <TableCell align='left'>{stopWatchDuration(run.durationMs)}</TableCell>
              </TableRow>
            ) : (
              <TableRow
                key={run.id}
                sx={{
                  cursor: 'pointer',
                  transition: theme.transitions.create(['background-color']),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.common.white, 0.1),
                  },
                }}
                onClick={() => handleClick(run)}
              >
                <TableCell align='left'>
                  <Box display={'flex'} alignItems={'center'}>
                    {run.id.substring(0, 8)}...
                    <MqCopy string={run.id} />{' '}
                  </Box>
                </TableCell>
                <TableCell align='left'>
                  <MqStatus color={runStateColor(run.state)} label={run.state} />
                </TableCell>
                <TableCell align='left'>{formatUpdatedAt(run.createdAt)}</TableCell>
                <TableCell align='left'>{formatUpdatedAt(run.startedAt)}</TableCell>
                <TableCell align='left'>N/A</TableCell>
                <TableCell align='left'>
                  {run.state === 'RUNNING' || run.state === 'NEW'
                    ? 'N/A'
                    : stopWatchDuration(run.durationMs)}{' '}
                </TableCell>
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
      {facets && (
        <Box mt={2}>
          <Box mb={1}>
            <MqText subheading>{t('jobs.runs_subhead')}</MqText>
          </Box>
          <MqCode code={JSON.stringify(facets, null, '\t')} />
        </Box>
      )}
    </Box>
  )
}

export default Runs
