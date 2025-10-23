// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react'
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from '../../components/header/Header'

describe('AppBar Test', () => {
  // TODO: Wrap in Redux Provider for tests to work
  it.skip('Should render', () => {
    const { container } = render(<MemoryRouter><Header /></MemoryRouter>)
    expect(container).toBeInTheDocument()
  })

  it.skip('should render the header component', () => {
    const { container } = render(<MemoryRouter><Header /></MemoryRouter>)
    expect(container.querySelector('header')).toBeInTheDocument()
  })
})
