// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, test } from 'vitest'
import MinimumFilterControls from '../src/components/MinimumFilterControls'

afterEach(cleanup)

function GradeFilter() {
  const [minimum, setMinimum] = useState<number | null>(null)

  return (
    <MinimumFilterControls
      scale={{ kind: 'grade', field: 'grade_01', min: 0, max: 10, missingCount: 0 }}
      minimum={minimum}
      onChange={setMinimum}
    />
  )
}

test('the grade slider applies a cutoff and Reset restores all values', () => {
  render(<GradeFilter />)

  const slider = screen.getByRole<HTMLInputElement>('slider', { name: 'Grade' })
  expect(screen.getByRole('status').textContent).toBe('All values')

  fireEvent.change(slider, { target: { value: '5' } })
  expect(screen.getByRole('status').textContent).toBe('≥ 5')
  expect(slider.getAttribute('aria-valuetext')).toBe('At least 5')

  fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
  expect(screen.getByRole('status').textContent).toBe('All values')
  expect(slider.value).toBe('0')
})
