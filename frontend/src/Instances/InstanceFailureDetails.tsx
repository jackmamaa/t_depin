import { PopupWindow } from '../components';
import { InstanceInfo } from '../hooks/useInstance';

interface InstanceFailureDetailsProps {
  instance: InstanceInfo;
  onClose: () => void;
  onRetry: (instance: InstanceInfo) => void;
}

export default function InstanceFailureDetails({ 
  instance, 
  onClose,
  onRetry 
}: InstanceFailureDetailsProps) {
  return (
    <PopupWindow
      title="Instance Creation Failed"
      content={
        <div className="flex flex-col gap-4">
          <div dangerouslySetInnerHTML={{
            __html: instance.details?.replace(
              /(https?:\/\/[^\s]+)/g,
              url => `<a href="${url}" target="_blank" class="underline text-blue-500">${url}</a>`
            ).replace(/\n/g, '<br />') || ''
          }} />
          <p className="text-sm text-base-content/70">
            Click "Modify & Retry" to try creating the instance again with modified configuration.
          </p>
        </div>
      }
      onClose={onClose}
      onConfirm={() => {
        onClose();
        onRetry(instance);
      }}
      closeText="Close"
      confirmText="Modify & Retry"
    />
  );
} 