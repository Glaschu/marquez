// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createStore } from 'redux'

import JobDetailPage from '../../../components/jobs/JobDetailPage'
import type { LineageJob } from '../../../types/lineage'
import type { Run } from '../../../types/api'

const {
  fetchJobMock,
  fetchLatestRunsMock,
  resetJobsMock,
  resetRunsMock,
  setTabIndexMock,
  dialogToggleMock,
  deleteJobMock,
  formatUpdatedAtMock,
  runStateColorMock,
  stopWatchDurationMock,
  truncateTextMock,
  navigateMock,
  setSearchParamsMock,
} = vi.hoisted(() => {
  const fetchJobMock = vi.fn((namespace: string, name: string) => ({
    type: 'FETCH_JOB',
    namespace,
    name,
  }))

  const fetchLatestRunsMock = vi.fn((name: string, namespace: string) => ({
    type: 'FETCH_LATEST_RUNS',
    name,
    namespace,
  }))

  const resetJobsMock = vi.fn(() => ({ type: 'RESET_JOBS' }))
  const resetRunsMock = vi.fn(() => ({ type: 'RESET_RUNS' }))
  const setTabIndexMock = vi.fn((index: number) => ({ type: 'SET_TAB_INDEX', index }))
  const dialogToggleMock = vi.fn((field: string) => ({ type: 'DIALOG_TOGGLE', field }))
  const deleteJobMock = vi.fn((name: string, namespace: string) => ({
    type: 'DELETE_JOB',
    name,
    namespace,
  }))
  const formatUpdatedAtMock = vi.fn((value: string) => `formatted(${value})`)
  const runStateColorMock = vi.fn((state: string) => `color(${state})`)
  const stopWatchDurationMock = vi.fn((duration: number) => `duration(${duration})`)
  const truncateTextMock = vi.fn((text: string, max: number) => `${text.slice(0, max)}::${max}`)
  const navigateMock = vi.fn()
  const setSearchParamsMock = vi.fn()

  return {
    fetchJobMock,
    fetchLatestRunsMock,
    resetJobsMock,
    resetRunsMock,
    setTabIndexMock,
    dialogToggleMock,
    deleteJobMock,
    formatUpdatedAtMock,
    runStateColorMock,
    stopWatchDurationMock,
    truncateTextMock,
    navigateMock,
    setSearchParamsMock,
  }
})

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams(), setSearchParamsMock] as const,
  }
})

vi.mock('../../../store/actionCreators', () => ({
  fetchJob: (...args: Parameters<typeof fetchJobMock>) => fetchJobMock(...args),
  fetchLatestRuns: (...args: Parameters<typeof fetchLatestRunsMock>) =>
    fetchLatestRunsMock(...args),
  resetJobs: () => resetJobsMock(),
  resetRuns: () => resetRunsMock(),
  setTabIndex: (...args: Parameters<typeof setTabIndexMock>) => setTabIndexMock(...args),
  dialogToggle: (...args: Parameters<typeof dialogToggleMock>) => dialogToggleMock(...args),
  deleteJob: (...args: Parameters<typeof deleteJobMock>) => deleteJobMock(...args),
}))

vi.mock('../../../helpers', () => ({
  formatUpdatedAt: (...args: Parameters<typeof formatUpdatedAtMock>) =>
    formatUpdatedAtMock(...args),
}))

vi.mock('../../../helpers/nodes', () => ({
  runStateColor: (...args: Parameters<typeof runStateColorMock>) => runStateColorMock(...args),
}))

vi.mock('../../../helpers/time', () => ({
  stopWatchDuration: (...args: Parameters<typeof stopWatchDurationMock>) =>
    stopWatchDurationMock(...args),
}))

vi.mock('../../../helpers/text', () => ({
  truncateText: (...args: Parameters<typeof truncateTextMock>) => truncateTextMock(...args),
}))

vi.mock('@mui/x-date-pickers', () => ({
  CalendarIcon: ({ children }: { children?: React.ReactNode }) => (
    <span data-testid='calendar-icon'>{children}</span>
  ),
}))

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: ({ title }: { title?: string }) => <span data-testid='fa-icon'>{title}</span>,
}))

vi.mock('@fortawesome/free-solid-svg-icons/faCog', () => ({
  faCog: 'fa-cog-icon',
}))

vi.mock('../../../components/Dialog', () => ({
  __esModule: true,
  default: ({
    dialogIsOpen,
    dialogToggle,
    ignoreWarning,
    title,
  }: {
    dialogIsOpen: boolean
    dialogToggle: (field: string) => void
    ignoreWarning: () => void
    title: string
  }) => (
    <div data-testid='dialog' data-open={dialogIsOpen} data-title={title}>
      <button type='button' onClick={() => dialogToggle('toggle')} data-testid='dialog-toggle'>
        toggle
      </button>
      <button type='button' onClick={ignoreWarning} data-testid='dialog-confirm'>
        confirm
      </button>
    </div>
  ),
}))

