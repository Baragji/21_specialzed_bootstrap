import React from 'react';

type Props = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export function FormArray({ label, values, onChange, placeholder }: Props) {
  const [input, setInput] = React.useState('');
  return (
    <div>
      <label><strong>{label}</strong></label>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <input
          data-testid={`input-${label}`}
          value={input}
          placeholder={placeholder}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="button" onClick={() => { if (input.trim()) { onChange([...values, input.trim()]); setInput(''); } }}>Add</button>
      </div>
      <ul>
        {values.map((v, i) => (
          <li key={i}>
            {v}
            <button type="button" onClick={() => onChange(values.filter((_, idx) => idx !== i))}>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FormArray;
