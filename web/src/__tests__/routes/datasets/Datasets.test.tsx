// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createStore } from 'redux'

import Datasets from '../../../routes/datasets/Datasets'
import type { Assertion, Dataset } from '../../../types/api'

const {
  fetchDatasetsMock,
  resetDatasetsMock,
  datasetFacetsQualityAssertionsMock,
  datasetFacetsStatusMock,
  encodeNodeMock,
  formatUpdatedAtMock,
  truncateTextMock,
  assertionsRegistry,
  statusRegistry,
} = vi.hoisted(() => {
  const fetchDatasetsMock = vi.fn(
    (namespace: string, limit: number, offset: number) => ({
      type: 'FETCH_DATASETS',
      namespace,
      limit,
      offset,
    })
  )

  const resetDatasetsMock = vi.fn(() => ({ type: 'RESET_DATASETS' }))

  const assertionsRegistry = new Map<unknown, Assertion[]>()
  const statusRegistry = new Map<unknown, string | undefined>()

  const datasetFacetsQualityAssertionsMock = vi.fn((facets: unknown) => {
    const assertions = assertionsRegistry.get(facets)
    return Array.isArray(assertions) ? assertions : []
  })

  const datasetFacetsStatusMock = vi.fn((facets: unknown) => statusRegistry.get(facets))

  const encodeNodeMock = vi.fn((type: string, namespace: string, name: string) =>
    `${type}:${namespace}:${name}`
  )

  const formatUpdatedAtMock = vi.fn((value: string) => `formatted(${value})`)

  const truncateTextMock = vi.fn((value: string) => value)

  return {
    fetchDatasetsMock,
    resetDatasetsMock,
    datasetFacetsQualityAssertionsMock,
    datasetFacetsStatusMock,
    encodeNodeMock,
    formatUpdatedAtMock,
    truncateTextMock,
    assertionsRegistry,
    statusRegistry,
  }
})

vi.mock('../../../store/actionCreators', () => ({
  fetchDatasets: (...args: Parameters<typeof fetchDatasetsMock>) => fetchDatasetsMock(...args),
  resetDatasets: () => resetDatasetsMock(),
}))

vi.mock('../../../helpers/nodes', () => ({
  datasetFacetsQualityAssertions: (...args: Parameters<typeof datasetFacetsQualityAssertionsMock>) =>
    datasetFacetsQualityAssertionsMock(...args),
  datasetFacetsStatus: (...args: Parameters<typeof datasetFacetsStatusMock>) =>
    datasetFacetsStatusMock(...args),
  encodeNode: (...args: Parameters<typeof encodeNodeMock>) => encodeNodeMock(...args),
}))

vi.mock('../../../helpers', () => ({
  formatUpdatedAt: (...args: Parameters<typeof formatUpdatedAtMock>) => formatUpdatedAtMock(...args),
}))

vi.mock('../../../helpers/text', () => ({
  truncateText: (...args: Parameters<typeof truncateTextMock>) => truncateTextMock(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../components/core/screen-load/MqScreenLoad', () => ({
  MqScreenLoad: ({
    loading,
    children,
  }: {
    loading: boolean
    children: React.ReactElement
  }) => (
    <div data-testid='screen-load' data-loading={loading}>
      {children}
    </div>
  ),
}))

vi.mock('../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({
    children,
    link,
    linkTo,
  }: {
    children: React.ReactNode
    link?: boolean
    linkTo?: string
  }) =>
    link ? (
      <a href={linkTo} data-testid={linkTo ? `mq-text-link-${linkTo}` : undefined}>
        {children}
      </a>
    ) : (
      <span>{children}</span>
    ),
}))

vi.mock('../../../components/core/status/MqStatus', () => ({
  __esModule: true,
  default: ({ label, color }: { label: string; color?: string }) => (
    <span data-testid='mq-status' data-label={label} data-color={color}>
      {label}
    </span>
  ),
}))

vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div data-testid={title === 'Refresh' ? 'tooltip-Refresh' : undefined}>
      {children}
      {title === 'Refresh' ? <span>{title}</span> : null}
    </div>
  ),
}))