vi.mock('../../../components/jobs/JobTags', () => ({
  __esModule: true,
  default: ({ jobTags }: { jobTags: string[] }) => (
    <div data-testid='job-tags'>{JSON.stringify(jobTags)}</div>
  ),
}))

vi.mock('../../../components/jobs/RunInfo', () => ({
  __esModule: true,
  default: ({ run }: { run: Run }) => (
    <div data-testid='run-info'>{run.id}</div>
  ),
}))

vi.mock('../../../components/jobs/Runs', () => ({
  __esModule: true,
  default: ({ jobName, jobNamespace }: { jobName: string; jobNamespace: string }) => (
    <div data-testid='runs'>{`${jobNamespace}/${jobName}`}</div>
  ),
}))

vi.mock('../../../components/core/info/MqInfo', () => ({
  __esModule: true,
  MqInfo: ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div data-testid={`mq-info-${label}`}>{value}</div>
  ),
}))

vi.mock('../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
  default: ({ children, title }: { children: React.ReactNode; title: React.ReactNode }) => (
    <div data-testid={title === 'Refresh' ? 'tooltip-Refresh' : undefined}>{children}</div>
  ),
}))

vi.mock('../../../components/core/empty/MqEmpty', () => ({
  __esModule: true,
  default: ({ title, body }: { title?: React.ReactNode; body?: React.ReactNode }) => (
    <div data-testid='mq-empty'>
      <div>{title}</div>
      <div>{body}</div>
    </div>
  ),
}))

