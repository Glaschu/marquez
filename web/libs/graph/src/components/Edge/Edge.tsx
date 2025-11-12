import React, { useMemo } from 'react'

import useMediaQuery from '@mui/material/useMediaQuery'
import { grey } from '@mui/material/colors'
import { keyframes } from '@mui/system'
import type { EdgeProps as ReactFlowEdgeProps } from 'reactflow'

import { EdgeLabel } from './EdgeLabel'
import type { PositionedEdge } from '../../types'

const marchingAnts = keyframes`
  from { stroke-dashoffset: 60; }
  to { stroke-dashoffset: 0; }
`

export interface GraphEdgeData {
  edge: PositionedEdge
}

export const GraphEdge = ({ data }: ReactFlowEdgeProps<GraphEdgeData>) => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const edge = data?.edge

  const points = useMemo(() => {
    if (!edge) return []
    const { startPoint, bendPoints, endPoint } = edge
    return [startPoint, ...(bendPoints ?? []), endPoint]
  }, [edge])

  const pointsAttribute = useMemo(() => points.map(({ x, y }) => `${x},${y}`).join(' '), [points])

  const labelBaseline = useMemo(() => {
    if (!edge?.label || points.length < 2) return undefined
    let longest: { length: number; y: number } | undefined
    points.forEach((point, index) => {
      if (index === 0) return
      const length = Math.abs(point.x - points[index - 1].x)
      if (!longest || length > longest.length) {
        longest = { length, y: point.y }
      }
    })
    return longest?.y
  }, [edge?.label, points])

  if (!edge) {
    return null
  }

  const strokeColor = edge.color || grey['600']
  const strokeWidth = edge.strokeWidth || 2

  return (
    <g data-edge-id={edge.id} style={{ pointerEvents: 'none' }}>
      <polyline
        id={`${edge.sourceNodeId}-${edge.targetNodeId}`}
        fill='none'
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin='round'
        points={pointsAttribute}
      />
      <EdgeLabel label={edge.label} endPointY={labelBaseline} />
      {!prefersReducedMotion && edge.isAnimated && (
        <polyline
          id={`${edge.sourceNodeId}-${edge.targetNodeId}-animated`}
          fill='none'
          strokeLinecap='round'
          stroke={strokeColor}
          strokeWidth={edge.strokeWidth || 5}
          strokeLinejoin='round'
          strokeDasharray='0px 60px'
          style={{ animation: `${marchingAnts} 2s linear infinite` }}
          points={pointsAttribute}
        />
      )}
    </g>
  )
}
