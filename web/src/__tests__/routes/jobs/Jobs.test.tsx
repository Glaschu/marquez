// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createStore } from 'redux'

import Jobs from '../../../routes/jobs/Jobs'
import type { Run } from '../../../types/api'

const {
  fetchJobsMock,
  resetJobsMock,
  encodeNodeMock,
  runStateColorMock,
  formatUpdatedAtMock,
  stopWatchDurationMock,
  truncateTextMock,
} = vi.hoisted(() => {
  const fetchJobsMock = vi.fn((namespace: string, limit: number, offset: number) => ({
    type: 'FETCH_JOBS',
    namespace,
    limit,
    offset,
  }))
  const resetJobsMock = vi.fn(() => ({ type: 'RESET_JOBS' }))
  const encodeNodeMock = vi.fn((type: string, namespace: string, name: string) =>
    `${type}:${namespace}:${name}`
  )
  const runStateColorMock = vi.fn((state: string) => `color(${state})`)
  const formatUpdatedAtMock = vi.fn((value: string) => `formatted(${value})`)
  const stopWatchDurationMock = vi.fn((durationMs: number) => `duration(${durationMs})`)
  const truncateTextMock = vi.fn((value: string, length: number) => `${value.slice(0, length)}:${length}`)

  return {
    fetchJobsMock,
    resetJobsMock,
    encodeNodeMock,
    runStateColorMock,
    formatUpdatedAtMock,
    stopWatchDurationMock,
    truncateTextMock,
  }
})

vi.mock('../../../store/actionCreators', () => ({
  fetchJobs: (...args: Parameters<typeof fetchJobsMock>) => fetchJobsMock(...args),
  resetJobs: () => resetJobsMock(),
}))

vi.mock('../../../helpers/nodes', () => ({
  encodeNode: (...args: Parameters<typeof encodeNodeMock>) => encodeNodeMock(...args),
  runStateColor: (...args: Parameters<typeof runStateColorMock>) => runStateColorMock(...args),
}))

vi.mock('../../../helpers', () => ({
  formatUpdatedAt: (...args: Parameters<typeof formatUpdatedAtMock>) =>
    formatUpdatedAtMock(...args),
}))

vi.mock('../../../helpers/time', () => ({
  stopWatchDuration: (...args: Parameters<typeof stopWatchDurationMock>) =>
    stopWatchDurationMock(...args),
}))

vi.mock('../../../helpers/text', () => ({
  truncateText: (...args: Parameters<typeof truncateTextMock>) => truncateTextMock(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
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
    subheading,
  }: {
    children: React.ReactNode
    link?: boolean
    linkTo?: string
    subheading?: boolean
  }) =>
    link ? (
      <a href={linkTo} data-testid='mq-text-link'>
        {children}
      </a>
    ) : (
      <span data-subheading={subheading}>{children}</span>
    ),
}))

vi.mock('../../../components/core/status/MqStatus', () => ({
  __esModule: true,
  default: ({ label, color }: { label: string; color?: string }) => (
    <span data-testid='mq-status' data-color={color}>
      {label}
    </span>
  ),
}))

vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={title === 'Refresh' ? 'tooltip-Refresh' : undefined}>{children}</div>
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
      <button type='button' data-testid='paging-next' onClick={incrementPage}>
        next
      </button>
      <button type='button' data-testid='paging-prev' onClick={decrementPage}>
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

