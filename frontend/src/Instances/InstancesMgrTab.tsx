import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { useGlobalContext } from '../context/GlobalContext'
import { useInstance, InstanceInfo, InitConfig } from '../hooks/useInstance'
import { useUserSettings } from '../hooks/useUserSettings'
import { PopupWindow, ActionDropdown, Tips } from '../components'
import CreateInstanceCard from './CreateInstanceCard'
import InstanceDetails from './InstanceDetailsForm'
import InstanceTable from './InstanceTable'
import SshConfigDialog, { SshConfig } from './SshConfigDialog'
import { useParams, useNavigate } from 'react-router-dom'

export default function InstancesMgr() {
  const { 
    instances, deposits, vpns, 
    getInstances, setInstances, setReloadInstances, 
    providerResources, isLoadingState, 
    truncateId, fetchWithoutLoading
  } = useGlobalContext() 
  const { terminateInstance, updateInstance } = useInstance();
  const [selectedInstances, setSelectedInstances] = useState<string[]>([])
  const [selectedInstance, setSelectedInstance] = useState<InstanceInfo | null>(null)
  const [detailPanelHeight, setDetailPanelHeight] = useState(400)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [retryInstance, setRetryInstance] = useState<InstanceInfo | null>(null);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [showSshConfig, setShowSshConfig] = useState(false);
  const { settings, updateSettings } = useUserSettings();
  const autoRefreshInterval = 15000;
  const { agreementId } = useParams();
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const [tableHeaderHeight, setTableHeaderHeight] = useState(0);
  const tableHeaderRef = useRef<HTMLTableSectionElement>(null);

  const handleTerminateInstance = async (agreementIds: string[]) => {
    try {
      setInstances(prev => prev.map(inst => 
        agreementIds.includes(inst.agreement_id)
          ? { ...inst, state: 'Terminating' }
          : inst
      ));

      const result = await terminateInstance(agreementIds);
      if (result.success) {
        setInstances(prev => prev.map(inst => 
          agreementIds.includes(inst.agreement_id)
            ? { ...inst, state: 'Terminated' }
            : inst
        ));
        setSelectedInstance(null);
        setSelectedInstances([]);
      } else {
        throw new Error(result.details);
      }
    } catch (error) {
      console.error('Batch terminate failed:', error);
      toast.error('Batch terminate failed');
      
      setInstances(prev => prev.map(inst => 
        agreementIds.includes(inst.agreement_id) && inst.state === 'Terminating'
          ? { ...inst, state: 'Error' }
          : inst
      ));
    }
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedInstances(instances.map(instance => instance.agreement_id))
    } else {
      setSelectedInstances([])
    }
  }

  const handleSelectInstance = (instanceId: string) => {
    setSelectedInstances(prev => 
      prev.includes(instanceId) 
        ? prev.filter(id => id !== instanceId)
        : [...prev, instanceId]
    )
  }

  const handleCloseCreateInstanceForm = (instanceData?: InstanceInfo | undefined) => {
    setIsCreateModalOpen(false);
    setRetryInstance(null);
    if (instanceData) {
      setInstances(prev => [...prev, instanceData]);
    }
  };

  const handleUpdateInstanceName = async (agreementId: string, newName: string) => {
    const instance = instances.find(inst => inst.agreement_id === agreementId)
    if (instance?.name !== newName) {
      const result = await updateInstance(agreementId, { name: newName })
      if (result.success) {
      setInstances(prev => prev.map(inst => 
        inst.agreement_id === agreementId ? { ...inst, name: newName } : inst
        ))
      }
    }
  }

  const canTerminateInstances = () => {
    if (selectedInstances.length === 0) return false;
    
    return instances
      .filter(d => selectedInstances.includes(d.agreement_id))
      .some(d => d.state === 'Active');
  }

  const getTerminateInstanceStatus = (instanceIds: string[]) => {
    return instances
      .filter(d => instanceIds.includes(d.agreement_id))
      .reduce((acc, d) => {
        if (d.state === 'Active') {
          acc.canTerminate.push(d)
        } else {
          acc.cannotTerminate.push(d)
        }
        return acc
      }, { canTerminate: [] as InstanceInfo[], cannotTerminate: [] as InstanceInfo[] })
  }

  const handleTerminateConfirm = () => {
    setShowTerminateConfirm(false)
    const { canTerminate } = getTerminateInstanceStatus(selectedInstances)
    if (canTerminate.length > 0) {
      handleTerminateInstance(canTerminate.map(d => d.agreement_id))
    }
  }

  const renderTerminateConfirmContent = () => {
    const { canTerminate, cannotTerminate } = getTerminateInstanceStatus(selectedInstances)
    return (
      <div className="text-left min-w-[400px]">
        {canTerminate.length > 0 && (
          <>
            <h2>Confirm termination:</h2>
            <div className="max-h-[120px] overflow-y-auto pr-2">
                <ul className="list-disc ml-4 text-sm text-base-content/50">
                  {canTerminate.map(d => (
                    <li key={d.agreement_id}>
                      {d.name} - {truncateId(d.agreement_id, 8, 16)} (Active)
                    </li>
                  ))}
              </ul>
            </div>
          </>
        )}
        {cannotTerminate.length > 0 && (
          <>
              <h2>Unable to terminate:</h2>
              <div className="max-h-[120px] overflow-y-auto pr-2">
                <ul className="list-disc ml-4 text-warning text-sm text-base-content/50">
                  {cannotTerminate.map(d => (
                  <li key={d.agreement_id}>
                    {d.name} - {truncateId(d.agreement_id, 8, 16)} ({d.state})
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    )
  }

  const handleRetryInstance = (failedInstance: InstanceInfo) => {
    if (!failedInstance.configure) {
      console.error('No configuration found for failed instance');
      return;
    }

    let config: InitConfig;
    try {
      config = typeof failedInstance.configure === 'string' 
        ? JSON.parse(failedInstance.configure)
        : failedInstance.configure;
      
      setRetryInstance({
        ...failedInstance,
        configure: config
      });
      setIsCreateModalOpen(true);
    } catch (error) {
      console.error('Failed to parse instance configuration:', error);
      toast.error('Failed to load instance configuration');
    }
  };

  const handleOpenTerminal = (agreementId: string, config: SshConfig) => {
    const terminalUrl = `/instance/${agreementId}/terminal`;
    const serializedState = JSON.stringify({ sshConfig: config });
    window.open(`${terminalUrl}?opts=${encodeURIComponent(serializedState)}`);
  }

  const handleRowClick = (instance: InstanceInfo) => {
    setSelectedInstances(prev => prev.includes(instance.agreement_id) ? [] : [instance.agreement_id])
    if (instance.agreement_id === selectedInstance?.agreement_id) {
      setSelectedInstance(null)
      navigate('/instance/index')
    } else {
      setSelectedInstance(instance)
      navigate(`/instance/${instance.agreement_id}`)
      
      setTimeout(() => {
        const row = document.querySelector(`[data-instance-id="${instance.agreement_id}"]`);
        if (row && tableRef.current) {
          const rowRect = row.getBoundingClientRect();
          const containerRect = tableRef.current.getBoundingClientRect();
          
          if (rowRect.bottom > containerRect.bottom || rowRect.top < containerRect.top) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);
    }
  }

  useEffect(() => {
    if (!settings.instancesAutoRefresh) return;
    
    const intervalId = setInterval(() => {
      if (instances.length > 0) {
        fetchWithoutLoading(getInstances);
      }
    }, autoRefreshInterval);

    return () => clearInterval(intervalId);
  }, [settings.instancesAutoRefresh, autoRefreshInterval, instances, fetchWithoutLoading, getInstances]);

  useEffect(() => {
    if (agreementId) {
      const instance = instances.find(i => i.agreement_id === agreementId);
      if (instance) {
        setSelectedInstance(instance);
        setSelectedInstances([instance.agreement_id]);
      }
    }
  }, [agreementId, instances]);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  useEffect(() => {
    const updateTableHeaderHeight = () => {
      if (tableHeaderRef.current) {
        setTableHeaderHeight(tableHeaderRef.current.offsetHeight);
      }
    };

    updateTableHeaderHeight();
    window.addEventListener('resize', updateTableHeaderHeight);

    return () => {
      window.removeEventListener('resize', updateTableHeaderHeight);
    };
  }, []);

  return (
    <div className="card bg-base-100 w-full h-full">
      <div className="card-body p-0">
        <div className="flex flex-col h-full">
          <div ref={headerRef} className="flex-none bg-base-100">
            <div className="p-8 pb-4">
              <h1 className="text-2xl font-bold">
                Instances Manager 
                <span className="text-base text-base-content/50">
                  ({selectedInstances.length}/{instances.length})
                </span>
              </h1>
            </div>
            
            <div className="p-8 flex justify-between">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn btn-primary btn-sm">
                Create Instance
              </button>
              <div className="flex gap-2">
                <div className="flex items-center gap-2">
                  <Tips content="Auto refresh instances state every 15 seconds. If you find it unsmooth, you can disable it." />
                  <span className="text-sm">Auto refresh</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm"
                    checked={settings.instancesAutoRefresh}
                    onChange={(e) => {
                      updateSettings({
                        instancesAutoRefresh: e.target.checked
                      });
                    }}
                  />
                </div>
                <button
                  onClick={() => setReloadInstances(v => v + 1)}
                  className="btn btn-outline btn-sm"
                  disabled={isLoadingState.isInstancesLoading}>
                  Reload
                </button>
                <ActionDropdown 
                  items={[
                    { 
                      label: 'Terminate', 
                      onClick: () => setShowTerminateConfirm(true),
                      disabled: !canTerminateInstances(),
                      className: `w-full text-left px-4 py-2 ${
                        selectedInstances.length === 0 
                          ? 'text-base-content/50 cursor-not-allowed' 
                          : 'text-error hover:text-error'
                      }`
                    },
                    {
                      label: 'Open Terminal',
                      onClick: () => {
                        const instance = instances.find(i => selectedInstances[0] === i.agreement_id);
                        if (instance) {
                          setShowSshConfig(true);
                        }
                      },
                      disabled: selectedInstances.length === 0 || selectedInstance?.state !== 'Active',
                      className: 'w-full text-left px-4 py-2'
                    }
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <div 
              ref={tableRef}
              className="h-full overflow-auto" 
              style={{ 
                height: selectedInstance 
                  ? `calc(100vh - ${detailPanelHeight + headerHeight + tableHeaderHeight + 12}px)`
                  : `calc(100vh - ${headerHeight + tableHeaderHeight + 12}px)`
              }}
            >
              <InstanceTable 
                instances={instances}
                deposits={deposits}
                isInstancesLoading={isLoadingState.isInstancesLoading}
                selectedInstances={selectedInstances}
                onSelectAll={handleSelectAll}
                onSelectInstance={handleSelectInstance}
                onRowClick={handleRowClick}
                selectedInstance={selectedInstance}
                truncateId={truncateId}
                onUpdateInstanceName={handleUpdateInstanceName}
                onRetryInstance={handleRetryInstance}
                tableHeaderRef={tableHeaderRef}
              />
            </div>
          </div>

          {selectedInstance && (
            <div className="flex-none">
              <InstanceDetails 
                vpns={vpns}
                instance={selectedInstance} 
                onClose={() => {
                  setSelectedInstance(null);
                  navigate('/instance/index');
                }} 
                providerResources={providerResources}
                onHeightChange={setDetailPanelHeight}
              />
            </div>
          )}

          {isCreateModalOpen && (
            <CreateInstanceCard 
              onClose={handleCloseCreateInstanceForm}
              initialConfig={
                retryInstance?.configure || 
                (selectedInstance?.state === 'CreateFailed' 
                  ? (typeof selectedInstance.configure === 'string' 
                      ? JSON.parse(selectedInstance.configure)
                      : selectedInstance.configure)
                  : undefined)
              }
            />
          )}

          {showTerminateConfirm && (
            <PopupWindow
              title="Terminate Instances"
              content={renderTerminateConfirmContent()}
              onClose={() => setShowTerminateConfirm(false)}
              closeText="Cancel"
              onConfirm={handleTerminateConfirm}
              tips="Terminate and permanently delete the instance, note: This operation will result in the loss of all data for the instance"
            />
          )}

          {showSshConfig && selectedInstance && (
            <SshConfigDialog
              instanceId={selectedInstance.agreement_id}
              onClose={() => setShowSshConfig(false)}
              onConfirm={(config) => {
                setShowSshConfig(false);
                handleOpenTerminal(selectedInstance.agreement_id, config);
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}