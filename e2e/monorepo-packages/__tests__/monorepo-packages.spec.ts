import { test, expect } from '@jest/globals'
import { varInMainTs as varInImportedMainTs } from '@monoscope/anotherpackage'
import { varInSomepackage } from '@monoscope/somepackage'
import { varInMainTs } from '@monoscope/somepackage/main'

test('no subpath import', () => {
  expect(varInSomepackage).toBe(1)
})

test('subpath import', () => {
  expect(varInMainTs).toBe(2)
})

test("import from another module's export", () => {
  expect(varInImportedMainTs).toBe(2)
})
