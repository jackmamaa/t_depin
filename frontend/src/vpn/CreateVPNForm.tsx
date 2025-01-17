import { useState } from 'react'
import { VpnInfo } from '../hooks/useVPN'

interface CreateVpnFormProps {
  vpns: VpnInfo[]
  formValues: any
  onValuesChange: (values: any) => void
}

export default function CreateVpnForm({ 
  vpns, 
  formValues,
  onValuesChange,
}: CreateVpnFormProps) {
  const [nameWarning, setNameWarning] = useState<string>('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const newValues = { ...formValues, [name]: value }
    onValuesChange(newValues)

    if (name === 'name') {
      if (vpns.some(vpn => vpn.name === value)) {
        setNameWarning('This VPN name already exists.')
      } else {
        setNameWarning('')
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="form-control">
        <label className="label">
          <span className="label-text">VPN Name</span>
        </label>
        <input
          type="text"
          name="name"
          className={`input input-bordered ${nameWarning ? 'input-error' : ''}`}
          value={formValues.name}
          placeholder="My first VPN"
          onChange={handleChange}
          required
        />
        {nameWarning && <p className="text-error text-sm mt-1">{nameWarning}</p>}
      </div>
      
      <div className="form-control">
        <label className="label">
          <span className="label-text">CIDR</span>
        </label>
        <input
          type="text"
          name="cidr"
          className="input input-bordered"
          value={formValues.cidr}
          onChange={handleChange}
          placeholder="192.168.0.0/24"
          required
          pattern="^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$"
        />
      </div>
    </div>
  )
} 