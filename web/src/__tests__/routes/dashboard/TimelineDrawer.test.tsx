// Copyright 2018-2025 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TimelineDrawer from '../../../routes/dashboard/TimelineDrawer'
import React from 'react'

describe('TimelineDrawer', () => {
  it('renders timeline heading and key events', () => {
    render(<TimelineDrawer />)

    expect(screen.getByText('Timeline')).toBeTruthy()
    expect(screen.getAllByText('delivery_time_7_days').length).toBeGreaterThan(0)
    expect(screen.getByText(/orders_july_2023/i)).toBeTruthy()
  })
})
