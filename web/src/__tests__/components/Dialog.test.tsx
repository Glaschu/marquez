// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import * as actionTypes from '../../store/actionCreators/actionTypes'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dialog from '../../components/Dialog'

describe('Dialog Component', () => {
  const ignoreWarning = () => {}

  const dialogToggle = (field: string) => ({
    type: actionTypes.DIALOG_TOGGLE,
    payload: {
      field: 'Description of dialog...',
    },
  })

  const mockProps = {
    dialogIsOpen: true,
    dialogToggle: dialogToggle,
    ignoreWarning: ignoreWarning,
    editWarningField: 'Description of dialog...',
  }

  it('should render two buttons on the dialog', () => {
    render(<Dialog {...mockProps} />)

    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
