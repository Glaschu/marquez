import { ActionBar } from './ActionBar'
import { Box } from '@mui/system'
import { DEFAULT_MAX_SCALE, Graph, ZoomPanControls } from '../../components/graph'
import { Drawer } from '@mui/material'
import { HEADER_HEIGHT, theme } from '../../helpers/theme'
import { IState } from '../../store/reducers'
import { JobOrDataset } from '../../types/lineage'
import { LineageGraph } from '../../types/api'
import { TableLevelNodeData, tableLevelNodeRenderer } from './nodes'
import { ZoomControls } from '../column-level/ZoomControls'
import { createElkNodes } from './layout'
import { useCallbackRef } from '../../helpers/hooks'
import { useLineage } from '../../queries/lineage'
import { useParams, useSearchParams } from 'react-router-dom'
import ParentSize from '@visx/responsive/lib/components/ParentSize'
import React, { useEffect, useRef, useState } from 'react'
import TableLevelDrawer from './TableLevelDrawer'

const zoomInFactor = 1.5
const zoomOutFactor = 1 / zoomInFactor

const ColumnLevel = () => {
  const { nodeType, namespace, name } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const [depth, setDepth] = useState(Number(searchParams.get('depth')) || 2)

  const [isCompact, setIsCompact] = useState(searchParams.get('isCompact') === 'true')
  const [isFull, setIsFull] = useState(searchParams.get('isFull') === 'true')

  const graphControls = useRef<ZoomPanControls>()

  const collapsedNodes = searchParams.get('collapsedNodes')

  const { data: lineage, refetch } = useLineage(
    nodeType as JobOrDataset,
    namespace || '',
    name || '',
    depth
  )

  if (!lineage) {
    return <div />
  }

  const handleScaleZoom = (inOrOut: 'in' | 'out') => {
    graphControls.current?.scaleZoom(inOrOut === 'in' ? zoomInFactor : zoomOutFactor)
  }

  const handleResetZoom = () => {
    graphControls.current?.fitContent()
  }

  const handleCenterOnNode = () => {
    graphControls.current?.centerOnPositionedNode(
      `${nodeType}:${namespace}:${name}`,
      DEFAULT_MAX_SCALE
    )
  }

  const setGraphControls = useCallbackRef((zoomControls) => {
    graphControls.current = zoomControls
  })

  const { nodes, edges } = createElkNodes(
    lineage,
    `${nodeType}:${namespace}:${name}`,
    isCompact,
    isFull,
    collapsedNodes
  )

  useEffect(() => {
    setTimeout(() => {
      graphControls.current?.fitContent()
    }, 300)
  }, [nodes.length, isCompact])

  return (
    <>
      <ActionBar
        nodeType={nodeType?.toUpperCase() as JobOrDataset}
        refresh={refetch}
        depth={depth}
        setDepth={setDepth}
        isCompact={isCompact}
        setIsCompact={setIsCompact}
        isFull={isFull}
        setIsFull={setIsFull}
      />
      <Box height={`calc(100vh - ${HEADER_HEIGHT}px - ${HEADER_HEIGHT}px - 1px)`}>
        <Drawer
          anchor={'right'}
          open={!!searchParams.get('tableLevelNode')}
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
            <TableLevelDrawer lineageGraph={lineage} />
          </Box>
        </Drawer>
        <ZoomControls
          handleCenterOnNode={handleCenterOnNode}
          handleScaleZoom={handleScaleZoom}
          handleResetZoom={handleResetZoom}
        />
        <ParentSize>
          {(parent) => (
            <Graph<JobOrDataset, TableLevelNodeData>
              id='column-level-graph'
              backgroundColor={theme.palette.background.default}
              height={parent.height}
              width={parent.width}
              nodes={nodes}
              edges={edges}
              direction='right'
              nodeRenderers={tableLevelNodeRenderer}
              setZoomPanControls={setGraphControls}
            />
          )}
        </ParentSize>
      </Box>
    </>
  )
}

export default ColumnLevel
