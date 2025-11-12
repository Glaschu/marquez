import React, { memo } from 'react'

import Box from '@mui/material/Box'
import type { NodeProps } from 'reactflow'

import type { NodeRenderer, PositionedNode } from '../types'

interface GraphNodeData {
  node: PositionedNode<any, any>
  nodeRenderers: Map<any, NodeRenderer<any, any>>
}

export const GraphNodeComponent = memo(({ data }: NodeProps<GraphNodeData>) => {
  if (!data) return null

  const { node, nodeRenderers } = data
  const Renderer = nodeRenderers.get(node.kind)

  if (!Renderer) return null

  const width = node.width ?? 0
  const height = node.height ?? 0

  return (
    <Box
      sx={{
        width,
        height,
        pointerEvents: 'auto',
      }}
      data-node-id={node.id}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <Renderer node={node} />
      </svg>
    </Box>
  )
})

GraphNodeComponent.displayName = 'GraphNodeComponent'
