import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Index() {
  const ConnectToWallet = () => {
    return (
      <div className="flex justify-center">
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-full text-xl transition duration-300 ease-in-out transform hover:scale-105"
            >
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>
      </div>
    )
  }
  return (
    <div className="flex justify-center flex-col bg-gradient-to-br from-blue-100 h-screen w-full">
      <main className="container mx-auto px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Welcome to TdePIN</h1>
          <p className="text-xl mb-8">Experience the power of decentralized computing</p>
        </section>

        <section className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Decentralized Computing</h2>
              <p>Utilize the computing power of a global distributed network to achieve true decentralization</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Low Cost</h2>
              <p>Through shared resources and optimized allocation, significantly reduce computing costs</p>
            </div>
          </div>
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Decentralized</h2>
              <p>No need to rely on centralized services, protect privacy and data security</p>
            </div>
          </div>
        </section>
        <ConnectToWallet />
      </main>
    </div>
  );
};
