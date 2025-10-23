// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NotFound } from '../../../routes/not-found/NotFound'

describe('NotFound Component', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    )
    expect(container).toBeInTheDocument()
  })

  it('should display 404 message', () => {
    const { container } = render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    )
    expect(container.textContent).toContain('Not Found')
  })
})
