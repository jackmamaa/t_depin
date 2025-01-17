import { useGlobalContext } from '../context/GlobalContext'
import { useAccount } from 'wagmi'
import { Link } from 'react-router-dom'

export default function DashBoard() {
  const {
    balance, 
    glmBalance, 
    isHolesky, 
    isPolygon, 
    checkDecimalZero
  } = useGlobalContext()
  const { isConnected } = useAccount()
  const { deposits, instances, vpns } = useGlobalContext()

  const totalLockedGLM = deposits && deposits.length > 0
    ? deposits.reduce((sum, deposit) => {
        const amount = Number(deposit.amount)
        return sum + (isNaN(amount) ? 0 : amount)
      }, 0)
    : 0

  const currentLockedBalance = deposits && deposits.length > 0
    ? deposits.reduce((sum, deposit) => {
        const balance = Number(deposit.balance)
        return sum + (isNaN(balance) ? 0 : balance)
      }, 0)
    : 0

  const allocations = deposits?.map((deposit) => deposit.allocation_id) || []

  return (
    <div className="card bg-base-100 w-full h-full">
      <div className="card-body">
        <h1 className="text-2xl font-bold mb-8 text-base-content">Dashboard</h1>
        {isConnected && (
          isHolesky || isPolygon ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 p-4">
              <div className="space-y-6 bg-base-200 p-6 rounded-xl">
                <h2 className="text-xl font-semibold mb-4 text-primary">Account Information</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-2 hover:bg-base-300 rounded-lg transition-colors">
                    <span className="text-base-content/80">{isPolygon ? 'POL' : 'ETH'}:</span>
                    <span className="font-semibold text-primary">{checkDecimalZero(balance) || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-base-300 rounded-lg transition-colors">
                    <span className="text-base-content/80">GLM:</span>
                    <span className="font-semibold text-primary">{checkDecimalZero(glmBalance) || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-base-300 rounded-lg transition-colors">
                    <span className="text-base-content/80">Locked GLM:</span>
                    <span className="font-semibold text-primary">{checkDecimalZero(totalLockedGLM) || '0'}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-base-300 rounded-lg transition-colors">
                    <span className="text-base-content/80">Locked Balance:</span>
                    <span className="font-semibold text-primary">{checkDecimalZero(currentLockedBalance) || '0'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 bg-base-200 p-6 rounded-xl">
                <h2 className="text-xl font-semibold mb-4 text-primary">Services Statistics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-2 hover:bg-base-300 rounded-lg transition-colors">
                    <span className="text-base-content/80">Deposits:</span>
                    <Link to="/deposit" className="font-semibold text-primary hover:text-primary-focus underline">
                      {deposits?.length || 0}
                    </Link>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-base-300 rounded-lg transition-colors">
                    <span className="text-base-content/80">Allocations:</span>
                    <span className="font-semibold text-primary">{allocations?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-base-300 rounded-lg transition-colors">
                    <span className="text-base-content/80">VPNs:</span>
                    <Link to="/vpn" className="font-semibold text-primary hover:text-primary-focus underline">
                      {vpns?.length || 0}
                    </Link>
                  </div>
                  <div className="flex justify-between items-center p-2 hover:bg-base-300 rounded-lg transition-colors">
                    <span className="text-base-content/80">Instances:</span>
                    <Link to="/instance/index" className="font-semibold text-primary hover:text-primary-focus underline">
                      {instances?.length || 0}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="alert alert-warning shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Please switch to holesky network</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
