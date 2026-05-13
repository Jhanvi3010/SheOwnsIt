import { useEffect, useState } from 'react';
import CreatableSelect from 'react-select/creatable';
import axios from 'axios';
import toast from 'react-hot-toast';

type Option = { value: string; label: string };

type Props = {
  field: string;                          // e.g. 'category', 'specialty'
  defaultOptions?: Option[];              // hardcoded fallback while loading
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  styles?: object;
};

const CreatableDropdown = ({ field, defaultOptions = [], value, onChange, placeholder, styles }: Props) => {
  const [options, setOptions] = useState<Option[]>(defaultOptions);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    axios.get(`/api/options/${field}`)
      .then(res => setOptions(res.data))
      .catch(() => setOptions(defaultOptions))
      .finally(() => setIsLoading(false));
  }, [field]);

  const handleCreate = async (inputValue: string) => {
    const newOption: Option = {
      value: inputValue.toLowerCase().replace(/\s+/g, '_'),
      label: inputValue,
    };
    try {
      await axios.post(`/api/options/${field}`, newOption);
      setOptions(prev => [...prev, newOption]);
      onChange(newOption.value);
      toast.success(`"${inputValue}" added as a new option`);
    } catch {
      toast.error('Could not save new option');
    }
  };

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      border: `2px solid ${state.isFocused ? 'var(--primary)' : '#e2e8f0'}`,
      borderRadius: '10px',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(79,70,229,0.12)' : 'none',
      minHeight: '42px',
      background: '#f8fafc',
      transition: 'border-color 0.2s',
      '&:hover': { borderColor: 'var(--primary)' },
      cursor: 'pointer',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? 'var(--primary)' : state.isFocused ? 'var(--primary-light)' : 'transparent',
      color: state.isSelected ? '#fff' : 'var(--text-main)',
      borderRadius: '6px',
      margin: '2px 4px',
      width: 'calc(100% - 8px)',
      cursor: 'pointer',
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      zIndex: 99,
    }),
    menuList: (base: any) => ({ ...base, padding: '6px' }),
    singleValue: (base: any) => ({ ...base, color: 'var(--text-main)', fontWeight: 500 }),
    placeholder: (base: any) => ({ ...base, color: '#94a3b8' }),
    ...styles,
  };

  return (
    <CreatableSelect
      options={options}
      value={options.find(o => o.value === value) || null}
      onChange={(opt: any) => onChange(opt?.value || '')}
      onCreateOption={handleCreate}
      isLoading={isLoading}
      placeholder={placeholder || 'Select or type to add new…'}
      formatCreateLabel={(input) => `➕ Add "${input}" as new option`}
      styles={selectStyles}
      theme={(theme) => ({
        ...theme,
        colors: { ...theme.colors, primary: 'var(--primary)', primary25: 'var(--primary-light)' },
      })}
    />
  );
};

export default CreatableDropdown;
