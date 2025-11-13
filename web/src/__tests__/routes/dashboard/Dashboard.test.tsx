// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createStore } from 'redux'
import Dashboard from '../../../routes/dashboard/Dashboard'
import React from 'react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

const {
  fetchLineageMetricsMock,
  fetchJobMetricsMock,
  fetchDatasetMetricsMock,
  fetchSourceMetricsMock,
  fetchJobsMock,
} = vi.hoisted(() => ({
  fetchLineageMetricsMock: vi.fn((range: string) => ({
    type: 'FETCH_LINEAGE_METRICS',
    range,
  })),
  fetchJobMetricsMock: vi.fn((range: string) => ({ type: 'FETCH_JOB_METRICS', range })),
  fetchDatasetMetricsMock: vi.fn((range: string) => ({ type: 'FETCH_DATASET_METRICS', range })),
  fetchSourceMetricsMock: vi.fn((range: string) => ({ type: 'FETCH_SOURCE_METRICS', range })),
  fetchJobsMock: vi.fn((namespace: string | null, limit: number, offset: number) => ({
    type: 'FETCH_JOBS',
    namespace,
    limit,
    offset,
  })),
}))

vi.mock('../../../store/actionCreators', () => ({
  fetchLineageMetrics: fetchLineageMetricsMock,
  fetchJobMetrics: fetchJobMetricsMock,
  fetchDatasetMetrics: fetchDatasetMetricsMock,
  fetchSourceMetrics: fetchSourceMetricsMock,
  fetchJobs: fetchJobsMock,
}))

vi.mock('../../../routes/dashboard/MiniGraphContainer', () => ({
  MiniGraphContainer: ({ label }: { label: string }) => (
    <div data-testid={`mini-graph-${label}`}>{label}</div>
  ),
}))

vi.mock('../../../routes/dashboard/StackedLineageEvents', () => ({
  default: () => <div data-testid='stacked-events'>Stacked Events</div>,
}))

vi.mock('../../../routes/dashboard/JobRunItem', () => ({
  default: ({ job }: { job: { id: { namespace: string; name: string } } }) => (
    <div data-testid={`job-item-${job.id.namespace}-${job.id.name}`}>
      {`${job.id.namespace}.${job.id.name}`}
    </div>
  ),
}))

vi.mock('../../../routes/dashboard/JobsDrawer', () => ({
  default: () => <div data-testid='jobs-drawer-content'>Jobs Drawer</div>,
}))

vi.mock('../../../components/dashboard/SplitButton', () => ({
  default: ({
    options,
    onClick,
    onRefresh,
  }: {
    options: string[]
    onClick: (option: string) => void
    onRefresh?: () => void
  }) => (
    <div>
      <button data-testid='option-button' onClick={() => onClick(options.at(-1) as string)}>
        {options[0]}
      </button>
      <button data-testid='refresh-button' onClick={onRefresh}>
        Refresh
      </button>
    </div>
  ),
}))

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material')
  return {
    ...actual,
    Drawer: ({ open, onClose, children }: any) =>
      open ? (
        <div data-testid='mock-drawer'>
          {children}
          <button data-testid='drawer-close' onClick={() => onClose?.({}, 'backdropClick')}>
            Close Drawer
          </button>
        </div>
      ) : null,
  }
})

const createInitialState = () => ({
  lineageMetrics: {
    data: [
      { complete: 2, fail: 1, start: 3, abort: 0 },
      { complete: 1, fail: 0, start: 1, abort: 1 },
    ],
    isLoading: false,
  },
  jobs: {
    result: [
      {
        id: { namespace: 'default', name: 'job' },
        name: 'job',
        namespace: 'default',
        type: 'BATCH',
        createdAt: '',
        updatedAt: '',
        tags: [],
        latestRun: null,
        latestRuns: [],
        facets: {},
      },
    ],
    isLoading: false,
    totalCount: 1,
  },
  jobMetrics: {
    data: [],
    isLoading: false,
  },
  datasetMetrics: {
    data: [],
    isLoading: false,
  },
  sourceMetrics: {
    data: [],
    isLoading: false,
  },
})

