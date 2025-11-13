// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter, Route, Routes, useLocation, type Location } from 'react-router-dom'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'redux'
import { fireEvent, render, screen } from '@testing-library/react'
import ColumnLevelDrawer from '../../../routes/column-level/ColumnLevelDrawer'
import React from 'react'
import type { ColumnLineageGraph, Dataset } from '../../../types/api'

const { fetchDatasetMock, jsonViewMock } = vi.hoisted(() => ({
  fetchDatasetMock: vi.fn((namespace: string, datasetName: string) => ({
    type: 'FETCH_DATASET',
    namespace,
    datasetName,
  })),
  jsonViewMock: vi.fn((props: { data: unknown }) => props),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('../../../components/core/json-view/MqJsonView', () => ({
  __esModule: true,
  default: (props: { data: unknown }) => {
    jsonViewMock(props)
    return <div data-testid='json-view' />
  },
}))

vi.mock('../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('../../../store/actionCreators', async () => {
  const actual = await vi.importActual<typeof import('../../../store/actionCreators')>(
    '../../../store/actionCreators'
  )

  return {
    ...actual,
    fetchDataset: (...args: Parameters<typeof actual.fetchDataset>) =>
      fetchDatasetMock(...(args as Parameters<typeof fetchDatasetMock>)),
  }
})

const LocationSpy = ({ onChange }: { onChange: (location: Location) => void }) => {
  const location = useLocation()
  React.useEffect(() => {
    onChange(location)
  }, [location, onChange])
  return null
}

const renderDrawer = (
  state: {
    columnLineage: ColumnLineageGraph | null
    dataset: Dataset | null
    isDatasetLoading: boolean
  },
  initialEntry: string = '/column-level/analytics/users?dataset=users&namespace=analytics'
) => {
  const store = createStore(() => ({
    columnLineage: { columnLineage: state.columnLineage },
    dataset: { result: state.dataset, isLoading: state.isDatasetLoading },
  }))
  store.dispatch = vi.fn()
  const theme = createTheme()
  const locationRef: { current: Location | null } = { current: null }

  const ui = render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route
              path='/column-level/:namespace/:name'
              element={
                <>
                  <LocationSpy onChange={(location) => (locationRef.current = location)} />
                  <ColumnLevelDrawer />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  )

  return { store, locationRef, ...ui }
}

beforeEach(() => {
  fetchDatasetMock.mockClear()
  jsonViewMock.mockClear()
})

describe('ColumnLevelDrawer', () => {
  it('returns null when column lineage is unavailable', () => {
    const { store } = renderDrawer(
      { columnLineage: null, dataset: null, isDatasetLoading: false },
      '/column-level/analytics/users'
    )
    expect(store.dispatch).not.toHaveBeenCalled()
    expect(screen.queryByTestId('json-view')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('dispatches fetchDataset when dataset search params are present', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    const { store } = renderDrawer({ columnLineage, dataset: null, isDatasetLoading: true })

    expect(fetchDatasetMock).toHaveBeenCalledWith('analytics', 'users')
    expect(store.dispatch).toHaveBeenCalledWith({
      type: 'FETCH_DATASET',
      namespace: 'analytics',
      datasetName: 'users',
    })
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders schema details and facets when dataset information is loaded', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    const dataset = {
      name: 'users',
      columnLineage: { lineage: 'data' },
      fields: [
        { name: 'email', type: 'string', description: 'user email', tags: [] },
      ],
    } as unknown as Dataset

    renderDrawer({ columnLineage, dataset, isDatasetLoading: false })

    expect(screen.getByText('dataset_info_columns.name')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('user email')).toBeInTheDocument()
    expect(jsonViewMock).toHaveBeenCalledWith({ data: dataset.columnLineage })
  })

  it('clears the search params when the close button is clicked', () => {
    const columnLineage = { graph: [] } as unknown as ColumnLineageGraph
    const dataset = {
      name: 'users',
      columnLineage: null,
      fields: [],
    } as unknown as Dataset
    const { locationRef } = renderDrawer({ columnLineage, dataset, isDatasetLoading: false })

    fireEvent.click(screen.getByRole('button'))
    expect(locationRef.current?.search).toBe('')
  })
})
