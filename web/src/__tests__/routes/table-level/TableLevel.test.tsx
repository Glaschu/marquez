// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'redux'
import { render, screen } from '@testing-library/react'
import React from 'react'
import TableLevel from '../../../routes/table-level/TableLevel'
import type { LineageGraph } from '../../../types/api'

const { fetchLineageMock, createElkNodesMock, graphRenderMock, zoomControls } = vi.hoisted(() => ({
  fetchLineageMock: vi.fn(
    (nodeType: string, namespace: string, name: string, depth: number) => ({
      type: 'FETCH_LINEAGE',
      nodeType,
      namespace,
      name,
      depth,
    })
  ),
  createElkNodesMock: vi.fn(() => ({
    nodes: [{ id: 'node-1' }],
    edges: [{ id: 'edge-1', source: 'node-1', target: 'node-1' }],
  })),
  graphRenderMock: vi.fn(),
  zoomControls: [] as Array<{
    scaleZoom: ReturnType<typeof vi.fn>
    fitContent: ReturnType<typeof vi.fn>
    centerOnPositionedNode: ReturnType<typeof vi.fn>
  }>,
}))

const buildZoomControls = () => {
  const controls = {
    scaleZoom: vi.fn(),
    fitContent: vi.fn(),
    centerOnPositionedNode: vi.fn(),
  }
  zoomControls.push(controls)
  return controls
}

vi.mock('../../../components/graph', () => ({
  DEFAULT_MAX_SCALE: 2,
  Graph: (props: any) => {
    graphRenderMock(props)
    if (props.setZoomPanControls) {
      props.setZoomPanControls(buildZoomControls())
    }
    return <div data-testid='graph' />
  },
  ZoomPanControls: class {},
}))

vi.mock('../../../routes/table-level/layout', () => ({
  createElkNodes: (...args: Parameters<typeof createElkNodesMock>) => createElkNodesMock(...args),
}))

vi.mock('../../../routes/column-level/ZoomControls', () => ({
  ZoomControls: () => <div data-testid='zoom-controls' />,
}))

vi.mock('../../../routes/table-level/TableLevelDrawer', () => ({
  __esModule: true,
  default: () => <div data-testid='table-level-drawer' />,
}))

vi.mock('@visx/responsive/lib/components/ParentSize', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) => (
    <div data-testid='parent-size'>{children({ width: 800, height: 600 })}</div>
  ),
}))

vi.mock('../../../store/actionCreators', async () => {
  const actual = await vi.importActual<typeof import('../../../store/actionCreators')>(
    '../../../store/actionCreators'
  )

  return {
    ...actual,
    fetchLineage: (...args: Parameters<typeof actual.fetchLineage>) => fetchLineageMock(...args),
  }
})

const renderTableLevel = (lineage: LineageGraph | null, initialEntry?: string) => {
  const theme = createTheme()
  const store = createStore(() => ({
    lineage: {
      lineage,
    },
  }))
  store.dispatch = vi.fn()

  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter
            initialEntries={[initialEntry ?? '/table-level/DATASET/analytics/daily-table?depth=2&isCompact=true']}
          >
            <Routes>
              <Route path='/table-level/:nodeType/:namespace/:name' element={<TableLevel />} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    ),
  }
}

beforeEach(() => {
  fetchLineageMock.mockClear()
  createElkNodesMock.mockClear()
  graphRenderMock.mockClear()
  zoomControls.length = 0
})

describe('TableLevel', () => {
  it('renders nothing when lineage data is not available', () => {
    renderTableLevel(null)

    expect(screen.queryByTestId('graph')).toBeNull()
    expect(createElkNodesMock).not.toHaveBeenCalled()
  })

  it('dispatches fetchLineage and renders the graph when lineage data is loaded', () => {
    vi.useFakeTimers()
    try {
      const lineage = { graph: {} } as unknown as LineageGraph
      const { store } = renderTableLevel(lineage)

      expect(fetchLineageMock).toHaveBeenCalledWith('DATASET', 'analytics', 'daily-table', 2)
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'FETCH_LINEAGE',
        nodeType: 'DATASET',
        namespace: 'analytics',
        name: 'daily-table',
        depth: 2,
      })

      expect(createElkNodesMock).toHaveBeenCalledWith(
        lineage,
        'DATASET:analytics:daily-table',
        true,
        false,
        null
      )

      expect(graphRenderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'column-level-graph',
          nodes: [{ id: 'node-1' }],
          edges: [{ id: 'edge-1', source: 'node-1', target: 'node-1' }],
        })
      )

      vi.runAllTimers()
      expect(zoomControls.length).toBeGreaterThan(0)
      expect(zoomControls[0].fitContent).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})