const renderDashboard = (
  initialEntries: string[] = ['/dashboard'],
  mutateState?: (state: ReturnType<typeof createInitialState>) => void
) => {
  const state = createInitialState()
  mutateState?.(state)
  const store = createStore(() => state)
  const mockDispatch = vi.fn((action) => action)
  store.dispatch = mockDispatch as any

  const utils = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        <Dashboard />
      </MemoryRouter>
    </Provider>
  )

  return { store, mockDispatch, state, ...utils }
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders dashboard header and job list', () => {
    renderDashboard()

    expect(screen.getByText('DataOps')).toBeTruthy()
    expect(screen.getByText('REFRESH')).toBeTruthy()
    expect(screen.getByText('TIMEFRAME')).toBeTruthy()
    expect(screen.getByTestId('job-item-default-job')).toBeTruthy()
    expect(screen.getByTestId('mini-graph-Datasets')).toBeTruthy()
    expect(screen.getByTestId('stacked-events')).toBeTruthy()
  })

  it('dispatches weekly metrics when timeframe changes', async () => {
    renderDashboard()

    expect(fetchLineageMetricsMock).toHaveBeenCalledWith('day')

    const initialLineageCalls = fetchLineageMetricsMock.mock.calls.length
    const initialJobMetricCalls = fetchJobMetricsMock.mock.calls.length
    const initialDatasetMetricCalls = fetchDatasetMetricsMock.mock.calls.length
    const initialSourceMetricCalls = fetchSourceMetricsMock.mock.calls.length

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '7 Days' }))
    })

    expect(fetchLineageMetricsMock.mock.calls.length).toBeGreaterThan(initialLineageCalls)
    expect(fetchJobMetricsMock.mock.calls.length).toBeGreaterThan(initialJobMetricCalls)
    expect(fetchDatasetMetricsMock.mock.calls.length).toBeGreaterThan(initialDatasetMetricCalls)
    expect(fetchSourceMetricsMock.mock.calls.length).toBeGreaterThan(initialSourceMetricCalls)

    const lineageArgs = fetchLineageMetricsMock.mock.calls.at(-1)
    const jobMetricArgs = fetchJobMetricsMock.mock.calls.at(-1)
    const datasetMetricArgs = fetchDatasetMetricsMock.mock.calls.at(-1)
    const sourceMetricArgs = fetchSourceMetricsMock.mock.calls.at(-1)

    expect(lineageArgs?.[0]).toBe('week')
    expect(jobMetricArgs?.[0]).toBe('week')
    expect(datasetMetricArgs?.[0]).toBe('week')
    expect(sourceMetricArgs?.[0]).toBe('week')
  })

  it('triggers refresh when refresh button is clicked', async () => {
    renderDashboard()

    const initialJobsCalls = fetchJobsMock.mock.calls.length

    await act(async () => {
      fireEvent.click(screen.getByTestId('refresh-button'))
    })

    expect(fetchJobsMock.mock.calls.length).toBeGreaterThan(initialJobsCalls)
    const jobsArgs = fetchJobsMock.mock.calls.at(-1)

    expect(jobsArgs).toEqual([null, 10, 0])

    expect(fetchLineageMetricsMock).toHaveBeenCalled()
    expect(fetchJobMetricsMock).toHaveBeenCalled()
    expect(fetchDatasetMetricsMock).toHaveBeenCalled()
    expect(fetchSourceMetricsMock).toHaveBeenCalled()
  })

  it('shows skeletons while lineage metrics loading', () => {
    const { container } = renderDashboard(['/dashboard'], (state) => {
      state.lineageMetrics.isLoading = true
    })

    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })

  it('filters jobs by run state and toggles off', async () => {
    renderDashboard()

    const initialCalls = fetchJobsMock.mock.calls.length
    const runningButton = screen.getByRole('button', { name: 'RUNNING' })

    await act(async () => {
      fireEvent.click(runningButton)
    })

    const filteredCall = fetchJobsMock.mock.calls.at(-1)
    expect(filteredCall).toEqual([null, 10, 0, 'RUNNING'])

    await act(async () => {
      fireEvent.click(runningButton)
    })

    const resetCall = fetchJobsMock.mock.calls.at(-1)
    expect(resetCall).toEqual([null, 10, 0, undefined])

    expect(fetchJobsMock.mock.calls.length).toBeGreaterThan(initialCalls)
  })

  it('renders empty state when no jobs are available', () => {
    renderDashboard(['/dashboard'], (state) => {
      state.jobs.result = []
    })

    expect(screen.getByText('No jobs found')).toBeTruthy()
  })

  it('shows loader while jobs are loading', () => {
    renderDashboard(['/dashboard'], (state) => {
      state.jobs.isLoading = true
    })

    expect(screen.getByRole('progressbar')).toBeTruthy()
  })

  it('initializes timeframe from search params', () => {
    renderDashboard(['/dashboard?timeframe=week'])

    expect(fetchLineageMetricsMock).toHaveBeenCalledWith('week')
  })

  it('triggers periodic refresh based on the selected interval', () => {
    renderDashboard()

    const initialLineageCalls = fetchLineageMetricsMock.mock.calls.length

    act(() => {
      vi.advanceTimersByTime(30000)
    })

    expect(fetchLineageMetricsMock.mock.calls.length).toBeGreaterThan(initialLineageCalls)
  })

  it('stops auto refresh when interval is set to Never', async () => {
    renderDashboard()

    await act(async () => {
      fireEvent.click(screen.getByTestId('option-button'))
    })

    const callsAfterSelection = fetchLineageMetricsMock.mock.calls.length

    act(() => {
      vi.advanceTimersByTime(60000)
    })

    expect(fetchLineageMetricsMock.mock.calls.length).toBe(callsAfterSelection)
  })

  it('opens and closes the jobs drawer while refreshing the run list', async () => {
    renderDashboard()

    const initialJobsCalls = fetchJobsMock.mock.calls.length

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'See More' }))
    })

    expect(screen.getByTestId('jobs-drawer-content')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByTestId('drawer-close'))
    })

    expect(fetchJobsMock.mock.calls.length).toBeGreaterThan(initialJobsCalls)
    const latestCall = fetchJobsMock.mock.calls.at(-1)
    expect(latestCall?.slice(0, 3)).toEqual([null, 10, 0])
  })
})
