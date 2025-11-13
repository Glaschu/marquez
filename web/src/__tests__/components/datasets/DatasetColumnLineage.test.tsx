// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createStore } from 'redux'

import DatasetColumnLineage from '../../../components/datasets/DatasetColumnLineage'
import type { Dataset } from '../../../types/api'
import type { LineageDataset } from '../../../types/lineage'

const {
  fetchDatasetMock,
  resetDatasetMock,
  fileSizeMock,
  saveAsMock,
} = vi.hoisted(() => {
  const fetchDatasetMock = vi.fn((namespace: string, name: string) => ({
    type: 'FETCH_DATASET',
    namespace,
    name,
  }))
  const resetDatasetMock = vi.fn(() => ({ type: 'RESET_DATASET' }))
  const fileSizeMock = vi.fn((payload: string) => ({ kiloBytes: payload.length, megaBytes: payload.length / 1024 }))
  const saveAsMock = vi.fn()

  return {
    fetchDatasetMock,
    resetDatasetMock,
    fileSizeMock,
    saveAsMock,
  }
})

vi.mock('../../../store/actionCreators', () => ({
  fetchDataset: (...args: Parameters<typeof fetchDatasetMock>) => fetchDatasetMock(...args),
  resetDataset: () => resetDatasetMock(),
}))

vi.mock('../../../helpers', () => ({
  fileSize: (...args: Parameters<typeof fileSizeMock>) => fileSizeMock(...args),
}))

vi.mock('file-saver', () => ({
  saveAs: (...args: Parameters<typeof saveAsMock>) => saveAsMock(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../components/core/json-view/MqJsonView', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown }) => (
    <div data-testid='mq-json-view'>{JSON.stringify(data)}</div>
  ),
}))

vi.mock('../../../components/core/empty/MqEmpty', () => ({
  __esModule: true,
  default: ({ title, body, children }: { title?: React.ReactNode; body?: React.ReactNode; children?: React.ReactNode }) => (
    <div data-testid='mq-empty'>
      <div>{title}</div>
      <div>{body}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({ children, subdued }: { children: React.ReactNode; subdued?: boolean }) => (
    <span data-subdued={subdued}>{children}</span>
  ),
}))

const lineageDataset: LineageDataset = {
  namespace: 'analytics',
  name: 'orders',
  type: 'DB_TABLE',
  inEdges: [],
  outEdges: [],
} as LineageDataset

const makeDataset = (overrides: Partial<Dataset> = {}): Dataset => ({
  id: { namespace: 'analytics', name: 'orders' },
  type: 'DB_TABLE',
  name: 'orders',
  physicalName: 'orders',
  createdAt: '',
  updatedAt: '',
  namespace: 'analytics',
  sourceName: 'warehouse',
  fields: [],
  tags: [],
  lastModifiedAt: '',
  description: '',
  facets: {},
  deleted: false,
  columnLineage: {
    graph: {
      nodes: [],
    },
  },
  ...overrides,
})

const renderDatasetColumnLineage = (
  stateOverride: Partial<{
    dataset: {
      result: Dataset | null
    }
  }> = {},
  options: { route?: string } = {}
) => {
  const baseState = {
    dataset: {
      result: makeDataset(),
    },
  }

  const mergedState = {
    ...baseState,
    ...stateOverride,
    dataset: {
      ...baseState.dataset,
      ...(stateOverride.dataset ?? {}),
    },
  }

  const store = createStore(() => mergedState)
  const dispatchSpy = vi.fn((action) => action)
  store.dispatch = dispatchSpy as unknown as typeof store.dispatch

  const route = options.route ?? '/analytics/orders'

  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path='/:namespace/:name' element={<DatasetColumnLineage lineageDataset={lineageDataset} />} />
            <Route path='/' element={<DatasetColumnLineage lineageDataset={lineageDataset} />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  )

  return { ...utils, dispatchSpy }
}

beforeEach(() => {
  fetchDatasetMock.mockClear()
  resetDatasetMock.mockClear()
  fileSizeMock.mockClear()
  saveAsMock.mockClear()
})

describe('DatasetColumnLineage', () => {
  it('fetches dataset on mount, renders json, and resets on unmount', () => {
    const columnLineage = { graph: { edges: [] } }
    const { unmount, dispatchSpy } = renderDatasetColumnLineage({
      dataset: {
        result: makeDataset({ columnLineage }),
      },
    })

    expect(fetchDatasetMock).toHaveBeenCalledWith('analytics', 'orders')
    expect(screen.getByTestId('mq-json-view')).toHaveTextContent(JSON.stringify(columnLineage))

    unmount()
    expect(resetDatasetMock).toHaveBeenCalledTimes(1)
    expect(dispatchSpy.mock.calls.at(-1)?.[0]).toEqual({ type: 'RESET_DATASET' })
  })

  it('renders empty state when column lineage is missing', () => {
    renderDatasetColumnLineage({
      dataset: {
        result: makeDataset({ columnLineage: null as unknown as Dataset['columnLineage'] }),
      },
    })

    expect(screen.getByTestId('mq-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('mq-json-view')).toBeNull()
  })

  it('shows download option for large payloads and saves file', () => {
    fileSizeMock.mockReturnValueOnce({ kiloBytes: 501, megaBytes: 0.49 })

    renderDatasetColumnLineage({
      dataset: {
        result: makeDataset({ columnLineage: { graph: { nodes: [1, 2, 3] } } }),
      },
    })

    const downloadButton = screen.getByRole('button', { name: 'Download payload' })
    fireEvent.click(downloadButton)
    expect(saveAsMock).toHaveBeenCalledTimes(1)

    const [blob, fileName] = saveAsMock.mock.calls[0]
    expect(blob).toBeInstanceOf(Blob)
    expect(fileName).toBe('orders-analytics-columnLineage.json')
  })

  it('does not fetch dataset when namespace or name missing', () => {
    renderDatasetColumnLineage({}, { route: '/' })
    expect(fetchDatasetMock).not.toHaveBeenCalled()
  })
})