const renderJobsRoute = (
  stateOverride: Partial<{
    jobs: Partial<{
      result: Array<{
        name: string
        namespace: string
        updatedAt: string
        latestRun?: Partial<Run> | null
      }>
      totalCount: number
      isLoading: boolean
      init: boolean
    }>
    namespaces: Partial<{
      selectedNamespace: string | null
    }>
  }> = {}
) => {
  const baseState = {
    jobs: {
      result: [] as Array<{
        name: string
        namespace: string
        updatedAt: string
        latestRun?: Partial<Run> | null
      }>,
      totalCount: 0,
      isLoading: false,
      init: true,
    },
    namespaces: {
      selectedNamespace: 'analytics',
    },
  }

  const mergedState = {
    ...baseState,
    ...stateOverride,
    jobs: {
      ...baseState.jobs,
      ...(stateOverride.jobs ?? {}),
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
        <MemoryRouter>
          <Jobs />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  )

  return { ...utils, dispatchSpy }
}

beforeEach(() => {
  fetchJobsMock.mockClear()
  resetJobsMock.mockClear()
  encodeNodeMock.mockClear()
  runStateColorMock.mockClear()
  formatUpdatedAtMock.mockClear()
  stopWatchDurationMock.mockClear()
  truncateTextMock.mockClear()
  ;(window as unknown as { scrollTo: () => void }).scrollTo = vi.fn()
})

describe('Jobs route', () => {
  it('renders empty state, triggers refresh, and resets on unmount', () => {
    const { unmount, dispatchSpy } = renderJobsRoute({
      jobs: {
        result: [],
        totalCount: 0,
        isLoading: true,
        init: false,
      },
    })

    expect(fetchJobsMock).toHaveBeenCalledWith('analytics', 20, 0)
    expect(screen.getByTestId('screen-load')).toHaveAttribute('data-loading', 'true')
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    const refreshIcon = within(screen.getByTestId('tooltip-Refresh')).getByRole('button')
    fireEvent.click(refreshIcon)
    expect(fetchJobsMock.mock.calls.slice(-1)[0]).toEqual(['analytics', 20, 0])

    const emptyRefreshButton = within(screen.getByTestId('mq-empty')).getByRole('button', {
      name: 'Refresh',
    })
    fireEvent.click(emptyRefreshButton)
    expect(fetchJobsMock.mock.calls.slice(-1)[0]).toEqual(['analytics', 20, 0])

    unmount()
    expect(resetJobsMock).toHaveBeenCalledTimes(1)
    expect(dispatchSpy.mock.calls.at(-1)?.[0]).toEqual({ type: 'RESET_JOBS' })
  })

  it('renders job table, derives status, and paginates', () => {
    const jobs = [
      {
        name: 'ingest-orders',
        namespace: 'analytics',
        updatedAt: '2024-05-01T00:00:00Z',
        latestRun: {
          state: 'COMPLETED',
          durationMs: 120000,
        } as Partial<Run>,
      },
      {
        name: 'cleanup-temp',
        namespace: 'analytics',
        updatedAt: '2024-05-02T00:00:00Z',
        latestRun: null as Partial<Run> | null,
      },
    ]

    renderJobsRoute({
      jobs: {
        result: jobs,
        totalCount: 2,
        isLoading: false,
        init: true,
      },
    })

    expect(fetchJobsMock).toHaveBeenCalledWith('analytics', 20, 0)
    expect(screen.getByText('2 total')).toBeInTheDocument()
    expect(formatUpdatedAtMock).toHaveBeenCalledWith('2024-05-01T00:00:00Z')
    expect(formatUpdatedAtMock).toHaveBeenCalledWith('2024-05-02T00:00:00Z')
    expect(stopWatchDurationMock).toHaveBeenCalledWith(120000)
    expect(runStateColorMock).toHaveBeenCalledWith('COMPLETED')

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)

    const firstRow = rows[0]
    expect(within(firstRow).getByTestId('mq-text-link').getAttribute('href')).toContain('JOB:analytics:ingest-orders')
    expect(within(firstRow).getAllByTestId('mq-status')[0]).toHaveTextContent('COMPLETED')

    const secondRow = rows[1]
    expect(within(secondRow).getAllByTestId('mq-status')[0]).toHaveTextContent('N/A')

    const nextButton = screen.getByTestId('paging-next')
    const callsBeforeNext = fetchJobsMock.mock.calls.length
    fireEvent.click(nextButton)
    const nextCalls = fetchJobsMock.mock.calls.slice(callsBeforeNext)
    expect(nextCalls.every(([, , offset]) => offset === 20)).toBe(true)
    expect(fetchJobsMock.mock.calls.at(-1)).toEqual(['analytics', 20, 20])
    expect(screen.getByTestId('paging-page')).toHaveTextContent('1')

    const prevButton = screen.getByTestId('paging-prev')
    const callsBeforePrev = fetchJobsMock.mock.calls.length
    fireEvent.click(prevButton)
    const prevCalls = fetchJobsMock.mock.calls.slice(callsBeforePrev)
    expect(prevCalls.every(([, , offset]) => offset === 0)).toBe(true)
    expect(fetchJobsMock.mock.calls.at(-1)).toEqual(['analytics', 20, 0])
    expect(screen.getByTestId('paging-page')).toHaveTextContent('0')

    expect((window as unknown as { scrollTo: () => void }).scrollTo).toHaveBeenCalledTimes(2)
  })

  it('skips initial fetch without namespace but paginates with empty namespace', () => {
    renderJobsRoute({
      namespaces: {
        selectedNamespace: null,
      },
      jobs: {
        result: [
          {
            name: 'orphan-job',
            namespace: 'default',
            updatedAt: '2024-06-01T00:00:00Z',
            latestRun: null as Partial<Run> | null,
          },
        ],
        totalCount: 1,
        isLoading: false,
        init: true,
      },
    })

    expect(fetchJobsMock).not.toHaveBeenCalled()

    const nextButton = screen.getByTestId('paging-next')
    fireEvent.click(nextButton)
    expect(fetchJobsMock.mock.calls.slice(-1)[0]).toEqual(['', 20, 20])

    const prevButton = screen.getByTestId('paging-prev')
    fireEvent.click(prevButton)
    expect(fetchJobsMock.mock.calls.slice(-1)[0]).toEqual(['', 20, 0])
  })
})
