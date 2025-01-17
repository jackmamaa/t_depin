import { useState } from 'react';
import { PopupWindow } from '../components';
import { useGlobalContext } from '../context/GlobalContext';

interface Props {
  onClose: (data?: any) => void;
  onSubmit: (key_name: string) => void;
}

export default function CreateKeyForm({ onClose, onSubmit }: Props) {
  const { keys } = useGlobalContext();
  const [name, setName] = useState('');
  const [nameWarning, setNameWarning] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    if (keys.some(key => key.name === value)) {
      setNameWarning('This key name already exists.');
    } else {
      setNameWarning('');
    }
  };

  const handleSubmit = async () => {
    if (!name || keys.some(key => key.name === name)) {
      const nameInput = document.querySelector('input[placeholder="Enter key name"]')
      nameInput?.classList.add('shake')
      setTimeout(() => nameInput?.classList.remove('shake'), 500)
      return
    }
    onSubmit(name);
    onClose();
  };

  return (
    <PopupWindow
      title="Create SSH Key"
      content={
        <div className="space-y-4 min-w-[500px]">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              className={`input input-bordered w-full ${nameWarning ? 'input-error' : ''}`}
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Enter key name"
              required
            />
            {nameWarning && <p className="text-error text-sm mt-1">{nameWarning}</p>}
          </div>
        </div>
      }
      onClose={onClose}
      onConfirm={handleSubmit}
      confirmText="Create"
      tips="Create an SSH key to securely access your instances via terminal."
    />
  );
} 