// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0
import { Box } from '@mui/material'
import { IState } from '../../store/reducers'
import { Run } from '../../types/api'
import { fetchJobFacets, resetFacets } from '../../store/actionCreators'
import { useDispatch, useSelector } from 'react-redux'
import MqCode from '../core/code/MqCode'
import MqJsonView from '../core/json-view/MqJsonView'
import MqText from '../core/text/MqText'
import React, { useEffect } from 'react'

interface JobFacets {
  [key: string]: object
}

export interface SqlFacet {
  query: string
}

export interface SourceCodeFacet {
  language: string
  sourceCode: string
  _producer: string
  _schemaURL: string
}

type RunInfoProps = {
  run: Run
}

const RunInfo = ({ run }: RunInfoProps) => {
  const jobFacets = useSelector((state: IState) => state.facets.result)
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(fetchJobFacets(run.id))
  }, [dispatch, run.id])

  // unmounting
  useEffect(
    () => () => {
      dispatch(resetFacets())
    },
    [dispatch]
  )

  return (
    <Box>
      {<MqCode code={(jobFacets?.sql as SqlFacet)?.query} language={'sql'} />}
      {jobFacets?.sourceCode && (
        <MqCode
          code={(jobFacets.sourceCode as SourceCodeFacet)?.sourceCode}
          language={(jobFacets.sourceCode as SourceCodeFacet)?.language}
        />
      )}
      {jobFacets && (
        <Box mt={2}>
          <Box mb={1}>
            <MqText subheading>JOB FACETS</MqText>
          </Box>
          <MqJsonView data={jobFacets} aria-label={'Job facets'} aria-required='true' />
        </Box>
      )}
      {run.facets && (
        <Box mt={2}>
          <Box mb={1}>
            <MqText subheading>RUN FACETS</MqText>
          </Box>
          <MqJsonView data={run.facets} aria-label={'Run facets'} aria-required='true' />
        </Box>
      )}
    </Box>
  )
}

export default RunInfo
