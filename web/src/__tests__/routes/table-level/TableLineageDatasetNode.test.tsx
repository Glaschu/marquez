import { Dataset } from '../../../types/api'
import { LineageDataset } from '../../../types/lineage'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PositionedNode } from '../../../components/graph'
import { Provider } from 'react-redux'
import { TableLineageDatasetNodeData } from '../../../routes/table-level/nodes'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'redux'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import TableLineageDatasetNode from '../../../routes/table-level/TableLineageDatasetNode'

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}))

// Mock child components
vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: React.ReactNode }) => (
    <div data-testid='mq-tooltip' title={typeof title === 'string' ? title : 'tooltip'}>
      {children}
    </div>
  ),
}))

vi.mock('../../../components/core/status/MqStatus', () => ({
  default: ({ label, color }: { label: string; color: string }) => (
    <div data-testid='mq-status' data-label={label} data-color={color}>
      {label}
    </div>
  ),
}))

vi.mock('../../../components/core/text/MqText', () => ({
  default: ({ children, ...props }: { children: React.ReactNode }) => (
    <span data-testid='mq-text' {...props}>
      {children}
    </span>
  ),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ namespace: 'test-ns', name: 'test-dataset' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  }
})

const createMockDataset = (overrides = {}): LineageDataset => ({
  id: { namespace: 'test-namespace', name: 'test-dataset' },
  namespace: 'test-namespace',
  name: 'test-dataset',
  physicalName: 'test-dataset',
  type: 'DB_TABLE',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
  sourceName: 'test-source',
  fields: [
    { name: 'id', type: 'INTEGER', tags: [], description: '' },
    { name: 'name', type: 'VARCHAR', tags: [], description: '' },
    { name: 'email', type: 'VARCHAR', tags: [], description: '' },
  ],
  tags: [],
  facets: {},
  lastModifiedAt: '2024-01-15T10:30:00Z',
  description: 'Test dataset description',
  ...overrides,
})

const createMockNode = (
  overrides = {}
): PositionedNode<'DATASET', TableLineageDatasetNodeData> => ({
  id: 'node-1',
  kind: 'DATASET',
  bottomLeftCorner: { x: 100, y: 100 },
  width: 200,
  height: 100,
  data: {
    dataset: createMockDataset(),
  },
  ...overrides,
})

const createMockStore = (dataset: Dataset | null = null) => {
  return createStore(() => ({
    lineage: {
      lineage: { graph: [] },
    },
    dataset: {
      result: dataset,
      isLoading: false,
    },
  }))
}

describe('TableLineageDatasetNode', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders dataset node with basic information', () => {
    const node = createMockNode()
    const store = createMockStore(null)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageDatasetNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('DATASET')).toBeInTheDocument()
    expect(screen.getByText('test-dataset')).toBeInTheDocument()
  })

  it('renders dataset fields in non-compact mode', () => {
    const node = createMockNode({ height: 100 })
    const store = createMockStore(null)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageDatasetNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    // Fields should be rendered
    expect(screen.getByText(/- id/)).toBeInTheDocument()
    expect(screen.getByText(/- name/)).toBeInTheDocument()
    expect(screen.getByText(/- email/)).toBeInTheDocument()
  })

  it('does not render fields in compact mode', () => {
    const node = createMockNode({ height: 24 })
    const store = createMockStore(null)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageDatasetNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    // Fields should not be rendered in compact mode
    expect(screen.queryByText(/- id/)).not.toBeInTheDocument()
    expect(screen.queryByText(/- name/)).not.toBeInTheDocument()
  })

  it('navigates to dataset lineage page on click', () => {
    const node = createMockNode()
    const store = createMockStore(null)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageDatasetNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    const datasetLabel = screen.getByText('test-dataset')
    fireEvent.click(datasetLabel)

    expect(mockNavigate).toHaveBeenCalledWith(
      '/lineage/dataset/test-namespace/test-dataset?tableLevelNode=node-1'
    )
  })

  it('renders with dataset description', () => {
    const dataset = createMockDataset({ description: 'Custom dataset description' })
    const node = createMockNode({ data: { dataset } })
    const store = createMockStore(null)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageDatasetNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('test-dataset')).toBeInTheDocument()
  })

  it('renders with many fields truncated', () => {
    const manyFields = Array.from({ length: 10 }, (_, i) => ({
      name: `field_${i}_with_very_long_name_that_needs_truncation`,
      type: 'VARCHAR',
      tags: [],
      description: '',
    }))
    const dataset = createMockDataset({ fields: manyFields })
    const node = createMockNode({ data: { dataset }, height: 200 })
    const store = createMockStore(null)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageDatasetNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    // All fields should be rendered
    expect(screen.getAllByText(/- field_/)).toHaveLength(10)
  })

  it('handles dataset with no description', () => {
    const dataset = createMockDataset({ description: undefined })
    const node = createMockNode({ data: { dataset } })
    const store = createMockStore(null)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageDatasetNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('test-dataset')).toBeInTheDocument()
  })

  it('renders with quality status when dataset has facets', () => {
    const datasetWithFacets: Dataset = {
      id: {
        namespace: 'test-namespace',
        name: 'test-dataset',
      },
      type: 'DB_TABLE',
      name: 'test-dataset',
      physicalName: 'test-dataset',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T10:30:00Z',
      namespace: 'test-namespace',
      sourceName: 'test-source',
      fields: [],
      tags: [],
      lastModifiedAt: '2024-01-15T10:30:00Z',
      description: 'Test',
      deleted: false,
      facets: {
        dataQualityAssertions: {
          _producer: 'test',
          _schemaURL: 'test',
          assertions: [
            {
              assertion: 'test',
              success: true,
              column: 'test',
            },
          ],
        },
      },
      columnLineage: [],
    }

    const node = createMockNode()
    const store = createMockStore(datasetWithFacets)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageDatasetNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    expect(screen.getByText('test-dataset')).toBeInTheDocument()
  })

  it('truncates long dataset names', () => {
    const longName = 'very_long_dataset_name_that_should_be_truncated_for_display'
    const dataset = createMockDataset({ name: longName })
    const node = createMockNode({ data: { dataset } })
    const store = createMockStore(null)

    render(
      <Provider store={store}>
        <MemoryRouter>
          <svg>
            <TableLineageDatasetNode node={node} />
          </svg>
        </MemoryRouter>
      </Provider>
    )

    // Truncated version should be rendered (15 chars max)
    expect(screen.queryByText(longName)).not.toBeInTheDocument()
  })
})
