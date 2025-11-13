// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { createStore } from 'redux'

import Events from '../../../routes/events/Events'
import type { Event } from '../../../types/api'

const {
  fetchEventsMock,
  resetEventsMock,
  formatDateAPIQueryMock,
  formatDatePickerMock,
  formatUpdatedAtMock,
  truncateTextMock,
  eventTypeColorMock,
  fileSizeMock,
  saveAsMock,
  searchParamsState,
  setSearchParamsMock,
  searchParamsProxy,
  datePickerHandlers,
} = vi.hoisted(() => {
  const fetchEventsMock = vi.fn(
    (after: string, before: string, limit: number, offset: number) => ({
      type: 'FETCH_EVENTS',
      after,
      before,
      limit,
      offset,
    })
  )

  const resetEventsMock = vi.fn(() => ({ type: 'RESET_EVENTS' }))
  const formatDateAPIQueryMock = vi.fn((value: unknown) => `api(${String(value)})`)
  const formatDatePickerMock = vi.fn((value: unknown) => `picker(${String(value)})`)
  const formatUpdatedAtMock = vi.fn((value: string) => `updated(${value})`)
  const truncateTextMock = vi.fn((value: string) => value)
  const eventTypeColorMock = vi.fn(() => '#123456')
  const fileSizeMock = vi.fn((data: string) => {
    try {
      const parsed = JSON.parse(data)
      const runId: string = parsed?.run?.runId ?? ''
      const kiloBytes = runId.includes('large') ? 600 : 10
      return { kiloBytes, megaBytes: kiloBytes / 1024 }
    } catch {
      return { kiloBytes: 10, megaBytes: 10 / 1024 }
    }
  })
  const saveAsMock = vi.fn()

  const searchParamsState = {
    params: new URLSearchParams(),
    setInitial(entries?: Record<string, string>) {
      this.params = new URLSearchParams(entries ? Object.entries(entries) : [])
    },
  }

  const setSearchParamsMock = vi.fn((next: Record<string, string>) => {
    searchParamsState.params = new URLSearchParams(Object.entries(next))
  })

  const searchParamsProxy = {
    get: (key: string) => searchParamsState.params.get(key),
    forEach: (callback: (value: string, key: string) => void) =>
      searchParamsState.params.forEach((value, key) => callback(value, key)),
  } as unknown as URLSearchParams

  const datePickerHandlers: Record<string, (pickerEvent: { toDate: () => unknown }) => void> = {}

  return {
    fetchEventsMock,
    resetEventsMock,
    formatDateAPIQueryMock,
    formatDatePickerMock,
    formatUpdatedAtMock,
    truncateTextMock,
    eventTypeColorMock,
    fileSizeMock,
    saveAsMock,
    searchParamsState,
    setSearchParamsMock,
    searchParamsProxy,
    datePickerHandlers,
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useSearchParams: () => [searchParamsProxy, setSearchParamsMock] as const,
  }
})

vi.mock('../../../store/actionCreators', () => ({
  fetchEvents: (...args: Parameters<typeof fetchEventsMock>) => fetchEventsMock(...args),
  resetEvents: () => resetEventsMock(),
}))

vi.mock('../../../helpers', () => ({
  formatUpdatedAt: (...args: Parameters<typeof formatUpdatedAtMock>) =>
    formatUpdatedAtMock(...args),
  fileSize: (...args: Parameters<typeof fileSizeMock>) => fileSizeMock(...args),
}))

vi.mock('../../../helpers/time', () => ({
  formatDateAPIQuery: (...args: Parameters<typeof formatDateAPIQueryMock>) =>
    formatDateAPIQueryMock(...args),
  formatDatePicker: (...args: Parameters<typeof formatDatePickerMock>) =>
    formatDatePickerMock(...args),
}))

vi.mock('../../../helpers/text', () => ({
  truncateText: (...args: Parameters<typeof truncateTextMock>) => truncateTextMock(...args),
}))

vi.mock('../../../helpers/nodes', () => ({
  eventTypeColor: (...args: Parameters<typeof eventTypeColorMock>) => eventTypeColorMock(...args),
}))

vi.mock('file-saver', () => ({
  saveAs: (...args: Parameters<typeof saveAsMock>) => saveAsMock(...args),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../components/core/screen-load/MqScreenLoad', () => ({
  MqScreenLoad: ({ loading, children }: { loading: boolean; children: React.ReactElement }) => (
    <div data-testid='screen-load' data-loading={loading}>
      {children}
    </div>
  ),
}))

