import React, { Fragment } from 'react'

import type { NodeRenderer, PositionedEdge, PositionedNode } from '../../types'

interface Props<K, D> {
  node: PositionedNode<K, D>
  nodeRenderers: Map<K, NodeRenderer<K, D>>
  edges?: PositionedEdge[]
  isMiniMap?: boolean
}

export const Node = <K, D>({ node, nodeRenderers, isMiniMap }: Props<K, D>) => {
  const Renderer = nodeRenderers.get(node.kind)

  return (
    <Fragment>
      {Renderer ? <Renderer node={node} isMiniMap={isMiniMap} /> : null}
      {node.children?.map((child) => (
        <Node<K, D>
          node={child}
          nodeRenderers={nodeRenderers}
          key={child.id}
          isMiniMap={isMiniMap}
        />
      ))}
    </Fragment>
  )
}
