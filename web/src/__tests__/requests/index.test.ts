// Copyright 2018-2023 contributors to the Marquez project
// SPDX-License-Identifier: Apache-2.0

import { vi } from 'vitest'
import { parseResponse } from '../../store/requests'

export const mockFetch = (requestBody: any = []) => {
  return vi.fn().mockImplementation(() => Promise.resolve({
    json: () => Promise.resolve(requestBody),
    text: () => Promise.resolve(JSON.stringify(requestBody)),
    ok: true
  }))
}

const generateMockResponse = (status = 200, ok: boolean, returnBody?: object) => ({
  ok,
  status,
  json: () => Promise.resolve(returnBody || {}),
  text: () => Promise.resolve(returnBody ? JSON.stringify(returnBody) : '')
})

describe('parseResponse function', () => {
  describe('for a successful response', () => {
    it('returns Success if body does not exist', async () => {
      const testResponse = generateMockResponse(201, true, null)
      expect(parseResponse(testResponse, 'testFunctionName')).resolves.toEqual('Success')
    })

    it('returns parsed body if body does exist', async () => {
      const testBody = { hasBody: true }
      const testResponse = generateMockResponse(200, true, testBody)
      expect(parseResponse(testResponse, 'testFunctionName')).resolves.toEqual(testBody)
    })
  })

  describe('for a unsuccessful response', () => {
    let testResponse: any

    beforeEach(() => {
      testResponse = generateMockResponse(500, false, { code: 500, message: 'Server Error', details: 'Test error' })
    })

    it('throws an error', async () => {
      await expect(parseResponse(testResponse, 'testFunctionName')).rejects.toThrow()
    })

    it('produces the correct error message format', async () => {
      // Test that the error message follows the expected format
      // This tests the behavior without relying on internal implementation details
      await expect(parseResponse(testResponse, 'testFunctionName'))
        .rejects.toMatch(/testFunctionName responded with error code 500: Server Error/)
    })
  })
})
