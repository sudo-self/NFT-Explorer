// components/ConnectWallet.jsx

"use client";

import React from "react";
import {
  useAccount,
  useEnsName,
  useDisconnect,
} from "wagmi";
import {
  ConnectButton,
} from "@rainbow-me/rainbowkit";

const ConnectWallet = () => {
  const { address, isConnected } = useAccount();
  const { data: ensName } = useEnsName({ address });
  const { disconnect } = useDisconnect();

  return (
    <div className="flex items-center justify-center flex-col gap-2">
      <ConnectButton />

      {isConnected && (
        <div className="text-center mt-4 text-sm text-gray-500">
          🌈&nbsp;{" "}
          <span className="font-semibold">
            {ensName || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
          </span>
        </div>
      )}

      {isConnected && (
        <button
          onClick={() => disconnect()}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Disconnect
        </button>
      )}
    </div>
  );
};

export default ConnectWallet;
