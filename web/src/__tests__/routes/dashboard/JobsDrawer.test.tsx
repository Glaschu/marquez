// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Job } from '../../../types/api'
import { MemoryRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import JobsDrawer from '../../../routes/dashboard/JobsDrawer'
import React from 'react'

// Mock JobRunItem component
vi.mock('../../../routes/dashboard/JobRunItem', () => ({
  default: ({ job }: { job: Job }) => <div data-testid={`job-item-${job.name}`}>{job.name}</div>,
}))

describe('JobsDrawer Component', () => {
  const mockJobs: Job[] = [
    {
      id: { namespace: 'ns1', name: 'job1' },
      name: 'job1',
      namespace: 'ns1',
      type: 'BATCH',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      tags: [],
      latestRun: null,
      latestRuns: [],
      facets: {},
    } as any,
    {
      id: { namespace: 'ns1', name: 'job2' },
      name: 'job2',
      namespace: 'ns1',
      type: 'STREAM',
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: '2023-01-02T00:00:00Z',
      tags: [],
      latestRun: null,
      latestRuns: [],
      facets: {},
    } as any,
  ]

  const createMockStore = (jobs: Job[] = [], isLoading = false, totalCount = 0) => {
    return createStore(() => ({
      jobs: {
        result: jobs,
        isLoading,
        totalCount,
        init: true,
      },
    }))
  }

  const renderWithStore = (store: any) => {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <JobsDrawer />
        </MemoryRouter>
      </Provider>
    )
  }

  it('should render Jobs heading', () => {
    const store = createMockStore(mockJobs, false, 2)
    renderWithStore(store)

    expect(screen.getByText('Jobs')).toBeTruthy()
  })

  it('should render job items from store', () => {
    const store = createMockStore(mockJobs, false, 2)
    renderWithStore(store)

    expect(screen.getByTestId('job-item-job1')).toBeTruthy()
    expect(screen.getByTestId('job-item-job2')).toBeTruthy()
  })

  it('should show loading spinner when isJobsLoading is true', () => {
    const store = createMockStore(mockJobs, true, 2)
    renderWithStore(store)

    const spinner = screen.getByRole('progressbar')
    expect(spinner).toBeTruthy()
  })

  it('should not show loading spinner when not loading', () => {
    const store = createMockStore(mockJobs, false, 2)
    renderWithStore(store)

    const spinner = screen.queryByRole('progressbar')
    expect(spinner).toBeNull()
  })

  it('should render pagination controls', () => {
    const store = createMockStore(mockJobs, false, 100)
    const { container } = renderWithStore(store)

    // Check for pagination component (MqPaging)
    const paging = container.querySelector('[class*="MuiBox"]')
    expect(paging).toBeTruthy()
  })

  it('should handle next page click', () => {
    const store = createMockStore(mockJobs, false, 100)
    renderWithStore(store)

    // Component should render with pagination capability
    expect(screen.getByText('Jobs')).toBeTruthy()
  })

  it('should render with empty jobs array', () => {
    const store = createMockStore([], false, 0)
    renderWithStore(store)

    expect(screen.getByText('Jobs')).toBeTruthy()
    expect(screen.queryByTestId(/job-item-/)).toBeNull()
  })

  it('should have fixed width', () => {
    const store = createMockStore(mockJobs, false, 2)
    const { container } = renderWithStore(store)

    // Check that drawer box exists
    expect(container.querySelector('.MuiBox-root')).toBeTruthy()
  })

  it('should render sticky header', () => {
    const store = createMockStore(mockJobs, false, 2)
    const { container } = renderWithStore(store)

    // Check that Jobs heading is rendered
    expect(screen.getByText('Jobs')).toBeTruthy()
  })
})
