// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { legacy_createStore as createStore } from 'redux'
import BaseSearch from '../../../../components/search/base-search/BaseSearch'
import React from 'react'

// Mock child components
vi.mock('../../../../components/search/SearchListItem', () => ({
  default: ({ searchResult, onClick }: any) => (
    <div data-testid='search-list-item' onClick={onClick}>
      {searchResult.name}
    </div>
  ),
}))

vi.mock('../../../../components/core/chip/MqChipGroup', () => ({
  default: ({ chips, onSelect, initialSelection }: any) => (
    <div data-testid='chip-group'>
      {chips.map((chip: any) => (
        <button
          key={chip.value}
          data-testid={`chip-${chip.value}`}
          onClick={() => onSelect(chip.value)}
          data-selected={initialSelection === chip.value}
        >
          {chip.text || chip.value}
        </button>
      ))}
    </div>
  ),
}))

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const mockDispatch = vi.fn()

vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useDispatch: () => mockDispatch,
  }
})

const createMockStore = (initialState: any) => {
  return createStore(() => initialState)
}

const mockSearchResults = new Map([
  [
    'namespace1',
    [
      'group:namespace1',
      [
        {
          name: 'test.dataset1',
          namespace: 'namespace1',
          nodeId: 'node1',
          type: 'DATASET',
          updatedAt: '2024-11-12T10:00:00Z',
          group: 'group:namespace1',
        },
      ],
    ],
  ],
])

const renderBaseSearch = (searchResults = mockSearchResults, isLoading = false, init = true) => {
  const state = {
    search: {
      data: { results: searchResults },
      isLoading,
      init,
    },
  }
  const store = createMockStore(state)

  return render(
    <Provider store={store}>
      <BaseSearch search='test' />
    </Provider>
  )
}

describe('BaseSearch Component', () => {
  beforeEach(() => {
    mockDispatch.mockClear()
  })

  it('renders without crashing', () => {
    renderBaseSearch()
    expect(screen.getByText('All')).toBeInTheDocument()
  })

  it('displays filter chips', () => {
    renderBaseSearch()
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('JOBS')).toBeInTheDocument()
    expect(screen.getByText('DATASETS')).toBeInTheDocument()
  })

  it('displays sort filter chips', () => {
    renderBaseSearch()
    expect(screen.getByText('Sort')).toBeInTheDocument()
    expect(screen.getByText('Updated at')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
  })

  it('dispatches fetchSearch when filter is clicked', () => {
    renderBaseSearch()
    const jobsChip = screen.getByTestId('chip-JOB')
    fireEvent.click(jobsChip)

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('FETCH_SEARCH'),
      })
    )
  })

  it('dispatches fetchSearch when sort is changed', () => {
    renderBaseSearch()
    const nameSort = screen.getByTestId('chip-NAME')
    fireEvent.click(nameSort)

    expect(mockDispatch).toHaveBeenCalled()
  })

  it('displays search results when available', () => {
    renderBaseSearch()
    const listItems = screen.getAllByTestId('search-list-item')
    expect(listItems.length).toBeGreaterThan(0)
  })

  it('displays loading message when searching', () => {
    renderBaseSearch(new Map(), true, true)
    expect(screen.getByText('search.status')).toBeInTheDocument()
  })

  it('displays no results message when not searching and init complete', () => {
    renderBaseSearch(new Map(), false, true)
    expect(screen.getByText('search.none')).toBeInTheDocument()
  })

  it('displays loading message when init not complete', () => {
    renderBaseSearch(new Map(), false, false)
    expect(screen.getByText('search.status')).toBeInTheDocument()
  })

  it('renders group headers', () => {
    renderBaseSearch()
    // The group header parsing should show the parsed group name
    expect(screen.getByText(/namespace1/)).toBeInTheDocument()
  })

  it('renders SearchListItem for each result', () => {
    renderBaseSearch()
    const listItems = screen.getAllByTestId('search-list-item')
    expect(listItems.length).toBeGreaterThan(0)
  })

  it('dispatches setSelectedNode when list item is clicked', () => {
    renderBaseSearch()
    const listItems = screen.getAllByTestId('search-list-item')
    fireEvent.click(listItems[0])

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining('SET_SELECTED_NODE'),
      })
    )
  })

  it('handles empty search results gracefully', () => {
    renderBaseSearch(new Map(), false, true)
    expect(screen.queryByTestId('search-list-item')).not.toBeInTheDocument()
  })

  it('uses All filter by default', () => {
    renderBaseSearch()
    const allChip = screen.getByTestId('chip-All')
    expect(allChip).toHaveAttribute('data-selected', 'true')
  })

  it('uses UPDATE_AT sort by default', () => {
    renderBaseSearch()
    const updateSort = screen.getByTestId('chip-UPDATE_AT')
    expect(updateSort).toHaveAttribute('data-selected', 'true')
  })

  it('displays multiple groups of results', () => {
    const multiGroupResults = new Map([
      [
        'namespace1',
        [
          'group:namespace1',
          [
            {
              name: 'test.dataset1',
              namespace: 'namespace1',
              nodeId: 'node1',
              type: 'DATASET',
              updatedAt: '2024-11-12T10:00:00Z',
              group: 'group:namespace1',
            },
          ],
        ],
      ],
      [
        'namespace2',
        [
          'group:namespace2',
          [
            {
              name: 'test.dataset2',
              namespace: 'namespace2',
              nodeId: 'node2',
              type: 'DATASET',
              updatedAt: '2024-11-12T10:00:00Z',
              group: 'group:namespace2',
            },
          ],
        ],
      ],
    ])
    renderBaseSearch(multiGroupResults)
    const listItems = screen.getAllByTestId('search-list-item')
    expect(listItems.length).toBeGreaterThanOrEqual(2)
  })

  it('handles results without groups', () => {
    const resultsWithoutGroup = new Map([
      [
        'namespace1',
        [
          '',
          [
            {
              name: 'test.dataset1',
              namespace: 'namespace1',
              nodeId: 'node1',
              type: 'DATASET',
              updatedAt: '2024-11-12T10:00:00Z',
              group: '',
            },
          ],
        ],
      ],
    ])
    renderBaseSearch(resultsWithoutGroup)
    const listItems = screen.getAllByTestId('search-list-item')
    expect(listItems.length).toBeGreaterThan(0)
  })

  it('renders both filter chip groups', () => {
    renderBaseSearch()
    const chipGroups = screen.getAllByTestId('chip-group')
    expect(chipGroups.length).toBe(2)
  })
})
