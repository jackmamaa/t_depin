import { useState } from 'react';
import { useKey, SshKey } from './useKey';
import { useGlobalContext } from '../context/GlobalContext';
import { ActionDropdown } from '../components';
import CreateKeyForm from './CreateKeyForm';
import KeyTable from './KeyTable';

export default function KeysManager() {
  const { keys, setKeys, setReloadKeys, isLoadingState } = useGlobalContext();
  const { createKey, deleteKey, updateKey } = useKey();
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<SshKey | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreateKey = async (name: string) => {
    try {
      const data = await createKey(name);
      setKeys([...keys, data])
    } catch (error) {
      console.error('Failed to create SSH key:', error);
    }
  };

  const handleUpdateKey = async (key: SshKey) => {
    try {
      const data = await updateKey(key.key_id, key.name);
      if (data) {
        setKeys(keys.map(k => k.key_id === key.key_id ? key : k));
      }
    } catch (error) {
      console.error('Failed to update SSH key:', error);
    }
  };

  const handleDeleteKey = async (keyIds: string[]) => {
    try {
      await Promise.all(keyIds.map(id => deleteKey(id)));
      setKeys(keys.filter(key => !keyIds.includes(key.key_id)));
      setSelectedKeys([]);
      setSelectedKey(null);
    } catch (error) {
      console.error('Failed to delete SSH key:', error);
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedKeys(event.target.checked ? keys.map(key => key.key_id) : []);
  };

  const handleSelectKey = (keyId: string) => {
    setSelectedKeys(prev => 
      prev.includes(keyId) 
        ? prev.filter(id => id !== keyId)
        : [...prev, keyId]
    );
  };

  const handleRowClick = (key: SshKey) => {
    setSelectedKeys(prev => prev.includes(key.key_id) ? [] : [key.key_id])
    if (key.key_id === selectedKey?.key_id) {
      setSelectedKey(null);
    } else {
      setSelectedKey(keys.find(k => k.key_id === key.key_id) || null)
    }
  }

  return (
    <div className="card bg-base-100 w-full h-full">
      <div className="card-body p-0 flex flex-col h-full">
        <div className="flex-none p-8 pb-4">
          <h1 className="text-2xl font-bold">
            SSH Keys
            <span className="text-base text-base-content/50">
              ({selectedKeys.length}/{keys.length})
            </span>
          </h1>
        </div>
        
        <div className="flex-none p-8 flex justify-between">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary btn-sm">
            Create Key
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => setReloadKeys(v => v + 1)}
              className="btn btn-outline btn-sm"
              disabled={isLoadingState.isKeysLoading}>
              Reload
            </button>
            <ActionDropdown 
              items={[
                { 
                  label: 'Delete', 
                  onClick: () => handleDeleteKey(selectedKeys),
                  disabled: selectedKeys.length === 0,
                  className: 'text-error'
                }
              ]}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <KeyTable
              keys={keys}
              isKeysLoading={isLoadingState.isKeysLoading}
              selectedKeys={selectedKeys}
              onSelectAll={handleSelectAll}
              onSelectKey={handleSelectKey}
              onRowClick={handleRowClick}
              selectedKey={selectedKey}
              onUpdateKey={handleUpdateKey}
            />
          </div>
        </div>

        {isCreateModalOpen && (
          <CreateKeyForm
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateKey}
          />
        )}
      </div>
    </div>
  );
} 