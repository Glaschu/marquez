// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box, Button } from '@mui/material'
import { Dataset } from '../../types/api'
import { IState } from '../../store/reducers'
import { LineageDataset } from '../../types/lineage'
import { useDispatch, useSelector } from 'react-redux'
import { fetchDataset, resetDataset } from '../../store/actionCreators'
import { fileSize } from '../../helpers'
import { saveAs } from 'file-saver'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MqEmpty from '../core/empty/MqEmpty'
import MqJsonView from '../../components/core/json-view/MqJsonView'
import MqText from '../core/text/MqText'
import { useEffect } from 'react'

interface DatasetColumnLineageProps {
  lineageDataset: LineageDataset
}

const DatasetColumnLineage = (props: DatasetColumnLineageProps) => {
  const { t } = useTranslation()
  const { lineageDataset } = props
  const { name, namespace } = useParams()
  const dataset = useSelector((state: IState) => state.dataset.result)
  const dispatch = useDispatch()

  useEffect(() => {
    if (namespace && name) {
      dispatch(fetchDataset(namespace, name))
    }
  }, [name, namespace, dispatch])

  // unmounting
  useEffect(
    () => () => {
      dispatch(resetDataset())
    },
    [dispatch]
  )

  const handleDownloadPayload = (data: object) => {
    const title = `${lineageDataset.name}-${lineageDataset.namespace}-columnLineage`
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    saveAs(blob, `${title}.json`)
  }

  const columnLineage = dataset?.columnLineage
  return (
    <>
      {columnLineage ? (
        <>
          {fileSize(JSON.stringify(columnLineage)).kiloBytes > 500 ? (
            <Box p={2}>
              <MqEmpty title={'Payload is too big for render'}>
                <div>
                  <MqText subdued>Please click on button and download payload as file</MqText>
                  <br />
                  <Button
                    variant='outlined'
                    color='primary'
                    onClick={() => handleDownloadPayload(columnLineage)}
                  >
                    Download payload
                  </Button>
                </div>
              </MqEmpty>
            </Box>
          ) : (
            <MqJsonView data={columnLineage} />
          )}
        </>
      ) : (
        <MqEmpty
          title={t('datasets_column_lineage.empty_title')}
          body={t('datasets_column_lineage.empty_body')}
        />
      )}
    </>
  )
}

export default DatasetColumnLineage
