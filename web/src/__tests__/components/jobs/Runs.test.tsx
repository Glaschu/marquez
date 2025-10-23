// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Provider } from 'react-redux'
import { Run } from '../../../types/api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'redux'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import Runs from '../../../components/jobs/Runs'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock RunInfo component
vi.mock('../../../components/jobs/RunInfo', () => ({
  default: ({ run }: { run: Run }) => <div data-testid='run-info'>{run.id}</div>,
}))

describe('Runs Component', () => {
  const mockRuns: Run[] = [
    {
      id: 'run-1',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-01T01:00:00Z',
      state: 'COMPLETED',
      startedAt: '2023-01-01T00:00:00Z',
      endedAt: '2023-01-01T01:00:00Z',
      durationMs: 3600000,
      facets: {},
    } as any,
    {
      id: 'run-2',
      createdAt: '2023-01-02T00:00:00Z',
      updatedAt: '2023-01-02T01:00:00Z',
      state: 'FAILED',
      startedAt: '2023-01-02T00:00:00Z',
      endedAt: '2023-01-02T01:00:00Z',
      durationMs: 1800000,
      facets: {},
    } as any,
    {
      id: 'run-3',
      createdAt: '2023-01-03T00:00:00Z',
      updatedAt: '2023-01-03T01:00:00Z',
      state: 'RUNNING',
      startedAt: '2023-01-03T00:00:00Z',
      durationMs: 0,
      facets: {},
    } as any,
  ]

  const createMockStore = (runs: Run[] = [], isLoading = false, totalCount = 0) => {
    return createStore(() => ({
      runs: {
        result: runs,
        isLoading,
        totalCount,
        init: true,
      },
    }))
  }

  const renderWithStore = (
    store: any,
    props: { jobName: string; jobNamespace: string; facets?: object } = {
      jobName: 'test-job',
      jobNamespace: 'test-namespace',
    }
  ) => {
    return render(
      <Provider store={store}>
        <Runs {...props} />
      </Provider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show empty state when no runs', () => {
    const store = createMockStore([])
    renderWithStore(store)

    expect(screen.getByText('jobs.empty_title')).toBeTruthy()
    expect(screen.getByText('jobs.empty_body')).toBeTruthy()
  })

  it('should show loading spinner when runsLoading is true', () => {
    const store = createMockStore(mockRuns, true, 3)
    renderWithStore(store)

    const spinner = screen.getByRole('progressbar')
    expect(spinner).toBeTruthy()
  })

  it('should render runs table with data', () => {
    const store = createMockStore(mockRuns, false, 3)
    renderWithStore(store)

    expect(screen.getByText('runs_columns.id')).toBeTruthy()
    expect(screen.getByText('runs_columns.state')).toBeTruthy()
    expect(screen.getByText('runs_columns.created_at')).toBeTruthy()
    expect(screen.getByText('runs_columns.started_at')).toBeTruthy()
    expect(screen.getByText('runs_columns.ended_at')).toBeTruthy()
    expect(screen.getByText('runs_columns.duration')).toBeTruthy()
  })

  it('should display run IDs in table', () => {
    const store = createMockStore(mockRuns, false, 3)
    renderWithStore(store)

    // IDs are truncated to first 8 characters
    expect(screen.getByText(/run-1/)).toBeTruthy()
    expect(screen.getByText(/run-2/)).toBeTruthy()
    expect(screen.getByText(/run-3/)).toBeTruthy()
  })

  it('should display run states', () => {
    const store = createMockStore(mockRuns, false, 3)
    renderWithStore(store)

    expect(screen.getByText('COMPLETED')).toBeTruthy()
    expect(screen.getByText('FAILED')).toBeTruthy()
    expect(screen.getByText('RUNNING')).toBeTruthy()
  })

  it('should show N/A for running jobs with no duration', () => {
    const store = createMockStore(mockRuns, false, 3)
    renderWithStore(store)

    // Should have N/A for ended_at and duration for running job
    const naElements = screen.getAllByText('N/A')
    expect(naElements.length).toBeGreaterThan(0)
  })

  it('should render pagination controls', () => {
    const store = createMockStore(mockRuns, false, 100)
    const { container } = renderWithStore(store)

    // Check for pagination component
    expect(container.querySelector('.MuiBox-root')).toBeTruthy()
  })

  it('should switch to RunInfo view when run is clicked', () => {
    const store = createMockStore(mockRuns, false, 3)
    renderWithStore(store)

    // Find and click the first run row
    const runRows = screen.getAllByText(/run-1/)
    fireEvent.click(runRows[0].closest('tr')!)

    // Should show RunInfo component
    expect(screen.getByTestId('run-info')).toBeTruthy()
  })

  it('should show back button when in RunInfo view', () => {
    const store = createMockStore(mockRuns, false, 3)
    renderWithStore(store)

    // Click to open RunInfo
    const runRows = screen.getAllByText(/run-1/)
    fireEvent.click(runRows[0].closest('tr')!)

    // Should show back button
    const backButton = screen.getByRole('button')
    expect(backButton).toBeTruthy()
  })

  it('should return to table view when back button is clicked', () => {
    const store = createMockStore(mockRuns, false, 3)
    renderWithStore(store)

    // Click to open RunInfo
    const runRows = screen.getAllByText(/run-1/)
    fireEvent.click(runRows[0].closest('tr')!)

    // Click back button
    const backButton = screen.getByRole('button')
    fireEvent.click(backButton)

    // Should show table headers again
    expect(screen.getByText('runs_columns.id')).toBeTruthy()
  })

  it('should display run ID chip in RunInfo view', () => {
    const store = createMockStore(mockRuns)

    render(
      <Provider store={store}>
        <Runs jobName='test-job' jobNamespace='test-namespace' />
      </Provider>
    )

    // Click on the first row cell (which contains run-1...)
    const firstRowCell = screen.getByText(/run-1/)
    fireEvent.click(firstRowCell)

    // Should show run ID in RunInfo view
    expect(screen.getByTestId('run-info')).toBeTruthy()
  })

  it('should render facets section when facets provided', () => {
    const store = createMockStore(mockRuns, false, 3)
    renderWithStore(store, {
      jobName: 'test-job',
      jobNamespace: 'test-namespace',
      facets: { test: 'data' },
    })

    expect(screen.getByText('jobs.runs_subhead')).toBeTruthy()
  })

  it('should not render facets section when no facets', () => {
    const store = createMockStore(mockRuns, false, 3)
    renderWithStore(store)

    expect(screen.queryByText('jobs.runs_subhead')).toBeNull()
  })

  it('should handle runs with zero duration correctly', () => {
    const store = createMockStore(mockRuns, false, 3)
    const { container } = renderWithStore(store)

    // The running job with 0 duration should still render
    expect(container.querySelectorAll('tr').length).toBeGreaterThan(1)
  })
})