vi.mock('../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('../../../components/core/status/MqStatus', () => ({
  __esModule: true,
  default: ({ label }: { label: string }) => <span data-testid='mq-status'>{label}</span>,
}))

vi.mock('../../../components/core/copy/MqCopy', () => ({
  __esModule: true,
  default: ({ string }: { string: string }) => <span data-testid={`copy-${string}`}>copy</span>,
}))

vi.mock('../../../components/core/date-picker/MqDatePicker', () => ({
  __esModule: true,
  default: ({ label, value, onChange }: { label: string; value: string; onChange: (arg: any) => void }) => {
    datePickerHandlers[label] = onChange
    return (
      <div data-testid={`date-picker-${label}`}>date-picker-{label}-{value}</div>
    )
  },
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
      <span data-testid='paging-info'>{currentPage}</span>
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

vi.mock('../../../components/core/json-view/MqJsonView', () => ({
  __esModule: true,
  default: ({ data }: { data: unknown }) => (
    <div data-testid='mq-json-view'>{JSON.stringify(data)}</div>
  ),
}))

vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid={`tooltip-${title}`}>{children}</div>
  ),
}))

const renderEventsRoute = (
  stateOverride: Partial<{
    events: Partial<{
      result: Event[]
      totalCount: number
      isLoading: boolean
      init: boolean
    }>
  }> = {},
  options: { searchParams?: Record<string, string> } = {}
) => {
  if (options.searchParams) {
    searchParamsState.setInitial(options.searchParams)
  } else {
    searchParamsState.setInitial()
  }

  const baseState = {
    events: {
      result: [] as Event[],
      totalCount: 0,
      isLoading: false,
      init: true,
    },
  }

  const mergedState = {
    ...baseState,
    ...stateOverride,
    events: {
      ...baseState.events,
      ...(stateOverride.events ?? {}),
    },
  }

  const store = createStore(() => mergedState)
  const dispatchSpy = vi.fn()
  store.dispatch = dispatchSpy as unknown as typeof store.dispatch

  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter initialEntries={['/events']}>
          <Events />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  )

  return { store, dispatchSpy, ...utils }
}

beforeEach(() => {
  fetchEventsMock.mockClear()
  resetEventsMock.mockClear()
  formatDateAPIQueryMock.mockClear()
  formatDatePickerMock.mockClear()
  formatUpdatedAtMock.mockClear()
  truncateTextMock.mockClear()
  eventTypeColorMock.mockClear()
  fileSizeMock.mockClear()
  saveAsMock.mockClear()
  setSearchParamsMock.mockClear()
  Object.keys(datePickerHandlers).forEach((key) => delete datePickerHandlers[key])
  ;(window as any).scrollTo = vi.fn()
})

