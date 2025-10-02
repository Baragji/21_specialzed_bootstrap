import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormArray } from '../components/FormArray';

describe('FormArray extra coverage', () => {
  it('removes the correct item and ignores empty add', () => {
    const onChange = jest.fn();
    render(
      <FormArray
        label="List"
        values={["a", "b", "c"]}
        onChange={onChange}
      />
    );

    // Remove middle item
  const removeButtons = screen.getAllByRole('button', { name: 'x' });
  fireEvent.click(removeButtons[1]); // remove 'b'
    expect(onChange).toHaveBeenCalledWith(["a", "c"]);

    // Attempt to add with empty input (if component supports it via an Add button)
    const addButtons = screen.queryAllByRole('button', { name: /add/i });
    if (addButtons[0]) {
      fireEvent.click(addButtons[0]);
      // No additional call expected due to empty input guard
      expect(onChange).toHaveBeenCalledTimes(1);
    }
  });
});
