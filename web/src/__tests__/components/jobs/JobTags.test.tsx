// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Provider } from 'react-redux'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { addJobTag, addTags, deleteJobTag } from '../../../store/actionCreators'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createStore } from 'redux'
import JobTags from '../../../components/jobs/JobTags'
import React from 'react'

vi.mock('../../../components/core/tooltip/MQTooltip', () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactElement }) => (
    <span aria-label={typeof title === 'string' ? title : undefined}>{children}</span>
  ),
}))

const { MockAutocomplete } = vi.hoisted(() => {
  const React = require('react') as typeof import('react')

  const Component = ({
    id,
    options,
    multiple = false,
    freeSolo = false,
    value,
    onChange,
    renderInput,
    renderTags,
  }: {
    id?: string
    options: string[]
    multiple?: boolean
    freeSolo?: boolean
    value: string[] | string
    onChange: (event: any, newValue: any, reason?: string, details?: any) => void
    renderInput?: (params: any) => React.ReactNode
    renderTags?: (value: string[], getTagProps?: any) => React.ReactNode
  }) => {
    const controlId = id ?? 'mock-autocomplete'

    const handleFreeSoloChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = event.target.value
      onChange(event, selected, 'selectOption', { option: selected })
    }

    const handleSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
      const selected = event.target.value
      if (!selected) {
        return
      }

      if (multiple) {
        const current = value as string[]
        const isSelected = current.includes(selected)
        const updated = isSelected
          ? current.filter((tag) => tag !== selected)
          : [...current, selected]
        onChange(event, updated, isSelected ? 'removeOption' : 'selectOption', {
          option: selected,
        })
      } else {
        onChange(event, selected, 'selectOption', { option: selected })
      }
      event.target.value = ''
    }

    const handleRemove = (tag: string) => {
      if (!multiple) {
        return
      }
      const current = value as string[]
      onChange({}, current.filter((item) => item !== tag), 'removeOption', { option: tag })
    }

    return (
      <div>
        {renderInput?.({
          id: controlId,
          inputProps: {},
          InputLabelProps: {},
          InputProps: {},
        })}
        {freeSolo && (
          <input data-testid={`${controlId}-free-input`} onChange={handleFreeSoloChange} value='' />
        )}
        <select data-testid={controlId} onChange={handleSelect} value=''>
          <option value='' disabled>
            select...
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {multiple && renderTags && (
          <div data-testid={`${id}-rendered-tags`}>{renderTags(value as string[])}</div>
        )}
        {multiple && (
          <ul>
            {(value as string[]).map((tag) => (
              <li key={tag} data-testid={`tag-${tag}`}>
                {tag}
                <button type='button' data-testid={`remove-${tag}`} onClick={() => handleRemove(tag)}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return { MockAutocomplete: Component }
})

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material')

  return {
    ...actual,
    Autocomplete: MockAutocomplete,
  }
})

vi.mock('@mui/material/Snackbar', () => ({
  __esModule: true,
  default: ({ open, message, onClose }: any) =>
    open ? (
      <div role='alert'>
        {message}
        <button
          type='button'
          data-testid='snackbar-close'
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => onClose?.(event, 'timeout')}
        >
          Close
        </button>
      </div>
    ) : null,
}))

const { addJobTagMock, addTagsMock, deleteJobTagMock } = vi.hoisted(() => ({
  addJobTagMock: vi.fn(
    (namespace: string, jobName: string, tag: string) => ({ type: 'ADD_JOB_TAG', namespace, jobName, tag })
  ),
  addTagsMock: vi.fn((tag: string, description: string) => ({
    type: 'ADD_TAGS',
    tag,
    description,
  })),
  deleteJobTagMock: vi.fn(
    (namespace: string, jobName: string, tag: string) => ({
      type: 'DELETE_JOB_TAG',
      namespace,
      jobName,
      tag,
    })
  ),
}))

vi.mock('../../../store/actionCreators', async () => {
  const actual = await vi.importActual<typeof import('../../../store/actionCreators')>(
    '../../../store/actionCreators'
  )

  return {
    ...actual,
  addJobTag: (...args: Parameters<typeof addJobTag>) => addJobTagMock(...args),
  addTags: (...args: Parameters<typeof addTags>) => addTagsMock(...args),
  deleteJobTag: (...args: Parameters<typeof deleteJobTag>) => deleteJobTagMock(...args),
  }
})

const renderWithStore = (selectedTags: string[] = ['priority']) => {
  const theme = createTheme()
  const store = createStore(() => ({
    tags: {
      tags: [
        { name: 'priority', description: 'Priority pipelines' },
        { name: 'beta', description: 'Beta workloads' },
      ],
    },
  }))
  store.dispatch = vi.fn()

  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <JobTags namespace='analytics' jobName='daily-job' jobTags={selectedTags} />
      </ThemeProvider>
    </Provider>
  )
}

describe('JobTags', () => {
  beforeEach(() => {
    addJobTagMock.mockClear()
    addTagsMock.mockClear()
    deleteJobTagMock.mockClear()
  })

  it('shows existing tags and allows removing them', async () => {
    renderWithStore(['priority'])

    expect(screen.getByTestId('tag-priority')).toBeTruthy()

    fireEvent.click(screen.getByTestId('remove-priority'))

    await waitFor(() =>
      expect(deleteJobTagMock).toHaveBeenCalledWith('analytics', 'daily-job', 'priority')
    )
  })

  it('adds another tag through the autocomplete menu', async () => {
    renderWithStore(['priority'])

    fireEvent.change(screen.getByTestId('dataset-tags'), { target: { value: 'beta' } })

    await waitFor(() => expect(addJobTagMock).toHaveBeenCalledWith('analytics', 'daily-job', 'beta'))
  })

  it('opens the dialog and submits a new tag description', async () => {
  renderWithStore(['priority'])

    fireEvent.click(screen.getByRole('button', { name: 'Edit Tag' }))

  const dialog = await screen.findByRole('dialog')
  const tagSelect = within(dialog).getByRole('combobox')
  fireEvent.change(tagSelect, { target: { value: 'beta' } })

  const descriptionInput = dialog.querySelector<HTMLTextAreaElement>('#tag-description')!
    fireEvent.change(descriptionInput, { target: { value: 'Updated description' } })

  const submitButton = within(dialog).getByRole('button', { name: 'Submit' })
  await waitFor(() => expect(submitButton).not.toBeDisabled())
  fireEvent.click(submitButton)

    await waitFor(() => expect(addTagsMock).toHaveBeenCalledWith('beta', 'Updated description'))
  })

  it('renders fallback tooltip when tag description is missing', () => {
    renderWithStore(['orphan'])

    expect(screen.getByLabelText('No Tag Description')).toBeInTheDocument()
  })

  it('closes the dialog via cancel and resets inputs', async () => {
    renderWithStore(['priority'])

    fireEvent.click(screen.getByRole('button', { name: 'Edit Tag' }))

    let dialog = await screen.findByRole('dialog')

    const freeSoloInput = within(dialog).getByTestId('mock-autocomplete-free-input')
    fireEvent.change(freeSoloInput, { target: { value: 'adhoc' } })

  const descriptionInput = dialog.querySelector<HTMLTextAreaElement>('#tag-description')!
    fireEvent.change(descriptionInput, { target: { value: 'Adhoc job tag' } })

    const submitButton = within(dialog).getByRole('button', { name: 'Submit' })
    await waitFor(() => expect(submitButton).not.toBeDisabled())

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Edit Tag' }))
    dialog = await screen.findByRole('dialog')

    expect(within(dialog).getByRole('button', { name: 'Submit' })).toBeDisabled()
  expect(dialog.querySelector<HTMLTextAreaElement>('#tag-description')?.value).toBe('')
  })

  it('supports closing the dialog with the escape key', async () => {
    renderWithStore(['priority'])

    fireEvent.click(screen.getByRole('button', { name: 'Edit Tag' }))

    const dialog = await screen.findByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('adds a new freeform tag and closes the snackbar manually', async () => {
    renderWithStore(['priority'])

    fireEvent.click(screen.getByRole('button', { name: 'Edit Tag' }))

    const dialog = await screen.findByRole('dialog')

    const freeSoloInput = within(dialog).getByTestId('mock-autocomplete-free-input')
    fireEvent.change(freeSoloInput, { target: { value: 'custom-tag' } })

    const descriptionInput = dialog.querySelector<HTMLTextAreaElement>('#tag-description')!
    fireEvent.change(descriptionInput, { target: { value: 'Custom tag description' } })

    const submitButton = within(dialog).getByRole('button', { name: 'Submit' })
    await waitFor(() => expect(submitButton).not.toBeDisabled())
    fireEvent.click(submitButton)

    await waitFor(() => expect(addTagsMock).toHaveBeenCalledWith('custom-tag', 'Custom tag description'))

    expect(screen.getByText('Tag updated.')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('snackbar-close'))

    await waitFor(() => expect(screen.queryByText('Tag updated.')).toBeNull())
  })
})
