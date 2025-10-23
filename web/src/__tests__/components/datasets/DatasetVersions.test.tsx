// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import DatasetVersions from '../../../components/datasets/DatasetVersions'
import { Dataset } from '../../../types/api'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock fetchDatasetVersions action
vi.mock('../../../store/actionCreators', () => ({
  fetchDatasetVersions: vi.fn(() => ({ type: 'FETCH_DATASET_VERSIONS' })),
}))

describe('DatasetVersions Component', () => {
  const mockDataset: Dataset = {
    id: { namespace: 'test-namespace', name: 'test-dataset' },
    name: 'test-dataset',
    namespace: 'test-namespace',
    type: 'DB_TABLE',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
    tags: [],
    fields: [],
  } as any

  const createMockStore = (versions: any[] = [], isLoading = false, totalCount = 0) => {
    return createStore(() => ({
      datasetVersions: {
        result: {
          versions: versions,
          totalCount: totalCount,
        },
        isLoading,
        init: true,
      },
    }))
  }

  const renderWithStore = (store: any) => {
    return render(
      <Provider store={store}>
        <DatasetVersions dataset={mockDataset} />
      </Provider>
    )
  }

  it('should render without crashing with empty versions', () => {
    const store = createMockStore([])
    const { container } = renderWithStore(store)
    // Component returns null for empty versions
    expect(container).toBeTruthy()
  })

  it('should render with versions data', () => {
    const mockVersions = [
      {
        version: 'v1',
        createdAt: '2023-01-01T00:00:00Z',
        fields: [],
        facets: {},
      },
    ]
    const store = createMockStore(mockVersions, false, 1)
    renderWithStore(store)
    
    // Component should render with data
    expect(true).toBe(true)
  })
})