vi.mock('../../../components/core/empty/MqEmpty', () => ({
  __esModule: true,
  default: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div data-testid='mq-empty'>
      <div>{title}</div>
      <div>{children}</div>
    </div>
  ),
}))

vi.mock('../../../components/paging/MqPaging', () => ({
  __esModule: true,
  default: ({
    currentPage,
    incrementPage,
    decrementPage,
  }: {
    currentPage: number
    incrementPage: () => void
    decrementPage: () => void
  }) => (
    <div data-testid='paging'>
      <button data-testid='paging-next' type='button' onClick={incrementPage}>
        next
      </button>
      <button data-testid='paging-prev' type='button' onClick={decrementPage}>
        prev
      </button>
      <span data-testid='paging-page'>{currentPage}</span>
    </div>
  ),
}))

vi.mock('../../../components/namespace-select/NamespaceSelect', () => ({
  __esModule: true,
  default: () => <div data-testid='namespace-select'>namespace-select</div>,
}))

vi.mock('../../../components/datasets/Assertions', () => ({
  __esModule: true,
  default: ({ assertions }: { assertions: unknown[] }) => (
    <div data-testid='assertions'>{JSON.stringify(assertions)}</div>
  ),
}))

type RouteState = {
  datasets: {
    result: Dataset[]
    totalCount: number
    isLoading: boolean
    init: boolean
  }
  namespaces: {
    selectedNamespace: string | null
  }
}

const renderDatasetsRoute = (stateOverride: Partial<RouteState> = {}) => {
  const baseState: RouteState = {
    datasets: {
      result: [],
      totalCount: 0,
      isLoading: false,
      init: true,
    },
    namespaces: {
      selectedNamespace: 'analytics',
    },
  }

  const mergedState: RouteState = {
    ...baseState,
    ...stateOverride,
    datasets: {
      ...baseState.datasets,
      ...(stateOverride.datasets ?? {}),
    },
    namespaces: {
      ...baseState.namespaces,
      ...(stateOverride.namespaces ?? {}),
    },
  }

  const store = createStore(() => mergedState)
  const dispatchSpy = vi.fn((action) => action)
  store.dispatch = dispatchSpy as unknown as typeof store.dispatch

  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter initialEntries={['/datasets']}>
          <Datasets />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  )

  return { store, dispatchSpy, ...utils }
}

const makeDataset = (overrides: Partial<Dataset>): Dataset => ({
  id: {
    namespace: 'default-namespace',
    name: 'default-name',
  },
  type: 'DB_TABLE',
  name: 'default-name',
  physicalName: 'physical',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  namespace: 'default-namespace',
  sourceName: 'default-source',
  fields: [],
  tags: [],
  lastModifiedAt: '2024-01-01T00:00:00Z',
  description: 'desc',
  facets: {},
  deleted: false,
  columnLineage: [] as unknown as Dataset['columnLineage'],
  ...overrides,
})

beforeEach(() => {
  fetchDatasetsMock.mockClear()
  resetDatasetsMock.mockClear()
  datasetFacetsQualityAssertionsMock.mockClear()
  datasetFacetsStatusMock.mockClear()
  encodeNodeMock.mockClear()
  formatUpdatedAtMock.mockClear()
  truncateTextMock.mockClear()
  assertionsRegistry.clear()
  statusRegistry.clear()
  ;(window as unknown as { scrollTo: () => void }).scrollTo = vi.fn()
})

