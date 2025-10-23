// Copyright 2018-2024 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { Provider } from 'react-redux'
import { createStore } from 'redux'
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import DatasetTags from '../../../components/datasets/DatasetTags'

const mockStore = createStore(() => ({
  tags: { isLoading: false, init: false, result: [], tags: [] },
}))

describe('DatasetTags Component', () => {
  it('should render without crashing', () => {
    const { container } = render(
      <Provider store={mockStore}>
        <DatasetTags datasetName='test_dataset' namespace='test_namespace' datasetTags={[]} />
      </Provider>
    )
    expect(container).toBeInTheDocument()
  })
})
