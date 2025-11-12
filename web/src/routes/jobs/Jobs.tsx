// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import {
  Button,
  Chip,
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material'
import { HEADER_HEIGHT } from '../../helpers/theme'
import { IState } from '../../store/reducers'
import { MqScreenLoad } from '../../components/core/screen-load/MqScreenLoad'
import { Refresh } from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { encodeNode, runStateColor } from '../../helpers/nodes'
import { fetchJobs, resetJobs } from '../../store/actionCreators'
import { formatUpdatedAt } from '../../helpers'
import { stopWatchDuration } from '../../helpers/time'
import { truncateText } from '../../helpers/text'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress/CircularProgress'
import IconButton from '@mui/material/IconButton'
import MQTooltip from '../../components/core/tooltip/MQTooltip'
import MqEmpty from '../../components/core/empty/MqEmpty'
import MqPaging from '../../components/paging/MqPaging'
import MqStatus from '../../components/core/status/MqStatus'
import MqText from '../../components/core/text/MqText'
import NamespaceSelect from '../../components/namespace-select/NamespaceSelect'

interface JobsState {
  page: number
}

const PAGE_SIZE = 20
const JOB_HEADER_HEIGHT = 64

const Jobs = () => {
  const jobs = useSelector((state: IState) => state.jobs.result) ?? []
  const totalCount = useSelector((state: IState) => state.jobs.totalCount)
  const isJobsLoading = useSelector((state: IState) => state.jobs.isLoading)
  const isJobsInit = useSelector((state: IState) => state.jobs.init)
  const selectedNamespace = useSelector((state: IState) => state.namespaces.selectedNamespace)
  const dispatch = useDispatch()
  const defaultState = {
    page: 0,
  }
  const [state, setState] = useState<JobsState>(defaultState)

  useEffect(() => {
    if (selectedNamespace) {
      dispatch(fetchJobs(selectedNamespace, PAGE_SIZE, state.page * PAGE_SIZE))
    }
  }, [dispatch, selectedNamespace, state.page])

  useEffect(() => {
    return () => {
      // on unmount
      dispatch(resetJobs())
    }
  }, [dispatch])

  const handleClickPage = (direction: 'prev' | 'next') => {
    const directionPage = direction === 'next' ? state.page + 1 : state.page - 1

  dispatch(fetchJobs(selectedNamespace || '', PAGE_SIZE, directionPage * PAGE_SIZE))
    // reset page scroll
    window.scrollTo(0, 0)
  setState((prev) => ({ ...prev, page: directionPage }))
  }

  const { t } = useTranslation()
  return (
    <Container maxWidth={'lg'} disableGutters>
      <Box p={2} display={'flex'} justifyContent={'space-between'} alignItems={'center'}>
        <Box display={'flex'}>
          <MqText heading>{t('jobs_route.heading')}</MqText>
          {!isJobsLoading && (
            <Chip
              size={'small'}
              variant={'outlined'}
              color={'primary'}
              sx={{ marginLeft: 1 }}
              label={totalCount + ' total'}
            ></Chip>
          )}
        </Box>
        <Box display={'flex'} alignItems={'center'}>
          {isJobsLoading && <CircularProgress size={16} />}
          <NamespaceSelect />
          <MQTooltip title={'Refresh'}>
            <IconButton
              sx={{ ml: 2 }}
              color={'primary'}
              size={'small'}
              onClick={() => {
                if (selectedNamespace) {
                  dispatch(fetchJobs(selectedNamespace, PAGE_SIZE, state.page * PAGE_SIZE))
                }
              }}
            >
              <Refresh fontSize={'small'} />
            </IconButton>
          </MQTooltip>
        </Box>
      </Box>
      <MqScreenLoad
        loading={isJobsLoading && !isJobsInit}
        customHeight={`calc(100vh - ${HEADER_HEIGHT}px - ${JOB_HEADER_HEIGHT}px)`}
      >
        <>
          {jobs.length === 0 ? (
            <Box p={2}>
              <MqEmpty title={t('jobs_route.empty_title')}>
                <>
                  <MqText subdued>{t('jobs_route.empty_body')}</MqText>
                  <Button
                    color={'primary'}
                    size={'small'}
                    onClick={() => {
                      if (selectedNamespace) {
                        dispatch(fetchJobs(selectedNamespace, PAGE_SIZE, state.page * PAGE_SIZE))
                      }
                    }}
                  >
                    Refresh
                  </Button>
                </>
              </MqEmpty>
            </Box>
          ) : (
            <>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell key={t('jobs_route.name_col')} align='left'>
                      <MqText subheading>{t('datasets_route.name_col')}</MqText>
                    </TableCell>
                    <TableCell key={t('jobs_route.namespace_col')} align='left'>
                      <MqText subheading>{t('datasets_route.namespace_col')}</MqText>
                    </TableCell>
                    <TableCell key={t('jobs_route.updated_col')} align='left'>
                      <MqText subheading>{t('datasets_route.updated_col')}</MqText>
                    </TableCell>
                    <TableCell key={t('jobs_route.latest_run_col')} align='left'>
                      <MqText subheading>{t('jobs_route.latest_run_col')}</MqText>
                    </TableCell>
                    <TableCell key={t('jobs_route.latest_run_state_col')} align='left'>
                      <MqText subheading>{t('jobs_route.latest_run_state_col')}</MqText>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobs.map((job) => {
                    return (
                      <TableRow key={job.name}>
                        <TableCell align='left'>
                          <MqText
                            link
                            linkTo={`/lineage/${encodeNode('JOB', job.namespace, job.name)}`}
                          >
                            {truncateText(job.name, 40)}
                          </MqText>
                        </TableCell>
                        <TableCell align='left'>
                          <MqText>{truncateText(job.namespace, 40)}</MqText>
                        </TableCell>
                        <TableCell align='left'>
                          <MqText>{formatUpdatedAt(job.updatedAt)}</MqText>
                        </TableCell>
                        <TableCell align='left'>
                          <MqText>
                            {job.latestRun && job.latestRun.durationMs
                              ? stopWatchDuration(job.latestRun.durationMs)
                              : 'N/A'}
                          </MqText>
                        </TableCell>
                        <TableCell key={t('jobs_route.latest_run_col')} align='left'>
                          <MqStatus
                            color={job.latestRun && runStateColor(job.latestRun.state || 'NEW')}
                            label={
                              job.latestRun && job.latestRun.state ? job.latestRun.state : 'N/A'
                            }
                          />
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
            </>
          )}
        </>
      </MqScreenLoad>
    </Container>
  )
}

export default Jobs
