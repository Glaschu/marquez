// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Provider } from 'react-redux'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createStore } from 'redux'

import DatasetTags from '../../../components/datasets/DatasetTags'

const {
  addDatasetTagMock,
  deleteDatasetTagMock,
  addDatasetFieldTagMock,
  deleteDatasetFieldTagMock,
  addTagsMock,
} = vi.hoisted(() => {
  const addDatasetTagMock = vi.fn((namespace: string, dataset: string, tag: string) => ({
    type: 'ADD_DATASET_TAG',
    namespace,
    dataset,
    tag,
  }))
  const deleteDatasetTagMock = vi.fn((namespace: string, dataset: string, tag: string) => ({
    type: 'DELETE_DATASET_TAG',
    namespace,
    dataset,
    tag,
  }))
  const addDatasetFieldTagMock = vi.fn(
    (namespace: string, dataset: string, tag: string, field: string) => ({
      type: 'ADD_DATASET_FIELD_TAG',
      namespace,
      dataset,
      tag,
      field,
    })
  )
  const deleteDatasetFieldTagMock = vi.fn(
    (namespace: string, dataset: string, tag: string, field: string) => ({
      type: 'DELETE_DATASET_FIELD_TAG',
      namespace,
      dataset,
      tag,
      field,
    })
  )
  const addTagsMock = vi.fn((tag: string, description: string) => ({
    type: 'ADD_TAG',
    tag,
    description,
  }))

  return {
    addDatasetTagMock,
    deleteDatasetTagMock,
    addDatasetFieldTagMock,
    deleteDatasetFieldTagMock,
    addTagsMock,
  }
})

vi.mock('../../../store/actionCreators', () => ({
  addDatasetTag: (...args: Parameters<typeof addDatasetTagMock>) => addDatasetTagMock(...args),
  deleteDatasetTag: (...args: Parameters<typeof deleteDatasetTagMock>) =>
    deleteDatasetTagMock(...args),
  addDatasetFieldTag: (...args: Parameters<typeof addDatasetFieldTagMock>) =>
    addDatasetFieldTagMock(...args),
  deleteDatasetFieldTag: (...args: Parameters<typeof deleteDatasetFieldTagMock>) =>
    deleteDatasetFieldTagMock(...args),
  addTags: (...args: Parameters<typeof addTagsMock>) => addTagsMock(...args),
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

vi.mock('../../../components/core/text/MqText', () => ({
  __esModule: true,
  default: ({ children, bold, subdued }: { children: React.ReactNode; bold?: boolean; subdued?: boolean }) => (
    <span data-bold={bold} data-subdued={subdued}>{children}</span>
  ),
}))

vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
    <div data-testid={`tooltip-${String(title)}`}>{children}</div>
  ),
}))

