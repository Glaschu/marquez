import { ActionBar } from './ActionBar'
import { ColumnLevelNodeData, ColumnLevelNodeKinds, columnLevelNodeRenderer } from './nodes'
import { Drawer } from '@mui/material'
import { Graph, ZoomPanControls } from '../../components/graph'
import { HEADER_HEIGHT, theme } from '../../helpers/theme'
import { RootState } from '../../store/store'
import { ZoomControls } from './ZoomControls'
import { createElkNodes } from './layout'
import { useCallbackRef } from '../../helpers/hooks'
import { useColumnLineage } from '../../queries/columnlineage'
import { useParams, useSearchParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import ColumnLevelDrawer from './ColumnLevelDrawer'
import ParentSize from '@visx/responsive/lib/components/ParentSize'
import React, { useEffect, useRef, useState } from 'react'

const zoomInFactor = 1.5
const zoomOutFactor = 1 / zoomInFactor

const ColumnLevel: React.FC = () => {
  const { namespace, name } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)

  const graphControls = useRef<ZoomPanControls>()

  const { data: columnLineage, refetch } = useColumnLineage(
    'DATASET',
    namespace || '',
    name || '',
    depth
  )

  // const column = searchParams.get('column')
  // useEffect(() => {
  //   if (column) {
  //     graphControls.current?.centerOnPositionedNode(
  //       `datasetField:${namespace}:${parseColumnLineageNode(column).dataset}`
  //     )
  //   }
  // }, [column])

  if (!columnLineage) {
    return <div />
  }

  const handleScaleZoom = (inOrOut: 'in' | 'out') => {
    graphControls.current?.scaleZoom(inOrOut === 'in' ? zoomInFactor : zoomOutFactor)
  }

  const handleResetZoom = () => {
    graphControls.current?.fitContent()
  }

  const setGraphControls = useCallbackRef((zoomControls) => {
    graphControls.current = zoomControls
  })

  const { nodes, edges } = createElkNodes(columnLineage, searchParams.get('column'))

  useEffect(() => {
    setTimeout(() => {
      graphControls.current?.fitContent()
    }, 300)
  }, [nodes.length])

  return (
    <>
      <ActionBar refresh={refetch} depth={depth} setDepth={setDepth} />
      <Box height={`calc(100vh - ${HEADER_HEIGHT}px - 64px)`}>
        <Drawer
          anchor={'right'}
          open={!!searchParams.get('dataset')}
          onClose={() => setSearchParams({})}
          PaperProps={{
            sx: {
              backgroundColor: theme.palette.background.default,
              backgroundImage: 'none',
              mt: `${HEADER_HEIGHT}px`,
              height: `calc(100vh - ${HEADER_HEIGHT}px)`,
            },
          }}
        >
          <Box>
            <ColumnLevelDrawer />
          </Box>
        </Drawer>
        <ZoomControls handleScaleZoom={handleScaleZoom} handleResetZoom={handleResetZoom} />
        <ParentSize>
          {(parent) => (
            <Graph<ColumnLevelNodeKinds, ColumnLevelNodeData>
              id='column-level-graph'
              backgroundColor={theme.palette.background.default}
              height={parent.height}
              width={parent.width}
              nodes={nodes}
              edges={edges}
              direction='right'
              nodeRenderers={columnLevelNodeRenderer}
              setZoomPanControls={setGraphControls}
            />
          )}
        </ParentSize>
      </Box>
    </>
  )
}

export default ColumnLevel
