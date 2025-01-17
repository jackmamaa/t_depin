import React from 'react';

export type StateType = 
  | 'Active' 
  | 'Creating' 
  | 'CreateFailed'
  | 'Terminating' 
  | 'Terminated' 
  | 'Modifying' 
  | 'CreatingAllocation'
  | 'Expired'
  | 'Error';

interface ShowStateProps {
  state: StateType;
  className?: string;
}

const getStateClass = (state: StateType): string => {
  if (state === 'Active') {
    return 'badge-success';
  }
  if (state === 'Error') {
    return 'badge-error';
  }
  return 'badge-warning';
};

const isLoadingState = (state: StateType): boolean => {
  return ['Creating', 'Terminating', 'Modifying', 'CreatingAllocation'].includes(state);
};

const stateTextMap: Record<StateType, string> = {
  Active: 'Active',
  Creating: 'Creating',
  CreateFailed: 'CreateFailed',
  Terminating: 'Terminating',
  Terminated: 'Terminated',
  Modifying: 'Modifying',
  CreatingAllocation: 'CreatingAllocation',
  Expired: 'Expired',
  Error: 'Error'
};

export const ShowState: React.FC<ShowStateProps> = ({ state, className }) => {
  return (
    <div className="flex items-center gap-2">
      <span className={`badge ${getStateClass(state)} ${className || ''}`}>
        {stateTextMap[state]}
      </span>
      {isLoadingState(state) && (
        <span className="loading loading-spinner loading-xs"></span>
      )}
    </div>
  );
};

export default ShowState;
