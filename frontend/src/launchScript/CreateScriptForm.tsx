import { useState } from 'react';
import { LaunchScript } from './useScript';
import { PopupWindow } from '../components';
import { v4 as uuidv4 } from 'uuid';
import { useGlobalContext } from '../context/GlobalContext';

interface Props {
  onClose: (data?: any) => void;
  onSubmit: (params: LaunchScript) => void;
  initialData?: LaunchScript;
}

export default function CreateScriptForm({ onClose, onSubmit, initialData }: Props) {
  const { scripts } = useGlobalContext();
  const [name, setName] = useState(initialData?.name || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [nameWarning, setNameWarning] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    if (!initialData && scripts.some(script => script.name === value)) {
      setNameWarning('This script name already exists.');
    } else {
      setNameWarning('');
    }
  };

  const handleSubmit = () => {
    if (!name || (!initialData && scripts.some(script => script.name === name))) {
      const nameInput = document.querySelector('input[placeholder="Enter script name"]')
      nameInput?.classList.add('shake')
      setTimeout(() => nameInput?.classList.remove('shake'), 500)
      return
    }
    if (!content) {
      const contentInput = document.querySelector('textarea[placeholder="#!/bin/bash"]')
      contentInput?.classList.add('shake')
      setTimeout(() => contentInput?.classList.remove('shake'), 500)
      return
    }

    onSubmit({ 
      script_id: initialData
        ? initialData.script_id
        : uuidv4(),
      name: name,
      content,
      updated_at: Date.now(),
      tags: initialData?.tags
    });
    onClose();
  };

  return (
    <PopupWindow
      title={initialData ? "Edit Script" : "Create Script"}
      content={
        <div className="space-y-4 min-w-[500px]">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              className={`input input-bordered w-full ${nameWarning ? 'input-error' : ''}`}
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Enter script name"
              required
            />
            {nameWarning && <p className="text-error text-sm mt-1">{nameWarning}</p>}
          </div>
          <div>
            <label className="label">Content</label>
            <textarea
              className="textarea textarea-bordered w-full h-64 font-mono"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="#!/bin/bash"
              required
            />
          </div>
        </div>
      }
      onClose={onClose}
      onConfirm={handleSubmit}
      confirmText={initialData ? "Save" : "Create"}
      tips="Create a launch script that will be executed when the instance starts."
    />
  );
} 