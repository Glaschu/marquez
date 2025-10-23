// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { formatUpdatedAt } from '../../helpers'

describe('formatUpdated Function', () => {
  it('Should return an empty string when passed a falsey value', () => {
    const updatedAt = ''
    const formatedDate = formatUpdatedAt(updatedAt)
    expect(formatedDate).toBe('')
  })
  it('Should return a datetime string in format like "May 1, 2021 01:45pm"', () => {
    const updatedAt = '2021-05-13T13:45:13Z'
    const formatedDate = formatUpdatedAt(updatedAt)
    // d3-time-format parses UTC time to local timezone, so we just verify the format is correct
    expect(formatedDate).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} \d{2}:\d{2}(am|pm)$/)
    expect(formatedDate).toContain('May 13, 2021')
  })
})
