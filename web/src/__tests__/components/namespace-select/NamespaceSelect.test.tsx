// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Provider } from 'react-redux'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import NamespaceSelect from '../../../components/namespace-select/NamespaceSelect'
import React from 'react'
import { createStore } from 'redux'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { selectNamespaceMock } = vi.hoisted(() => ({
  selectNamespaceMock: vi.fn((value: string) => ({ type: 'SELECT_NAMESPACE', payload: value })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (key === 'namespace_select.prompt' ? 'Namespace' : key),
  }),
}))

vi.mock('../../../store/actionCreators', () => ({
  selectNamespace: (value: string) => selectNamespaceMock(value),
}))

const createMockStore = (selectedNamespace: string | null, namespaces: string[] = []) => {
  const state = {
    namespaces: {
      result: namespaces.map((name) => ({ name })),
      selectedNamespace,
    },
  }

  const store = createStore(() => state)
  store.dispatch = vi.fn()
  return store
}

const renderComponent = (store: ReturnType<typeof createMockStore>) => {
  const theme = createTheme()

  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <NamespaceSelect />
      </ThemeProvider>
    </Provider>
  )
}

describe('NamespaceSelect', () => {
  it('does not render when no namespace is selected', () => {
    const store = createMockStore(null, ['default'])
    const { container } = renderComponent(store)

    expect(container.firstChild).toBeNull()
  })

  it('renders the prompt and selected namespace', () => {
    const store = createMockStore('default', ['default'])
    renderComponent(store)

    expect(screen.getByText('Namespace')).toBeTruthy()
    expect(screen.getByRole('combobox')).toHaveTextContent('default')
  })

  it('dispatches selectNamespace when a different namespace is chosen', () => {
    const store = createMockStore('default', ['default', 'analytics'])
    renderComponent(store)

    const selectControl = screen.getByRole('combobox')

    fireEvent.click(selectControl)

    const option = screen.getByRole('option', { name: 'analytics' })
    fireEvent.click(option)

    expect(selectNamespaceMock).toHaveBeenCalledWith('analytics')
    expect(store.dispatch).toHaveBeenCalledWith({ type: 'SELECT_NAMESPACE', payload: 'analytics' })
  })
})
