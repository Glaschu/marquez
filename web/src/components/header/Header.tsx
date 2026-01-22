// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { AppBar, Toolbar } from '@mui/material'
import { DRAWER_WIDTH } from '../../helpers/theme'
import { createTheme } from '@mui/material/styles'
import { useTheme } from '@emotion/react'
import Box from '@mui/material/Box'
import React, { ReactElement } from 'react'
import Search from '../search/Search'

const Header = (): ReactElement => {
  const theme = createTheme(useTheme())
  const [apiTarget, setApiTarget] = React.useState('default')

  React.useEffect(() => {
    const match = document.cookie.match(new RegExp('(^| )api-target=([^;]+)'))
    if (match) {
      setApiTarget(match[2])
    }
  }, [])

  const handleApiToggle = () => {
    const newTarget = apiTarget === 'default' ? 'newapi' : 'default'
    document.cookie = `api-target=${newTarget}; path=/; max-age=31536000`
    setApiTarget(newTarget)
    window.location.reload()
  }

  return (
    <AppBar
      position='fixed'
      elevation={0}
      sx={{
        zIndex: theme.zIndex.drawer + 1,
        backgroundColor: theme.palette.background.default,
        borderBottom: `2px dashed ${theme.palette.secondary.main}`,
        left: `${DRAWER_WIDTH + 1}px`,
      }}
    >
      <Toolbar disableGutters>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'calc(100% - 97px)',
          }}
        >
          <Box display={'flex'} alignItems={'center'}>
            <Search />
          </Box>
          <Box display={'flex'} alignItems={'center'}>
            <div style={{ marginRight: '10px', fontSize: '0.875rem', color: theme.palette.text.primary }}>
              API: {apiTarget === 'default' ? 'Default' : 'New API'}
            </div>
            <label className="switch">
              <input type="checkbox" checked={apiTarget === 'newapi'} onChange={handleApiToggle} />
              <span className="slider round"></span>
            </label>
            <style>{`
               .switch {
                 position: relative;
                 display: inline-block;
                 width: 34px;
                 height: 20px;
               }
               .switch input { 
                 opacity: 0;
                 width: 0;
                 height: 0;
               }
               .slider {
                 position: absolute;
                 cursor: pointer;
                 top: 0;
                 left: 0;
                 right: 0;
                 bottom: 0;
                 background-color: #ccc;
                 -webkit-transition: .4s;
                 transition: .4s;
                 border-radius: 34px;
               }
               .slider:before {
                 position: absolute;
                 content: "";
                 height: 12px;
                 width: 12px;
                 left: 4px;
                 bottom: 4px;
                 background-color: white;
                 -webkit-transition: .4s;
                 transition: .4s;
                 border-radius: 50%;
               }
               input:checked + .slider {
                 background-color: #2196F3;
               }
               input:focus + .slider {
                 box-shadow: 0 0 1px #2196F3;
               }
               input:checked + .slider:before {
                 -webkit-transform: translateX(14px);
                 -ms-transform: translateX(14px);
                 transform: translateX(14px);
               }
             `}</style>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  )
}

export default Header
