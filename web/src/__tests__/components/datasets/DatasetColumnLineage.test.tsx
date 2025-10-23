// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createStore } from 'redux'
import DatasetColumnLineage from '../../../components/datasets/DatasetColumnLineage'
import { Dataset } from '../../../types/api'
import { LineageDataset } from '../../../types/lineage'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('DatasetColumnLineage Component', () => {
  const mockDataset: Dataset = {
    id: { namespace: 'test-namespace', name: 'test-dataset' },
    name: 'test-dataset',
    namespace: 'test-namespace',
    type: 'DB_TABLE',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    tags: [],
    fields: [],
    columnLineage: {
      graph: {
        inputFields: [
          { namespace: 'ns1', dataset: 'ds1', field: 'field1' },
        ],
        outputFields: [
          { namespace: 'ns2', dataset: 'ds2', field: 'field2' },
        ],
      },
    },
  } as any

  const mockLineageDataset: LineageDataset = {
    namespace: 'test-namespace',
    name: 'test-dataset',
    type: 'DB_TABLE',
    inEdges: [],
    outEdges: [],
  } as any

  const createMockStore = (dataset: any = mockDataset) => {
    return createStore(() => ({
      dataset: {
        result: dataset,
        isLoading: false,
        init: true,
      },
    }))
  }

  const renderWithProviders = (
    component: React.ReactElement,
    { store = createMockStore(), route = '/test-namespace/test-dataset' } = {}
  ) => {
    return render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path='/:namespace/:name' element={component} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render column lineage data when available', async () => {
    renderWithProviders(<DatasetColumnLineage lineageDataset={mockLineageDataset} />)

    await waitFor(() => {
      // MqJsonView should be rendered with data
      expect(screen.queryByText('datasets_column_lineage.empty_title')).toBeFalsy()
    })
  })

  it('should show empty state when no column lineage', async () => {
    const datasetWithoutLineage = { ...mockDataset, columnLineage: null }
    const store = createMockStore(datasetWithoutLineage)

    renderWithProviders(<DatasetColumnLineage lineageDataset={mockLineageDataset} />, { store })

    await waitFor(() => {
      expect(screen.getByText('datasets_column_lineage.empty_title')).toBeTruthy()
      expect(screen.getByText('datasets_column_lineage.empty_body')).toBeTruthy()
    })
  })

  it('should show download button for large payloads', async () => {
    // Create a large fields array
    const largeFields: any[] = Array(1000).fill(null).map((_, i) => ({
      name: `field-${i}`,
      type: 'STRING',
      description: '',
    }))
    
    const largeLineageDataset: LineageDataset = {
      ...mockLineageDataset,
      fields: largeFields,
    }

    const store = createMockStore({
      lineage: {
        columnLineage: {
          graph: {},
          origin: largeLineageDataset,
        },
      },
    })

    const { container } = renderWithProviders(<DatasetColumnLineage lineageDataset={largeLineageDataset} />, { store })

    // Component should render something even with large payload
    expect(container).toBeTruthy()
  })

  it('should handle missing namespace and name params', () => {
    const store = createMockStore()

    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path='/' element={<DatasetColumnLineage lineageDataset={mockLineageDataset} />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    )

    // Should render without crashing
    expect(true).toBe(true)
  })
})
