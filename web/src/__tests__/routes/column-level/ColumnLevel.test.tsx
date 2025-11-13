// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'redux'
import { render, screen } from '@testing-library/react'
import ColumnLevel from '../../../routes/column-level/ColumnLevel'
import React from 'react'
import type { ColumnLineageGraph } from '../../../types/api'

const { fetchColumnLineageMock, createElkNodesMock, graphRenderMock, zoomControls, zoomProps } =
  vi.hoisted(() => ({
    fetchColumnLineageMock: vi.fn(
      (nodeType: string, namespace: string, name: string, depth: number) => ({
        type: 'FETCH_COLUMN_LINEAGE',
        nodeType,
        namespace,
        name,
        depth,
      })
    ),
    createElkNodesMock: vi.fn(() => ({
      nodes: [{ id: 'node-1' }],
      edges: [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-1' }],
    })),
    graphRenderMock: vi.fn(),
    zoomControls: [] as Array<{
      scaleZoom: ReturnType<typeof vi.fn>
      fitContent: ReturnType<typeof vi.fn>
    }>,
    zoomProps: [] as Array<{ handleScaleZoom: (dir: 'in' | 'out') => void; handleResetZoom: () => void }>,
  }))

const buildZoomControls = () => {
  const controls = {
    scaleZoom: vi.fn(),
    fitContent: vi.fn(),
  }
  zoomControls.push(controls)
  return controls
}

vi.mock('../../../components/graph', () => ({
  Graph: (props: any) => {
    graphRenderMock(props)
    props.setZoomPanControls?.(buildZoomControls())
    return <div data-testid='graph' />
  },
  ZoomPanControls: class {},
}))

vi.mock('../../../routes/column-level/layout', () => ({
  createElkNodes: (...args: Parameters<typeof createElkNodesMock>) => createElkNodesMock(...args),
}))

vi.mock('../../../routes/column-level/ZoomControls', () => ({
  ZoomControls: (props: { handleScaleZoom: (dir: 'in' | 'out') => void; handleResetZoom: () => void }) => {
    zoomProps.push(props)
    return <div data-testid='zoom-controls' />
  },
}))

vi.mock('../../../routes/column-level/ColumnLevelDrawer', () => ({
  __esModule: true,
  default: () => <div data-testid='column-level-drawer' />,
}))

vi.mock('@visx/responsive/lib/components/ParentSize', () => ({
  __esModule: true,
  default: ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) => (
    <div data-testid='parent-size'>{children({ width: 800, height: 600 })}</div>
  ),
}))

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material')

  return {
    ...actual,
    Drawer: ({
      open,
      onClose,
      children,
    }: {
      open: boolean
      onClose: () => void
      children: React.ReactNode
    }) => (
      <div data-testid='mui-drawer' data-open={open} onClick={onClose}>
        {open ? children : null}
      </div>
    ),
  }
})

vi.mock('../../../store/actionCreators', async () => {
  const actual = await vi.importActual<typeof import('../../../store/actionCreators')>(
    '../../../store/actionCreators'
  )

  return {
    ...actual,
    fetchColumnLineage: (...args: Parameters<typeof actual.fetchColumnLineage>) =>
      fetchColumnLineageMock(...(args as Parameters<typeof fetchColumnLineageMock>)),
  }
})

const LocationSpy = ({ onChange }: { onChange: (location: Location) => void }) => {
  const location = useLocation()
  React.useEffect(() => {
    onChange(location)
  }, [location, onChange])
  return null
}

const renderColumnLevel = (columnLineage: ColumnLineageGraph | null, initialEntry?: string) => {
  const theme = createTheme()
  const store = createStore(() => ({
    columnLineage: {
      columnLineage,
    },
  }))
  store.dispatch = vi.fn()
  const locationRef: { current: Location | null } = { current: null }

  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[initialEntry ?? '/column-level/analytics/users?depth=2']}>
          <Routes>
            <Route
              path='/column-level/:namespace/:name'
              element={
                <>
                  <LocationSpy onChange={(location) => (locationRef.current = location)} />
                  <ColumnLevel />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  )

  return { store, locationRef }
}

beforeEach(() => {
  fetchColumnLineageMock.mockClear()
  createElkNodesMock.mockClear()
  graphRenderMock.mockClear()
  zoomControls.length = 0
  zoomProps.length = 0
})

describe('ColumnLevel', () => {
  it('dispatches fetchColumnLineage but renders nothing when lineage is missing', () => {
    const { store } = renderColumnLevel(null)

    expect(fetchColumnLineageMock).toHaveBeenCalledWith('DATASET', 'analytics', 'users', 2)
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'FETCH_COLUMN_LINEAGE',
      nodeType: 'DATASET',
      namespace: 'analytics',
      name: 'users',
      depth: 2,
    })
    expect(graphRenderMock).not.toHaveBeenCalled()
  })

  it('renders the graph, wires zoom controls, and closes the drawer on request', () => {
    vi.useFakeTimers()
    try {
      const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
      const { store, locationRef } = renderColumnLevel(
        columnLineage,
        '/column-level/analytics/users?depth=4&column=datasetField:analytics:users:email&dataset=orders&namespace=analytics'
      )

      expect(fetchColumnLineageMock).toHaveBeenCalledWith('DATASET', 'analytics', 'users', 4)
      expect(store.dispatch).toHaveBeenCalledWith({
        type: 'FETCH_COLUMN_LINEAGE',
        nodeType: 'DATASET',
        namespace: 'analytics',
        name: 'users',
        depth: 4,
      })

      expect(createElkNodesMock).toHaveBeenCalledWith(
        columnLineage,
        'datasetField:analytics:users:email'
      )
      expect(graphRenderMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'column-level-graph',
          nodes: [{ id: 'node-1' }],
          edges: [{ id: 'edge-1', sourceNodeId: 'node-1', targetNodeId: 'node-1' }],
        })
      )

      expect(screen.getByTestId('mui-drawer')).toHaveAttribute('data-open', 'true')
      screen.getByTestId('mui-drawer').click()

      expect(zoomProps).toHaveLength(1)
      const controls = zoomControls[0]
      zoomProps[0].handleScaleZoom('in')
      zoomProps[0].handleScaleZoom('out')
      zoomProps[0].handleResetZoom()

      expect(controls.scaleZoom).toHaveBeenNthCalledWith(1, 1.5)
      expect(controls.scaleZoom).toHaveBeenNthCalledWith(2, 1 / 1.5)

      vi.runAllTimers()
      expect(controls.fitContent).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