const muiStubs = vi.hoisted(() => {
  const React = require('react') as typeof import('react')
  const AutocompleteStub = ({
    id,
    options,
    value,
    onChange,
    renderTags,
    renderInput,
    renderOption,
    multiple,
  }: any) => {
    const option =
      options?.find((opt: string) => !(value ?? []).includes(opt)) ?? options?.[0] ?? 'new'
    const params = {
      id: id ?? 'autocomplete',
      InputProps: {},
      InputLabelProps: {},
      disabled: false,
      fullWidth: true,
    }
    const renderedTags = renderTags ? renderTags(value ?? []) : null
    const renderedInput = renderInput ? renderInput(params) : null
    if (renderOption && options?.length) {
      renderOption({} as any, options[0], {
        selected: value?.includes(options[0]),
      })
    }

    return (
      <div data-testid={`autocomplete-${id ?? 'dialog'}`} data-multiple={multiple}>
        <button
          type='button'
          data-testid={`add-option-${id ?? 'dialog'}`}
          onClick={() =>
            onChange?.({}, multiple ? [...(value ?? []), option] : option, 'selectOption', {
              option,
            })
          }
        >
          add-option
        </button>
        {multiple && value && value.length > 0 && (
          <button
            type='button'
            data-testid={`remove-option-${id ?? 'dialog'}`}
            onClick={() =>
              onChange?.({}, value.slice(0, value.length - 1), 'removeOption', {
                option: value[value.length - 1],
              })
            }
          >
            remove-option
          </button>
        )}
        <div data-testid={`tags-${id ?? 'dialog'}`}>{renderedTags}</div>
        <div data-testid={`input-${id ?? 'dialog'}`}>{renderedInput}</div>
      </div>
    )
  }

  const TextFieldStub = ({ id, placeholder, onChange, value, multiline }: any) => (
    <div data-testid={`textfield-${id ?? placeholder ?? 'field'}`}>
      {multiline ? (
        <textarea
          data-testid={`textarea-${id ?? 'field'}`}
          value={value ?? ''}
          onChange={(event) => onChange?.({ target: { value: event.currentTarget.value } })}
        />
      ) : (
        <input
          data-testid={`input-${id ?? 'field'}`}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(event) => onChange?.({ target: { value: event.currentTarget.value } })}
        />
      )}
    </div>
  )

  const CheckboxStub = ({ checked }: { checked?: boolean }) => (
    <input data-testid='checkbox' type='checkbox' checked={checked} readOnly />
  )

  const ChipStub = React.forwardRef<HTMLDivElement, { label: string; onDelete?: () => void }>(
    ({ label, onDelete }, ref) => (
      <div ref={ref} data-testid={`chip-${label}`}>
        <span>{label}</span>
        <button type='button' onClick={onDelete} data-testid={`chip-delete-${label}`}>
          delete
        </button>
      </div>
    )
  )
  ChipStub.displayName = 'ChipStub'

  const DialogStub = ({
    open,
    children,
    onKeyDown,
  }: {
    open: boolean
    children: React.ReactNode
    onKeyDown?: (event: any) => void
  }) => (
    <div data-testid='dialog' data-open={open} onKeyDown={onKeyDown} tabIndex={0}>
      {open ? children : null}
    </div>
  )

  const DialogContentStub = ({ children }: { children: React.ReactNode }) => (
    <div data-testid='dialog-content'>{children}</div>
  )

  const DialogActionsStub = ({ children }: { children: React.ReactNode }) => (
    <div data-testid='dialog-actions'>{children}</div>
  )

  const SnackbarStub = ({
    open,
    onClose,
    message,
  }: {
    open: boolean
    onClose: () => void
    message: string
  }) => (
    <div data-testid='snackbar' data-open={open}>
      <span>{message}</span>
      {open && (
        <button type='button' data-testid='snackbar-close' onClick={onClose}>
          close
        </button>
      )}
    </div>
  )

  return {
    AutocompleteStub,
    TextFieldStub,
    CheckboxStub,
    ChipStub,
    DialogStub,
    DialogContentStub,
    DialogActionsStub,
    SnackbarStub,
  }
})

const {
  AutocompleteStub,
  TextFieldStub,
  CheckboxStub,
  ChipStub,
  DialogStub,
  DialogContentStub,
  DialogActionsStub,
  SnackbarStub,
} = muiStubs

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material')
  return {
    ...actual,
    Autocomplete: muiStubs.AutocompleteStub,
    TextField: muiStubs.TextFieldStub,
    Checkbox: muiStubs.CheckboxStub,
  }
})

vi.mock('@mui/material/Autocomplete', () => ({ __esModule: true, default: muiStubs.AutocompleteStub }))
vi.mock('@mui/material/TextField', () => ({ __esModule: true, default: muiStubs.TextFieldStub }))
vi.mock('@mui/material/Checkbox', () => ({ __esModule: true, default: muiStubs.CheckboxStub }))
vi.mock('@mui/material/Chip', () => ({ __esModule: true, default: muiStubs.ChipStub }))
vi.mock('@mui/material/Dialog', () => ({ __esModule: true, default: muiStubs.DialogStub }))
vi.mock('@mui/material/DialogContent', () => ({ __esModule: true, default: muiStubs.DialogContentStub }))
vi.mock('@mui/material/DialogActions', () => ({ __esModule: true, default: muiStubs.DialogActionsStub }))
vi.mock('@mui/material/Snackbar', () => ({ __esModule: true, default: muiStubs.SnackbarStub }))

