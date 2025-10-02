import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormArray } from '../components/FormArray';

describe('FormArray', () => {
  it('adds and removes items', () => {
    const onChange = jest.fn();
    render(<FormArray label="labels" values={[]} onChange={onChange} placeholder="add" />);
    const input = screen.getByTestId('input-labels') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'urgent' } });
    fireEvent.click(screen.getByText('Add'));
    expect(onChange).toHaveBeenCalledWith(['urgent']);
  });
});
