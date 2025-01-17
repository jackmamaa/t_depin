import { useState } from 'react';
import { useScript, LaunchScript } from './useScript';
import { useGlobalContext } from '../context/GlobalContext';
import { ActionDropdown } from '../components';
import CreateScriptForm from './CreateScriptForm';
import ScriptTable from './ScriptTable';
import { toast } from 'react-toastify';

export default function ScriptsManager() {
  const { scripts, setScripts, setReloadScripts, isLoadingState } = useGlobalContext()
  const { createScript, updateScript, deleteScript } = useScript()
  const [selectedScript, setSelectedScript] = useState<LaunchScript | null>(null);
  const [selectedScripts, setSelectedScripts] = useState<string[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<LaunchScript | null>(null);

  const handleCreateScript = async (params: LaunchScript) => {
    try {
      const result = await createScript(params)
      if (result) {
        setScripts(prev => [...prev, params])
      }
    } catch (error) {
      console.error('Failed to create script:', error)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedScripts(scripts.map(script => script.script_id))
    } else {
      setSelectedScripts([])
    }
  }

  const handleUpdateScript = async (params: LaunchScript) => {
    try {
      if (params.tags === 'default') {
        toast.info('Default script cannot be updated')
        return
      }
      const data = await updateScript(params.script_id, params);
      if (data) {
        setScripts(prev => prev.map(script => 
          script.script_id === params.script_id ? params : script
        ));
      }
      if (editingScript) {
        setEditingScript(null);
      }
    } catch (error) {
      console.error('Failed to update script:', error);
    }
  }

  const handleDeleteScript = async (ids: string[]) => {
    try {
      const defaultScript = scripts.find(s => s.tags === 'default')
      if (defaultScript) {
        toast.info('Default script cannot be deleted')
        return
      }
      ids.forEach(id => deleteScript(id));
      setScripts(scripts.filter(script => !ids.includes(script.script_id)));
    } catch (error) {
      console.error('Failed to delete script:', error);
    }
  }

  const handleSelectScript = (scriptId: string) => {
    setSelectedScripts(prev => 
      prev.includes(scriptId) 
        ? prev.filter(id => id !== scriptId)
        : [...prev, scriptId]
    );
  };

  const handleRowClick = (script: LaunchScript) => {
    setSelectedScripts(prev => prev.includes(script.script_id) ? [] : [script.script_id])
    if (script.script_id === selectedScript?.script_id) {
      setSelectedScript(null);
    } else {
      setSelectedScript(scripts.find(s => s.script_id === script.script_id) || null)
    }
  }

  return (
    <div className="card bg-base-100 w-full h-full">
      <div className="card-body p-0 flex flex-col h-full">
        <div className="flex-none p-8 pb-4">
          <h1 className="text-2xl font-bold">
            Launch Scripts
            <span className="text-base text-base-content/50">
              ({selectedScripts.length}/{scripts.length})
            </span>
          </h1>
        </div>
        
        <div className="flex-none p-8 flex justify-between">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary btn-sm">
            Create Script
          </button>
          <div className="flex gap-2">
            <button 
              onClick={() => setReloadScripts(v => v + 1)}
              className="btn btn-outline btn-sm"
              disabled={isLoadingState.isScriptsLoading}>
              Reload
            </button>
            <ActionDropdown 
              items={[
                {
                  label: 'Edit',
                  onClick: () => {
                    const script = scripts.find(s => s.script_id === selectedScripts[0]);
                    if (script) {
                      setEditingScript(script);
                    }
                  },
                  disabled: selectedScripts.length !== 1
                },
                {
                  label: 'Delete', 
                  onClick: () => handleDeleteScript(selectedScripts),
                  disabled: selectedScripts.length === 0,
                  className: 'text-error'
                }
              ]}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto">
            <ScriptTable
              scripts={scripts}
              isScriptsLoading={isLoadingState.isScriptsLoading}
              selectedScripts={selectedScripts}
              onSelectAll={(e) => handleSelectAll(e.target.checked)}
              onSelectScript={handleSelectScript}
              onRowClick={handleRowClick}
              selectedScript={selectedScript}
              onUpdateScriptName={handleUpdateScript}
            />
          </div>
        </div>

        {isCreateModalOpen && (
          <CreateScriptForm
            onClose={() => setIsCreateModalOpen(false)}
            onSubmit={handleCreateScript}
          />
        )}

        {editingScript && (
          <CreateScriptForm
            onClose={() => setEditingScript(null)}
            onSubmit={handleUpdateScript}
            initialData={editingScript}
          />
        )}
      </div>
    </div>
  );
} 