describe('Events route', () => {
  it('renders empty state, updates filters, and cleans up', () => {
    const { unmount, dispatchSpy } = renderEventsRoute({
      events: {
        result: [],
        totalCount: 0,
        isLoading: true,
        init: true,
      },
    })

    expect(fetchEventsMock).toHaveBeenCalledTimes(1)
    const initialArgs = fetchEventsMock.mock.calls[0]
    expect(initialArgs[2]).toBe(50)
    expect(initialArgs[3]).toBe(0)
    expect(setSearchParamsMock).toHaveBeenCalledTimes(1)
    expect(setSearchParamsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: expect.any(String), dateTo: expect.any(String) })
    )

    expect(screen.getByTestId('mq-empty')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()

    const refreshIcon = within(screen.getByTestId('tooltip-Refresh')).getByRole('button')
    fireEvent.click(refreshIcon)
    expect(fetchEventsMock).toHaveBeenCalledTimes(2)

    const emptyRefreshButton = within(screen.getByTestId('mq-empty')).getByRole('button', {
      name: 'Refresh',
    })
    fireEvent.click(emptyRefreshButton)
    expect(fetchEventsMock).toHaveBeenCalledTimes(3)

    const fromHandler = datePickerHandlers['events_route.from_date']
    const toHandler = datePickerHandlers['events_route.to_date']
    expect(fromHandler).toBeDefined()
    expect(toHandler).toBeDefined()

    act(() => {
      fromHandler?.({ toDate: () => 'FROM_DATE' })
    })
  expect(fetchEventsMock).toHaveBeenCalledTimes(4)
    expect(formatDateAPIQueryMock).toHaveBeenCalledWith('FROM_DATE')
    expect(formatDatePickerMock).toHaveBeenCalledWith('FROM_DATE')
    expect(setSearchParamsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dateFrom: 'api(FROM_DATE)' })
    )

    act(() => {
      toHandler?.({ toDate: () => 'TO_DATE' })
    })
  expect(fetchEventsMock).toHaveBeenCalledTimes(5)
    expect(formatDateAPIQueryMock.mock.calls.some(([value]) => value === 'TO_DATE')).toBe(true)
    expect(formatDatePickerMock.mock.calls.some(([value]) => value === 'TO_DATE')).toBe(true)
    expect(setSearchParamsMock).toHaveBeenCalledWith(
      expect.objectContaining({ dateTo: 'api(TO_DATE)' })
    )

    expect((window as any).scrollTo).not.toHaveBeenCalled()

    unmount()
    expect(resetEventsMock).toHaveBeenCalledTimes(1)
  expect(dispatchSpy).toHaveBeenCalledTimes(6)
    expect(dispatchSpy.mock.calls.at(-1)?.[0]).toEqual({ type: 'RESET_EVENTS' })
  })

  it('renders events table, toggles payload view, and paginates', () => {
    const events: Event[] = [
      {
        eventType: 'START',
        eventTime: '2024-01-01T00:00:00Z',
        producer: 'producer-a',
        schemaURL: 'schema',
        run: { runId: 'small-run', facets: {} },
        job: { name: 'SmallJob', namespace: 'analytics', facets: {} },
        inputs: [],
        outputs: [],
      },
      {
        eventType: 'COMPLETE',
        eventTime: '2024-01-02T00:00:00Z',
        producer: 'producer-b',
        schemaURL: 'schema',
        run: { runId: 'large-run', facets: {} },
        job: { name: 'LargeJob', namespace: 'finance', facets: {} },
        inputs: [],
        outputs: [],
      },
    ]

    renderEventsRoute(
      {
        events: {
          result: events,
          totalCount: 2,
          isLoading: false,
          init: true,
        },
      },
      {
        searchParams: { dateFrom: 'existing-from', dateTo: 'existing-to' },
      }
    )

    expect(fetchEventsMock).toHaveBeenCalledTimes(1)
    expect(fetchEventsMock.mock.calls[0][0]).toBe('existing-from')
    expect(fetchEventsMock.mock.calls[0][1]).toBe('existing-to')
    expect(setSearchParamsMock).not.toHaveBeenCalled()

    expect(screen.getByText('2 total')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(formatUpdatedAtMock).toHaveBeenCalledWith('2024-01-01T00:00:00Z')
    expect(formatUpdatedAtMock).toHaveBeenCalledWith('2024-01-02T00:00:00Z')

    const firstRow = screen.getByText('small-run').closest('tr')
    expect(firstRow).toBeTruthy()
    fireEvent.click(firstRow!)
    expect(screen.getByTestId('mq-json-view').textContent).toContain('small-run')

    const secondRow = screen.getByText('large-run').closest('tr')
    expect(secondRow).toBeTruthy()
    fireEvent.click(secondRow!)
    expect(screen.getByText('Payload is too big for render')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Download payload' }))
    expect(saveAsMock).toHaveBeenCalledTimes(1)
    expect(saveAsMock.mock.calls[0][1]).toBe('LargeJob-COMPLETE-large-run.json')
    expect(saveAsMock.mock.calls[0][0]).toBeInstanceOf(Blob)

    fireEvent.click(screen.getByTestId('paging-next'))
    expect(fetchEventsMock).toHaveBeenCalledTimes(2)
    expect(fetchEventsMock.mock.calls.at(-1)?.[0]).toBe('api(existing-from)')
    expect(fetchEventsMock.mock.calls.at(-1)?.[1]).toBe('api(existing-to)')
    expect(fetchEventsMock.mock.calls.at(-1)?.[3]).toBe(50)
    expect((window as any).scrollTo).toHaveBeenCalledWith(0, 0)
    expect(screen.getByTestId('paging-info').textContent).toBe('1')

    fireEvent.click(screen.getByTestId('paging-prev'))
    expect(fetchEventsMock).toHaveBeenCalledTimes(3)
    expect(fetchEventsMock.mock.calls.at(-1)?.[3]).toBe(0)
    expect(screen.getByTestId('paging-info').textContent).toBe('0')
  })
})
