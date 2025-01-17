import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { useGlobalContext } from '../context/GlobalContext'
import { useVPN, VpnInfo } from '../hooks/useVPN'
import { PopupWindow, ActionDropdown } from '../components'
import VpnTable from './VPNTable'
import CreateVpnForm from './CreateVPNForm'
import VpnDetailsForm from './VPNDetailsForm'
import { useParams, useNavigate } from 'react-router-dom'

export default function VPNsMgr() {
  const { 
    instances,
    vpns, 
    setVPNs,
    setReloadVPNs, 
    truncateId, 
    isLoadingState,
  } = useGlobalContext()
  const { terminateVPN, updateVpnForId, addVPN, createVPN } = useVPN()
  const [selectedVPNs, setSelectedVPNs] = useState<string[]>([])
  const [selectedVPN, setSelectedVPN] = useState<VpnInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [detailPanelHeight, setDetailPanelHeight] = useState(400)
  const [showVPNForm, setShowVPNForm] = useState(false)
  const [formValues, setFormValues] = useState({
    name: '',
    cidr: '192.168.0.0/24'
  })
  const { vpnId } = useParams();
  const navigate = useNavigate();
  const tableRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const [tableHeaderHeight, setTableHeaderHeight] = useState(0);
  const tableHeaderRef = useRef<HTMLTableSectionElement>(null);

  const handleDeleteVPN = async (vpnId: string) => {
    try {
      const result = await terminateVPN(vpnId)
      if (result.status === 200) {
        setVPNs(prev => prev.filter(vpn => vpn.vpn_id !== vpnId))
        toast.success(result.details)
      } else {
        toast.info(result.error)
      }
    } catch (error) {
      console.error('Failed to delete VPN:', error)
      toast.error('Failed to delete VPN')
    }
  }

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      for (const vpnId of selectedVPNs) {
        await handleDeleteVPN(vpnId)
      }
      setSelectedVPN(null)
      setSelectedVPNs([])
    } catch (error) {
      console.error('Batch delete failed:', error)
      toast.error('Batch delete failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedVPNs(vpns.map(vpn => vpn.vpn_id))
    } else {
      setSelectedVPNs([])
    }
  }

  const handleSelectVPN = (vpnId: string) => {
    setSelectedVPNs(prev => 
      prev.includes(vpnId)
        ? prev.filter(id => id !== vpnId)
        : [...prev, vpnId]
    )
  }

  const handleCreateVPN = () => {
    setFormValues({
      name: '',
      cidr: '192.168.0.0/24'
    })
    setShowVPNForm(true)
  }

  const handleFormSubmit = async () => {
    setShowVPNForm(false)
    try {
      const tempId = 'pending_' + Date.now()
      const tempVPN: VpnInfo = {
        vpn_id: tempId,
        name: formValues.name,
        cidr: formValues.cidr,
        state: 'Creating'
      }
      setVPNs(prev => [...prev, tempVPN])
      await addVPN(tempVPN)
      const result = await createVPN(tempVPN.vpn_id, tempVPN.name, tempVPN.cidr)
      if (result) {
        setVPNs(prev => prev.map(vpn => 
          vpn.vpn_id === tempId ? result : vpn
        ))
      }
    } catch (error) {
      console.error('Failed to create VPN:', error)
      toast.error('Failed to create VPN')
    }
    
  }

  const renderCreateFormContent = () => {
    return (
      <div className="min-w-[500px]">
        <CreateVpnForm
          vpns={vpns}
          formValues={formValues}
          onValuesChange={setFormValues}
        />
      </div>
    )
  }

  const handleUpdateVpnName = async (vpnId: string, newName: string) => {
    const result = await updateVpnForId(vpnId, { name: newName })
    if (result) {
      setVPNs(prev => prev.map(vpn => vpn.vpn_id === vpnId ? { ...vpn, name: newName } : vpn))
    }
  }

  const handleRowClick = (vpn: VpnInfo) => {
    setSelectedVPNs(prev => prev.includes(vpn.vpn_id) ? [] : [vpn.vpn_id])
    if (vpn.vpn_id === selectedVPN?.vpn_id) {
      setSelectedVPN(null)
      navigate('/vpn')
    } else {
      setSelectedVPN(vpns.find(v => v.vpn_id === vpn.vpn_id) || null)
      navigate(`/vpn/${vpn.vpn_id}`)
      
      setTimeout(() => {
        const row = document.querySelector(`[data-vpn-id="${vpn.vpn_id}"]`);
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
    if (vpnId) {
      const vpn = vpns.find(v => v.vpn_id === vpnId);
      if (vpn) {
        setSelectedVPN(vpn);
        setSelectedVPNs([vpn.vpn_id]);
      }
    }
  }, [vpnId, vpns]);

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
                VPN Manager
                <span className="text-base text-base-content/50">
                  ({selectedVPNs.length}/{vpns.length})
                </span>
              </h1>
            </div>
            
            <div className="p-8 flex justify-between">
              <button
                onClick={handleCreateVPN}
                className="btn btn-primary btn-sm">
                Create VPN
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setReloadVPNs(v => v + 1)}
                  className="btn btn-outline btn-sm"
                  disabled={isLoadingState.isVPNsLoading}>
                  Reload
                </button>
                <ActionDropdown 
                  items={[
                    { 
                      label: 'Delete', 
                      onClick: handleDelete, 
                      disabled: selectedVPNs.length === 0 || isLoading,
                      className: `w-full text-left px-4 py-2 ${
                        selectedVPNs.length === 0 
                          ? 'text-base-content/50 cursor-not-allowed' 
                          : 'text-error hover:text-error'
                      }`
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
                height: selectedVPN 
                  ? `calc(100vh - ${detailPanelHeight + headerHeight + tableHeaderHeight + 12}px)`
                  : `calc(100vh - ${headerHeight + tableHeaderHeight + 12}px)`
              }}
            >
              <VpnTable 
                vpns={vpns}
                isVpnsLoading={isLoadingState.isVPNsLoading}
                selectedVpns={selectedVPNs}
                onSelectAll={handleSelectAll}
                onSelectVpn={handleSelectVPN}
                onRowClick={handleRowClick}
                selectedVpn={selectedVPN}
                truncateId={truncateId}
                onUpdateVpnName={handleUpdateVpnName}
                tableHeaderRef={tableHeaderRef}
              />
            </div>
          </div>

          {selectedVPN && (
            <div className="flex-none">
              <VpnDetailsForm 
                vpn={selectedVPN} 
                instances={instances}
                onClose={() => {
                  setSelectedVPN(null);
                  navigate('/vpn');
                }}
                onHeightChange={setDetailPanelHeight}
              />
            </div>
          )}

          {showVPNForm && (
            <PopupWindow
              title="Create VPN"
              content={renderCreateFormContent()}
              onClose={() => setShowVPNForm(false)}
              closeText="Cancel"
              onConfirm={() => {
                const nameInput = document.querySelector('input[name="name"]')
                const cidrInput = document.querySelector('input[name="cidr"]')
                
                if (!formValues.name || vpns.some(vpn => vpn.name === formValues.name)) {
                  nameInput?.classList.add('shake')
                  setTimeout(() => nameInput?.classList.remove('shake'), 500)
                  return
                }
                
                if (!formValues.cidr || !/^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/.test(formValues.cidr)) {
                  cidrInput?.classList.add('shake')
                  setTimeout(() => cidrInput?.classList.remove('shake'), 500)
                  return
                }
                
                handleFormSubmit()
              }}
              confirmText="Create"
              tips="Create a VPN and attach it when creating an instance, so that multiple instances are in the same network, which solves the communication problem between instances."
            />
          )}
        </div>
      </div>
    </div>
  )
}