const renderDatasetTags = (
  propsOverride: Partial<React.ComponentProps<typeof DatasetTags>> = {},
  tagsState: Array<{ name: string; description: string }> = [
    { name: 'beta', description: 'Beta tag' },
    { name: 'alpha', description: 'Alpha tag' },
    { name: 'gamma', description: 'Gamma tag' },
  ]
) => {
  const baseProps: React.ComponentProps<typeof DatasetTags> = {
    namespace: 'analytics',
    datasetName: 'orders',
    datasetTags: ['alpha'],
    datasetField: undefined,
  }

  const store = createStore(() => ({
    tags: {
      tags: tagsState,
    },
  }))
  const dispatchSpy = vi.fn((action) => action)
  store.dispatch = dispatchSpy as unknown as typeof store.dispatch

  const utils = render(
    <Provider store={store}>
      <ThemeProvider theme={createTheme()}>
        <MemoryRouter>
          <DatasetTags {...baseProps} {...propsOverride} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  )

  return { ...utils, dispatchSpy }
}

beforeEach(() => {
  addDatasetTagMock.mockClear()
  deleteDatasetTagMock.mockClear()
  addDatasetFieldTagMock.mockClear()
  deleteDatasetFieldTagMock.mockClear()
  addTagsMock.mockClear()
})

describe('DatasetTags', () => {
  it('adds and removes dataset tags using global actions', () => {
    renderDatasetTags()

    fireEvent.click(screen.getByTestId('add-option-dataset-tags'))
    expect(addDatasetTagMock).toHaveBeenCalledWith('analytics', 'orders', 'beta')

    fireEvent.click(screen.getByTestId('remove-option-dataset-tags'))
    expect(deleteDatasetTagMock).toHaveBeenNthCalledWith(1, 'analytics', 'orders', 'beta')

    fireEvent.click(screen.getByTestId('chip-delete-alpha'))
    expect(deleteDatasetTagMock).toHaveBeenNthCalledWith(2, 'analytics', 'orders', 'alpha')

    expect(screen.getByTestId('tooltip-Edit a Tag')).toBeInTheDocument()
  })

  it('opens dialog, edits descriptions, and submits new tags', () => {
    renderDatasetTags()

  fireEvent.click(screen.getByRole('button', { name: 'Edit Tag' }))
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'true')

    fireEvent.click(screen.getByTestId('add-option-dialog'))

    const descriptionField = screen.getByTestId('textarea-tag-description') as HTMLTextAreaElement
    expect(descriptionField.value).toBe('Alpha tag')

    fireEvent.change(descriptionField, { target: { value: 'Updated description' } })

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))
    expect(addTagsMock).toHaveBeenCalledWith('alpha', 'Updated description')
    expect(screen.getByTestId('snackbar')).toHaveAttribute('data-open', 'true')

    fireEvent.click(screen.getByTestId('snackbar-close'))
    expect(screen.getByTestId('snackbar')).toHaveAttribute('data-open', 'false')

  fireEvent.click(screen.getByRole('button', { name: 'Edit Tag' }))
    fireEvent.keyDown(screen.getByTestId('dialog'), { key: 'Escape' })
    expect(screen.getByTestId('dialog')).toHaveAttribute('data-open', 'false')
  })

  it('handles dataset field tags with field-specific actions', () => {
    renderDatasetTags({ datasetField: 'country', datasetTags: ['beta'] })

  expect(screen.queryByLabelText('Edit a Tag')).toBeNull()

    fireEvent.click(screen.getByTestId('add-option-dataset-tags'))
    expect(addDatasetFieldTagMock).toHaveBeenCalledWith('analytics', 'orders', 'alpha', 'country')

    fireEvent.click(screen.getByTestId('remove-option-dataset-tags'))
    expect(deleteDatasetFieldTagMock).toHaveBeenNthCalledWith(1, 'analytics', 'orders', 'alpha', 'country')

    fireEvent.click(screen.getByTestId('chip-delete-beta'))
    expect(deleteDatasetFieldTagMock).toHaveBeenNthCalledWith(2, 'analytics', 'orders', 'beta', 'country')
  })
})