describe('Datasets route', () => {
  it('renders empty state, refreshes, and cleans up', () => {
    const { unmount, dispatchSpy } = renderDatasetsRoute({
      datasets: {
        result: [],
        totalCount: 0,
        isLoading: true,
        init: false,
      },
    })

    expect(fetchDatasetsMock).toHaveBeenCalledTimes(1)
    expect(fetchDatasetsMock).toHaveBeenCalledWith('analytics', 20, 0)

    expect(screen.getByTestId('screen-load')).toHaveAttribute('data-loading', 'true')
    expect(screen.getByTestId('mq-empty')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    const refreshIcon = within(screen.getByTestId('tooltip-Refresh')).getByRole('button')
    fireEvent.click(refreshIcon)
    expect(fetchDatasetsMock).toHaveBeenCalledTimes(2)
    expect(fetchDatasetsMock.mock.calls[1]).toEqual(['analytics', 20, 0])

    const emptyRefreshButton = within(screen.getByTestId('mq-empty')).getByRole('button', {
      name: 'Refresh',
    })
    fireEvent.click(emptyRefreshButton)
    expect(fetchDatasetsMock).toHaveBeenCalledTimes(3)
    expect(fetchDatasetsMock.mock.calls[2]).toEqual(['analytics', 20, 0])

    expect((window as unknown as { scrollTo: () => void }).scrollTo).not.toHaveBeenCalled()

    unmount()
    expect(resetDatasetsMock).toHaveBeenCalledTimes(1)
    expect(dispatchSpy.mock.calls).toHaveLength(4)
    expect(dispatchSpy.mock.calls.at(-1)?.[0]).toEqual({ type: 'RESET_DATASETS' })
  })

  it('renders datasets table, derives status, and paginates', () => {
    const facetsA = { id: 'facets-a' }
    const facetsB = { id: 'facets-b' }
    const facetsC = { id: 'facets-c' }
    const facetsDeleted = { id: 'facets-deleted' }

    assertionsRegistry.set(facetsA, [
      { assertion: 'a', column: 'col', success: false },
      { assertion: 'b', column: 'col', success: true },
    ])
    assertionsRegistry.set(facetsB, [
      { assertion: 'c', column: 'col', success: true },
    ])
    assertionsRegistry.set(facetsC, [])

    statusRegistry.set(facetsA, 'green')
    statusRegistry.set(facetsB, 'blue')

    const datasetA = makeDataset({
      id: { namespace: 'analytics', name: 'orders' },
      name: 'orders',
      namespace: 'analytics',
      sourceName: 'warehouse',
      updatedAt: '2024-02-01T00:00:00Z',
      facets: facetsA,
      columnLineage: [
        {
          name: 'col',
          inputFields: [],
          transformationDescription: null,
          transformationType: null,
        },
      ] as unknown as Dataset['columnLineage'],
    })

    const datasetB = makeDataset({
      id: { namespace: 'sales', name: 'customers' },
      name: 'customers',
      namespace: 'sales',
      sourceName: 'crm',
      updatedAt: '2024-03-01T00:00:00Z',
      facets: facetsB,
      columnLineage: [] as unknown as Dataset['columnLineage'],
    })

    const datasetC = makeDataset({
      id: { namespace: 'marketing', name: 'campaigns' },
      name: 'campaigns',
      namespace: 'marketing',
      sourceName: 'ads',
      updatedAt: '2024-04-01T00:00:00Z',
      facets: facetsC,
      columnLineage: null as unknown as Dataset['columnLineage'],
    })

    const datasetDeleted = makeDataset({
      id: { namespace: 'legacy', name: 'old' },
      name: 'old',
      namespace: 'legacy',
      facets: facetsDeleted,
      deleted: true,
      columnLineage: null as unknown as Dataset['columnLineage'],
    })

    const { unmount, dispatchSpy } = renderDatasetsRoute({
      datasets: {
        result: [datasetA, datasetB, datasetC, datasetDeleted],
        totalCount: 4,
        isLoading: false,
        init: true,
      },
    })

  expect(fetchDatasetsMock).toHaveBeenCalledTimes(1)
  expect(fetchDatasetsMock.mock.calls[0]).toEqual(['analytics', 20, 0])
    expect(screen.getByTestId('screen-load')).toHaveAttribute('data-loading', 'false')
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.getByText('4 total')).toBeInTheDocument()
    expect(screen.getByTestId('namespace-select')).toBeInTheDocument()

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)

    const ordersRow = rows.find((row) => within(row).queryByText('orders'))
    const customersRow = rows.find((row) => within(row).queryByText('customers'))
    const campaignsRow = rows.find((row) => within(row).queryByText('campaigns'))
    expect(ordersRow).toBeDefined()
    expect(customersRow).toBeDefined()
    expect(campaignsRow).toBeDefined()

    expect(within(ordersRow!).getByRole('link', { name: 'orders' })).toBeInTheDocument()
    expect(within(ordersRow!).getByRole('link', { name: 'VIEW' })).toHaveAttribute(
      'href',
      expect.stringContaining('column-level')
    )
    expect(within(customersRow!).getAllByTestId('mq-status')[0]).toHaveAttribute('data-label', 'HEALTHY')
  expect(within(ordersRow!).getAllByTestId('mq-status')[0]).toHaveAttribute('data-label', 'UNHEALTHY')
  expect(within(campaignsRow!).getAllByTestId('mq-status')[0]).toHaveAttribute('data-label', 'N/A')
  const campaignCells = within(campaignsRow!).getAllByRole('cell')
  expect(campaignCells[campaignCells.length - 1]).toHaveTextContent('N/A')

    expect(formatUpdatedAtMock).toHaveBeenCalledWith('2024-02-01T00:00:00Z')
    expect(formatUpdatedAtMock).toHaveBeenCalledWith('2024-03-01T00:00:00Z')
    expect(formatUpdatedAtMock).toHaveBeenCalledWith('2024-04-01T00:00:00Z')
    expect(truncateTextMock).toHaveBeenCalledWith('orders', 40)
    expect(truncateTextMock).toHaveBeenCalledWith('analytics', 40)
    expect(encodeNodeMock).toHaveBeenCalledWith('DATASET', 'analytics', 'orders')

  const initialCallCount = fetchDatasetsMock.mock.calls.length

  const nextButton = screen.getByTestId('paging-next')
  fireEvent.click(nextButton)
  expect(fetchDatasetsMock.mock.calls.length).toBe(initialCallCount + 2)
  const nextCalls = fetchDatasetsMock.mock.calls.slice(-2)
  nextCalls.forEach((call) => expect(call).toEqual(['analytics', 20, 20]))

  const afterNextCount = fetchDatasetsMock.mock.calls.length

  const prevButton = screen.getByTestId('paging-prev')
  fireEvent.click(prevButton)
  expect(fetchDatasetsMock.mock.calls.length).toBe(afterNextCount + 2)
  const prevCalls = fetchDatasetsMock.mock.calls.slice(-2)
  prevCalls.forEach((call) => expect(call).toEqual(['analytics', 20, 0]))

    expect((window as unknown as { scrollTo: () => void }).scrollTo).toHaveBeenCalledTimes(2)

    unmount()
    expect(resetDatasetsMock).toHaveBeenCalledTimes(1)
    expect(dispatchSpy.mock.calls.at(-1)?.[0]).toEqual({ type: 'RESET_DATASETS' })
  })

  it('skips dataset fetches when no namespace is selected', () => {
    const { unmount, dispatchSpy } = renderDatasetsRoute({
      namespaces: {
        selectedNamespace: null,
      },
      datasets: {
        result: [],
        totalCount: 0,
        isLoading: false,
        init: true,
      },
    })

    expect(fetchDatasetsMock).not.toHaveBeenCalled()
    expect(screen.getByTestId('screen-load')).toHaveAttribute('data-loading', 'false')
    expect(screen.getByText('0 total')).toBeInTheDocument()

    const refreshIcon = within(screen.getByTestId('tooltip-Refresh')).getByRole('button')
    fireEvent.click(refreshIcon)
    expect(fetchDatasetsMock).not.toHaveBeenCalled()

    const emptyRefreshButton = within(screen.getByTestId('mq-empty')).getByRole('button', {
      name: 'Refresh',
    })
    fireEvent.click(emptyRefreshButton)
    expect(fetchDatasetsMock).not.toHaveBeenCalled()
    expect((window as unknown as { scrollTo: () => void }).scrollTo).not.toHaveBeenCalled()
    expect(dispatchSpy).not.toHaveBeenCalled()

    unmount()
    expect(resetDatasetsMock).toHaveBeenCalledTimes(1)
    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    expect(dispatchSpy.mock.calls[0][0]).toEqual({ type: 'RESET_DATASETS' })
  })
})
