// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Box, FormControl, MenuItem, Select } from '@mui/material'
import { IState } from '../../store/reducers'
import { MqInputBase } from '../core/input-base/MqInputBase'
import { selectNamespace } from '../../store/actionCreators'
import { theme } from '../../helpers/theme'
import { useDispatch, useSelector } from 'react-redux'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import MqText from '../core/text/MqText'

const NamespaceSelect = () => {
  // Redux hooks
  const namespaces = useSelector((state: IState) => state.namespaces.result)
  const selectedNamespace = useSelector((state: IState) => state.namespaces.selectedNamespace)
  const dispatch = useDispatch()

  const [open, setOpen] = useState(false)
  const { t } = useTranslation()

  if (selectedNamespace) {
    return (
      <FormControl
        variant='outlined'
        sx={{
          minWidth: '140px',
          position: 'relative',
        }}
        onClick={() => setOpen(!open)}
      >
        <Box
          sx={{
            position: 'absolute',
            left: '-4px',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <MqText color={theme.palette.primary.main} font={'mono'}>
            {t('namespace_select.prompt')}
          </MqText>
        </Box>
        <Select
          inputProps={{
            MenuProps: {
              PaperProps: {
                sx: {
                  backgroundImage: 'none',
                },
              },
            },
          }}
          labelId='namespace-label'
          id='namespace-select'
          value={selectedNamespace}
          onChange={(event) => {
            dispatch(selectNamespace(event.target.value as string))
          }}
          label='Namespace'
          input={<MqInputBase />}
          open={open}
          onClick={() => setOpen(!open)}
          onClose={() => setOpen(false)}
          sx={{ cursor: 'pointer' }}
        >
          {namespaces.map((namespace) => (
            <MenuItem key={namespace.name} value={namespace.name}>
              {namespace.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    )
  } else return null
}

export default NamespaceSelect