vi.mock('@mui/icons-material/Close', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => <svg data-testid='close-icon' {...props} />,
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

interface PartialState {
  job: {
    result: any
    isLoading: boolean
  }
  runs: {
    isLatestRunsLoading: boolean
  }
  display: {
    dialogIsOpen: boolean
  }
  jobs: {
    deletedJobName: string | null
  }
  lineage: {
    tabIndex: number
  }
}

const renderJobDetailPage = (
  stateOverride: Partial<PartialState> = {},
  lineageJobOverride: Partial<LineageJob> = {}
) => {
  const baseState: PartialState = {
    job: {
      result: null,
      isLoading: false,
    },
    runs: {
      isLatestRunsLoading: false,
    },
    display: {
      dialogIsOpen: false,
    },
    jobs: {
      deletedJobName: null,
    },
    lineage: {
      tabIndex: 0,
    },
  }

  const mergedState: PartialState = {
    ...baseState,
    ...stateOverride,
    job: {
      ...baseState.job,
      ...(stateOverride.job ?? {}),
    },
    runs: {
      ...baseState.runs,
      ...(stateOverride.runs ?? {}),
    },
    display: {
      ...baseState.display,
      ...(stateOverride.display ?? {}),
    },
    jobs: {
      ...baseState.jobs,
      ...(stateOverride.jobs ?? {}),
    },
    lineage: {
      ...baseState.lineage,
      ...(stateOverride.lineage ?? {}),
    },
  }

  const store = createStore(() => mergedState as unknown as PartialState)
  const dispatchSpy = vi.fn((action) => action)
  store.dispatch = dispatchSpy as unknown as typeof store.dispatch

  const lineageJob = (
    {
      namespace: 'analytics',
      name: 'ExampleJob',
      type: 'BATCH',
      id: { namespace: 'analytics', name: 'ExampleJob' },
      createdAt: '',
      updatedAt: '',
      inputs: [],
      outputs: [],
      location: '',
      description: '',
      simpleName: 'ExampleJob',
      latestRun: null,
      parentJobName: null,
      parentJobUuid: null,
      ...lineageJobOverride,
    } as unknown
  ) as LineageJob

  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <JobDetailPage lineageJob={lineageJob} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  )

  return { ...utils, store, dispatchSpy }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('JobDetailPage', () => {
  it('renders loading state and dispatches initial fetches', () => {
    const jobState = {
      job: {
        result: null,
        isLoading: true,
      },
    }

    const { dispatchSpy, unmount } = renderJobDetailPage(jobState)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(fetchJobMock).toHaveBeenCalledWith('analytics', 'ExampleJob')
    expect(fetchLatestRunsMock).toHaveBeenCalledWith('ExampleJob', 'analytics')
    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'FETCH_JOB', namespace: 'analytics', name: 'ExampleJob' })
    expect(dispatchSpy).toHaveBeenCalledWith({ type: 'FETCH_LATEST_RUNS', name: 'ExampleJob', namespace: 'analytics' })

    unmount()
    expect(resetJobsMock).toHaveBeenCalledTimes(1)
    expect(resetRunsMock).toHaveBeenCalledTimes(1)
    expect(setTabIndexMock).toHaveBeenCalledWith(0)
  })

  it('renders job detail, handles interactions, and cleans up', () => {
    const latestRuns: Run[] = [
      {
        id: 'run-1',
        createdAt: '',
        updatedAt: '',
        nominalStartTime: '',
        nominalEndTime: '',
        state: 'FAILED',
        startedAt: '2024-01-01T00:00:00Z',
        endedAt: '2024-01-01T01:00:00Z',
        durationMs: 60000,
        args: {},
        facets: {},
      } as unknown as Run,
      {
        id: 'run-2',
        createdAt: '',
        updatedAt: '',
        nominalStartTime: '',
        nominalEndTime: '',
        state: 'RUNNING',
        startedAt: '2024-01-02T00:00:00Z',
        endedAt: '2024-01-02T01:00:00Z',
        durationMs: 120000,
        args: {},
        facets: {},
      } as unknown as Run,
    ]

    const job = {
      name: 'ExampleJob',
      namespace: 'analytics',
      description: 'A job description',
      type: 'BATCH',
      location: 'https://example.com/job',
      latestRun: {
        id: 'run-0',
        state: 'COMPLETED',
        durationMs: 90000,
        startedAt: '2024-01-03T00:00:00Z',
        endedAt: '2024-01-03T01:00:00Z',
      },
      latestRuns,
      tags: ['alpha', 'beta'],
      parentJobName: 'ParentJob',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    }

    const { dispatchSpy, unmount } = renderJobDetailPage({
      job: {
        result: job,
        isLoading: false,
      },
    })

  expect(screen.getByText((content) => content.includes('ExampleJob'))).toBeInTheDocument()
    expect(formatUpdatedAtMock).toHaveBeenCalledWith('2024-01-01T00:00:00Z')
    expect(formatUpdatedAtMock).toHaveBeenCalledWith('2024-01-04T00:00:00Z')
  expect(stopWatchDurationMock).toHaveBeenCalledWith(60000)
    expect(runStateColorMock).toHaveBeenCalledWith('COMPLETED')

    const deleteButton = screen.getByRole('button', { name: 'jobs.dialog_delete' })
    fireEvent.click(deleteButton)
    expect(dialogToggleMock).toHaveBeenCalledWith('')

    const confirmButton = screen.getByTestId('dialog-confirm')
    fireEvent.click(confirmButton)
    expect(deleteJobMock).toHaveBeenCalledWith('ExampleJob', 'analytics')

    const closeButton = screen.getByTestId('close-icon').closest('button')
    expect(closeButton).toBeTruthy()
    fireEvent.click(closeButton!)
    expect(setSearchParamsMock).toHaveBeenCalledWith({})

    expect(screen.getByTestId('run-info')).toHaveTextContent('run-0')

    unmount()
    expect(dispatchSpy.mock.calls.slice(-3)).toEqual([
      [{ type: 'RESET_JOBS' }],
      [{ type: 'RESET_RUNS' }],
      [{ type: 'SET_TAB_INDEX', index: 0 }],
    ])
  })

  it('renders empty state when latest run is missing', () => {
    const job = {
      name: 'NoRunJob',
      namespace: 'analytics',
      description: '',
      type: 'STREAM',
      location: '',
      latestRun: null,
      latestRuns: [],
      tags: [],
      parentJobName: null,
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-06T00:00:00Z',
    }

    renderJobDetailPage({
      job: {
        result: job,
        isLoading: false,
      },
    })

    expect(screen.getByTestId('mq-empty')).toBeInTheDocument()
  })

  it('renders history tab content when tab index is one and navigates on delete', () => {
    const job = {
      name: 'HistoryJob',
      namespace: 'analytics',
      description: '',
      type: 'BATCH',
      location: '',
      latestRun: null,
      latestRuns: [],
      tags: [],
      parentJobName: null,
      createdAt: '2024-01-07T00:00:00Z',
      updatedAt: '2024-01-08T00:00:00Z',
    }

    renderJobDetailPage(
      {
        job: {
          result: job,
          isLoading: false,
        },
        jobs: {
          deletedJobName: 'HistoryJob',
        },
        lineage: {
          tabIndex: 1,
        },
      },
      {
        name: 'HistoryJob',
      }
    )

    expect(navigateMock).toHaveBeenCalledWith('/')
    expect(screen.getByTestId('runs')).toHaveTextContent('analytics/HistoryJob')
  })
})
