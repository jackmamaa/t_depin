import React, { useState } from 'react'
import { LoadingStates } from '../context/ContextTypes'
import { DepositInfo } from '../hooks/useDeposit'

interface TimeOption {
  label: string
  minutes?: number
  hours?: number
  days?: number
}

const calculateDateTime = (baseDate: Date, option: TimeOption): string => {
  const date = baseDate
  if (option.minutes) date.setMinutes(date.getMinutes() + option.minutes)
  if (option.hours) date.setHours(date.getHours() + option.hours)
  if (option.days) date.setDate(date.getDate() + option.days)
  
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
    .toISOString()
    .slice(0, 16)
}

interface CreateDepositFormProps {
  deposits: DepositInfo[]
  type: 'new' | 'modify'
  formValues: any
  onValuesChange: (values: any) => void
  isLoadingState: LoadingStates
  availableBalance: number | string
  balance: string
}

const AmountInput = ({ 
  formValues, 
  onValuesChange, 
  availableBalance, 
  balance, 
  isModify 
}: { 
  formValues: any
  onValuesChange: (values: any) => void
  availableBalance: number | string
  balance: string
  isModify: boolean
}) => (
  <div className="form-control">
    <label className="label">
      <span className="label-text">{isModify ? 'Additional Amount' : 'Amount'}</span>
      <span className="label-text-alt text-base-content/50">Available: {availableBalance} GLM</span>
    </label>
    <div className="flex gap-2">
      <input
        type="number"
        name="amount"
        value={formValues.amount || ''}
        onChange={(e) => onValuesChange({ ...formValues, amount: e.target.value })}
        className="input input-bordered input-sm flex-1"
        required
        step="0.01"
        min="0.01"
        max={balance}
      />
      <button
        type="button"
        className="btn btn-sm btn-outline"
        onClick={() => onValuesChange({ 
          ...formValues, 
          amount: typeof availableBalance === 'number' ? availableBalance : balance 
        })}
      >
        Max
      </button>
    </div>
  </div>
)

const getTimeOptions = (type: 'new' | 'modify'): TimeOption[] => [
  { label: type === 'new' ? '10 Min' : '+ 10 Min', minutes: 10 },
  { label: type === 'new' ? '1 Hour' : '+ 1 Hour', hours: 1 },
  { label: type === 'new' ? '1 Day' : '+ 1 Day', days: 1 },
  { label: type === 'new' ? '7 Days' : '+ 7 Days', days: 7 }
]

export function CreateDepositForm({ 
  deposits,
  type, 
  formValues,
  onValuesChange,
  availableBalance,
  balance,
}: CreateDepositFormProps) {
  const [nameWarning, setNameWarning] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    onValuesChange({ ...formValues, [name]: value })

    if (name === 'name') {
      if (deposits.some(deposit => deposit.name === value)) {
        setNameWarning('This deposit name already exists.');
      } else {
        setNameWarning('');
      }
    }
  }

  return (
    <div className="space-y-4">
      {type === 'new' ? (
        <div className="form-control">
          <label className="label">
            <span className="label-text">Deposit Name</span>
          </label>
          <input
            type="text"
            name="name"
            value={formValues.name}
            placeholder="My first deposit"
            onChange={handleChange}
            className={`input input-bordered input-sm ${nameWarning ? 'input-error' : ''}`}
            required
          />
          {nameWarning && <p className="text-error text-sm mt-1">{nameWarning}</p>}
        </div>
      ) : (
        <h1>{formValues.name}</h1>
      )}

      <AmountInput 
        formValues={formValues}
        onValuesChange={onValuesChange}
        availableBalance={availableBalance}
        balance={balance}
        isModify={type === 'modify'}
      />

      <div className="form-control">
        <label className="label">
          <span className="label-text">{type === 'new' ? 'Valid To' : 'New Valid To'}</span>
        </label>
        <input
          type="datetime-local"
          name="validTo"
          value={formValues.validTo || ''}
          onChange={handleChange}
          className="input input-bordered input-sm"
          required
        />
        <div className="flex gap-2 mt-2">
          {getTimeOptions(type).map((option) => (
            <button
              key={option.label}
              type="button"
              className="btn btn-sm btn-outline"
              onClick={() => {
                onValuesChange({
                  ...formValues,
                  validTo: calculateDateTime(type === 'new' ? new Date() : new Date(formValues.validTo), option)
                })
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
