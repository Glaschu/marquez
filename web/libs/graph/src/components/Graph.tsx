import React, { useEffect, useMemo, useRef } from 'react'
import useSize from '@react-hook/size'
import 'reactflow/dist/style.css'

import Box from '@mui/system/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

import ReactFlow, {
  Background,
  MiniMap,
  Node as FlowNode,
  Edge as FlowEdge,
  Position,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'

import { useLayout } from '../layout/useLayout'
import { GraphNodeComponent } from './GraphNode'
import { GraphEdge, type GraphEdgeData } from './Edge'
import type {
  Direction,
  Edge,
  Node,
  NodeRenderer,
  PositionedEdge,
  PositionedNode,
} from '../types'

export type Extent = [[number, number], [number, number]]

export const DEFAULT_MAX_SCALE = 1.7

export interface ZoomPanControls {
  fitContent(): void
  fitExtent(extent: Extent, zoomIn?: boolean): void
  centerOnExtent(extent: Extent, k?: number): void
  scaleZoom(kDelta?: number): void
  resetZoom(): void
  centerOnPositionedNode(nodeId: string, k?: number): void
}

export enum MiniMapPlacement {
  TopLeft = 'top-left',
  TopRight = 'top-right',
  BottomRight = 'bottom-right',
  BottomLeft = 'bottom-left',
  None = 'none',
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

type FlattenedNode<K, D> = PositionedNode<K, D> & { parentId?: string }

const flattenNodes = <K, D>(nodes: PositionedNode<K, D>[], parentId?: string): FlattenedNode<K, D>[] =>
  nodes.flatMap((node) => {
    const current: FlattenedNode<K, D> = {
      ...node,
      parentId,
    }

    const childNodes = node.children ? flattenNodes(node.children, node.id) : []

    return [current, ...childNodes]
  })

const getNodeExtent = (node: PositionedNode<any, any>): Extent => [
  [node.bottomLeftCorner.x, node.bottomLeftCorner.y],
  [node.bottomLeftCorner.x + node.width, node.bottomLeftCorner.y + node.height],
]

const getExtentCenter = (extent: Extent) => ({
  x: (extent[0][0] + extent[1][0]) / 2,
  y: (extent[0][1] + extent[1][1]) / 2,
})

const getExtentSize = (extent: Extent) => ({
  width: extent[1][0] - extent[0][0],
  height: extent[1][1] - extent[0][1],
})

interface Props<K, D> {
  id: string
  nodes: Node<K, D>[]
  edges: Edge[]
  direction?: Direction
  webWorkerUrl?: string
  miniMapPlacement?: MiniMapPlacement
  nodeRenderers: Map<K, NodeRenderer<K, D>>
  width?: number // intended for testing purposes only
  height?: number // intended for testing purposes only
  maxScale?: number
  /*
   * minScale is automatically set to fit the content, but minScaleMinimum can allow the user to scale out further.
   * Typically, this would be set to 1.
   */
  minScaleMinimum?: number
  containerPadding?: number
  emptyMessage?: string
  hideDotGrid?: boolean
  backgroundColor?: string
  dotGridColor?: string
  disableZoomPan?: boolean
  setZoomPanControls?: (controls: ZoomPanControls) => void
}

const GraphInner = <K, D>({
  id,
  nodes,
  edges,
  direction,
  webWorkerUrl,
  miniMapPlacement = MiniMapPlacement.BottomLeft,
  nodeRenderers,
  width: propWidth,
  height: propHeight,
  maxScale = DEFAULT_MAX_SCALE,
  minScaleMinimum,
  containerPadding,
  hideDotGrid = false,
  backgroundColor,
  dotGridColor,
  disableZoomPan = false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setZoomPanControls = () => {},
  emptyMessage,
}: Props<K, D>) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, containerHeight] = useSize(containerRef)

  const { layout, error, isRendering } = useLayout<K, D>({
    id,
    nodes,
    edges,
    direction: direction ?? 'right',
    keepPreviousGraph: true,
    webWorkerUrl,
    getLayoutOptions: (node: Node<K, D>) =>
      nodeRenderers.get(node.kind)?.getLayoutOptions(node) || node,
  })
  const positionedNodes = layout?.nodes ?? []
  const positionedEdges = layout?.edges ?? []
  const contentWidth = layout?.width ?? 0
  const contentHeight = layout?.height ?? 0

  useEffect(() => {
    if (error) {
      console.error(error)
    }
  }, [error])

  const measuredWidth = propWidth ?? containerWidth
  const measuredHeight = propHeight ?? containerHeight
  const padding = containerPadding ?? 0

  const measurementsReady = Boolean(
    measuredWidth && measuredHeight && contentWidth && contentHeight
  )

  const flattenedNodes = useMemo(
    () => flattenNodes(positionedNodes),
    [positionedNodes]
  )

  const nodeLookup = useMemo(
    () => new Map(flattenedNodes.map((node) => [node.id, node])),
    [flattenedNodes]
  )

  type GraphNodeData = {
    node: PositionedNode<K, D>
    nodeRenderers: Map<any, NodeRenderer<any, any>>
  }

  const flowNodes = useMemo<FlowNode<GraphNodeData>[]>(
    () =>
      flattenedNodes.map((node) => ({
        id: node.id,
        type: 'graphNode',
        position: {
          x: node.bottomLeftCorner.x,
          y: node.bottomLeftCorner.y,
        },
        data: {
          node,
          nodeRenderers: nodeRenderers as Map<any, NodeRenderer<any, any>>,
        },
        width: node.width,
        height: node.height,
        parentNode: node.parentId,
        extent: node.parentId ? 'parent' : undefined,
        draggable: false,
        selectable: false,
      })),
    [flattenedNodes, nodeRenderers]
  )

  const flowEdges = useMemo<FlowEdge<GraphEdgeData>[]>(
    () =>
      positionedEdges.map((edge) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        type: 'graphEdge',
        data: { edge: edge as PositionedEdge },
        selectable: false,
        focusable: false,
        animated: false,
      })),
    [positionedEdges]
  )

  const reactFlow = useReactFlow()

  const minZoom = useMemo(() => {
    if (!measurementsReady) {
      return minScaleMinimum ? Math.min(minScaleMinimum, maxScale) : 0.1
    }

    const totalWidth = contentWidth + padding * 2 || contentWidth || 1
    const totalHeight = contentHeight + padding * 2 || contentHeight || 1
    const widthRatio = measuredWidth / totalWidth
    const heightRatio = measuredHeight / totalHeight
    const fitScale = Math.min(widthRatio, heightRatio, maxScale)
    const normalized = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1
    const limit = minScaleMinimum ? Math.min(normalized, minScaleMinimum) : normalized
    return clamp(limit, 0.05, maxScale)
  }, [
    measurementsReady,
    measuredWidth,
    measuredHeight,
    contentWidth,
    contentHeight,
    padding,
    maxScale,
    minScaleMinimum,
  ])

  useEffect(() => {
    if (!measurementsReady || !flowNodes.length) return

    reactFlow.fitView({ padding, duration: 0 })
  }, [measurementsReady, flowNodes.length, reactFlow, padding])

  useEffect(() => {
    if (!measurementsReady) return

    const fitContent = () => {
      if (!flowNodes.length) return
      reactFlow.fitView({ padding, duration: 300 })
    }

    const fitExtent = (extent: Extent, zoomIn = true) => {
      if (!flowNodes.length) return
      const viewport = reactFlow.getViewport()
      const { width, height } = getExtentSize(extent)
      const paddedWidth = width + padding * 2 || width || 1
      const paddedHeight = height + padding * 2 || height || 1
      const scaleX = measuredWidth / paddedWidth
      const scaleY = measuredHeight / paddedHeight
      const targetZoom = clamp(
        Math.min(scaleX, scaleY),
        minZoom,
        zoomIn ? maxScale : viewport.zoom
      )
      const center = getExtentCenter(extent)
      reactFlow.setCenter(center.x, center.y, { zoom: targetZoom, duration: 300 })
    }

    const centerOnExtent = (extent: Extent, k?: number) => {
      if (!flowNodes.length) return
      const viewport = reactFlow.getViewport()
      const zoom = clamp(k ?? viewport.zoom, minZoom, maxScale)
      const center = getExtentCenter(extent)
      reactFlow.setCenter(center.x, center.y, { zoom, duration: 300 })
    }

    const scaleZoom = (factor = 1) => {
      if (!flowNodes.length || factor === 1) return
      const viewport = reactFlow.getViewport()
      const targetZoom = clamp(viewport.zoom * factor, minZoom, maxScale)
      if (targetZoom === viewport.zoom) return
      const centerX = (measuredWidth / 2 - viewport.x) / viewport.zoom
      const centerY = (measuredHeight / 2 - viewport.y) / viewport.zoom
      reactFlow.setCenter(centerX, centerY, { zoom: targetZoom, duration: 200 })
    }

    const resetZoom = () => {
      fitContent()
    }

    const centerOnPositionedNode = (nodeId: string, k?: number) => {
      const node = nodeLookup.get(nodeId)
      if (!node) return
      centerOnExtent(getNodeExtent(node), k ?? maxScale)
    }

    const controls: ZoomPanControls = {
      fitContent,
      fitExtent,
      centerOnExtent,
      scaleZoom,
      resetZoom,
      centerOnPositionedNode,
    }

    setZoomPanControls(controls)
  }, [
    flowNodes.length,
    maxScale,
    measuredHeight,
    measuredWidth,
    minZoom,
    nodeLookup,
    padding,
    reactFlow,
    setZoomPanControls,
    measurementsReady,
  ])

  const nodeTypes = useMemo(() => ({ graphNode: GraphNodeComponent }), [])
  const edgeTypes = useMemo(() => ({ graphEdge: GraphEdge }), [])

  const shouldRenderGraph = measuredWidth > 0 && measuredHeight > 0

  return (
    <Box
      width='100%'
      height='100%'
      ref={containerRef}
      position='relative'
      sx={{ backgroundColor: backgroundColor ?? undefined }}
    >
      {emptyMessage && !isRendering && !flowNodes.length && (
        <Box
          position='absolute'
          top={0}
          left={0}
          right={0}
          bottom={0}
          display='flex'
          alignItems='center'
          justifyContent='center'
          sx={{ pointerEvents: 'none' }}
        >
          <Typography color='text.secondary'>{emptyMessage}</Typography>
        </Box>
      )}
      {shouldRenderGraph && (
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding }}
          minZoom={minZoom}
          maxZoom={maxScale}
          zoomOnScroll={!disableZoomPan}
          zoomOnPinch={!disableZoomPan}
          zoomOnDoubleClick={!disableZoomPan}
          panOnDrag={!disableZoomPan}
          panOnScroll={!disableZoomPan}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          style={{ width: '100%', height: '100%' }}
        >
          {!hideDotGrid && <Background color={dotGridColor} />}
          {miniMapPlacement !== MiniMapPlacement.None && (
            <MiniMap
              position={miniMapPlacement as Exclude<MiniMapPlacement, MiniMapPlacement.None> as Position}
              pannable
              zoomable
            />
          )}
        </ReactFlow>
      )}
      {isRendering && (
        <Box position='absolute' bottom={0} left={0} right={0}>
          <LinearProgress />
        </Box>
      )}
    </Box>
  )
}

export const Graph = <K, D>(props: Props<K, D>) => (
  <ReactFlowProvider>
    <GraphInner {...props} />
  </ReactFlowProvider>
)

