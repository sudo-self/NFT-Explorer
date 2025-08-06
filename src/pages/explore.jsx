'use client';

import { useState, useEffect, useRef } from 'react';
import { BrowserProvider, JsonRpcProvider, keccak256, toUtf8Bytes } from 'ethers';
import NftCard from '../components/nftcard';
import { fetchNFTs } from '../utils/fetchNFTs';
import EthGLBViewer from '../components/EthModel';

function generateIdenticon(address, size = 8, scale = 4) {
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  const ctx = canvas.getContext('2d');

  if (!address) return null;

  const hash = keccak256(toUtf8Bytes(address));
  let color = '#' + hash.slice(2, 8);
  ctx.fillStyle = color;

  for (let i = 0; i < size * size; i++) {
    const x = (i % size) * scale;
    const y = Math.floor(i / size) * scale;
    if (parseInt(hash[i % hash.length], 16) % 2 === 0) {
      ctx.fillRect(x, y, scale, scale);
    }
  }
  return canvas.toDataURL();
}

const safeString = (input) => {
  if (typeof input === 'string') return input;
  if (typeof input === 'object' && input !== null) return JSON.stringify(input);
  return '';
};

const Explore = () => {
  const [owner, setOwner] = useState('');
  const [contractAddress, setContractAddress] = useState('');
  const [NFTs, setNFTs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedOwner, setSubmittedOwner] = useState('');
  const [ethPrice, setEthPrice] = useState(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [ensName, setEnsName] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [latestBlocks, setLatestBlocks] = useState([]);
  const [blocksLoading, setBlocksLoading] = useState(true);
  const [blocksError, setBlocksError] = useState(null);

  const [pageKey, setPageKey] = useState(null); // Pagination key for infinite scroll
  const containerRef = useRef(null);

  const ALCHEMY_API_URL = 'https://eth-mainnet.g.alchemy.com/v2/fIYnOgt3AYXKWnd62G3pu4trdY0fN2iQ';

  // Fetch ETH price once
  useEffect(() => {
    const fetchEthPrice = async () => {
      setPriceLoading(true);
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        const data = await res.json();
        setEthPrice(data.ethereum?.usd || null);
      } catch {
        setPriceError('Failed to fetch ETH price');
      } finally {
        setPriceLoading(false);
      }
    };
    fetchEthPrice();
  }, []);

  // Generate avatar from walletAddress
  useEffect(() => {
    if (walletAddress) {
      const dataUrl = generateIdenticon(walletAddress);
      setAvatarUrl(dataUrl);
    } else {
      setAvatarUrl(null);
    }
  }, [walletAddress]);

  // Fetch latest 4 blocks
  useEffect(() => {
    const fetchLatestBlocks = async () => {
      setBlocksLoading(true);
      setBlocksError(null);
      try {
        const provider = new JsonRpcProvider(ALCHEMY_API_URL);
        const latestBlockNumber = await provider.getBlockNumber();

        const blockPromises = [];
        for (let i = 0; i < 4; i++) {
          blockPromises.push(provider.getBlock(latestBlockNumber - i));
        }

        const blocks = await Promise.all(blockPromises);
        setLatestBlocks(blocks);
      } catch (err) {
        console.error(err);
        setBlocksError('Failed to load latest blocks');
      } finally {
        setBlocksLoading(false);
      }
    };

    fetchLatestBlocks();
  }, []);

  // Wallet connect
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];
      setWalletAddress(address);
      setOwner(address);

      try {
        const resolvedEns = await provider.lookupAddress(address);
        setEnsName(resolvedEns || null);
      } catch (ensErr) {
        console.warn('ENS lookup failed:', ensErr);
        setEnsName(null);
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
    }
  };

  // Wallet disconnect
  const disconnectWallet = () => {
    setWalletAddress(null);
    setEnsName(null);
    setAvatarUrl(null);
    setOwner('');
    setContractAddress('');
    setNFTs([]);
    setSubmittedOwner('');
    setError(null);
    setPageKey(null);
  };

  // Load NFTs with pagination
  const loadNFTs = async (ownerAddr, contractAddr, nextPageKey = null, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const { nfts, pageKey: newPageKey } = await fetchNFTs(ownerAddr, contractAddr, nextPageKey);

      if (append) {
        setNFTs((prev) => [...prev, ...nfts]);
      } else {
        setNFTs(nfts);
      }
      setPageKey(newPageKey || null);
    } catch (e) {
      setError('Failed to fetch NFTs. Please check the address.');
      if (!append) setNFTs([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle initial search
  const handleSearch = async (e) => {
    e.preventDefault();
    setSubmittedOwner(owner);
    setPageKey(null);
    await loadNFTs(owner, contractAddress, null, false);
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setOwner(text.trim());
    } catch (err) {
      console.error('Failed to read from clipboard', err);
    }
  };

  // Infinite scroll handler inside main container
  const handleScroll = () => {
    if (!containerRef.current || loading || !pageKey) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    // When within 150px from bottom, load more
    if (scrollHeight - scrollTop - clientHeight < 150) {
      loadNFTs(submittedOwner, contractAddress, pageKey, true);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [loading, pageKey, submittedOwner, contractAddress]);

  const truncate = (addr) => addr.slice(0, 6) + '...' + addr.slice(-4);

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white font-sans relative">
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900/90 backdrop-blur-md shadow-lg px-4 py-4">
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="absolute top-3 right-4 flex items-center gap-2">
            {avatarUrl && (
              <img
                src={avatarUrl}
                alt="Wallet Avatar"
                className="w-10 h-10 rounded-full border-2 border-indigo-500"
              />
            )}
            {walletAddress ? (
              <button
                onClick={disconnectWallet}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md shadow-md text-sm font-semibold whitespace-nowrap"
              >
                Disconnect: {ensName || truncate(walletAddress)}
              </button>
            ) : (
              <button onClick={connectWallet} aria-label="Connect with MetaMask">
                <img
                  src="/Metamask.svg"
                  alt="MetaMask Logo"
                  className="w-12 h-12 hover:scale-125 transition-transform"
                />
              </button>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight flex items-center justify-center gap-2">
            NFT Explorer
          </h1>

          <div className="mb-4 text-cyan-400 font-semibold text-lg flex items-center justify-center gap-2">
            <EthGLBViewer />
            {priceLoading && 'Loading ETH price...'}
            {priceError && <span className="text-red-500">{priceError}</span>}
            {!priceLoading && ethPrice && (
              <span>
                1 ETH = ${ethPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} USD
              </span>
            )}
          </div>

          <p className="text-gray-400 mb-6 text-lg max-w-xl mx-auto">
            Search NFTs on the blockchain by wallet or contract address
          </p>

          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto mb-4"
          >
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Wallet address"
              className="flex-1 bg-gray-700 rounded-md py-3 px-4 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="Contract address"
              className="flex-1 bg-gray-700 rounded-md py-3 px-4 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </form>

          <div className="flex justify-center gap-4 mb-2">
            <button
              onClick={handlePaste}
              className="bg-gray-600 hover:bg-cyan-500 transition text-white font-semibold py-3 px-6 rounded-md shadow-lg"
            >
              Paste
            </button>

            <button
              onClick={handleSearch}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition text-white font-semibold py-3 px-10 rounded-md shadow-lg"
              disabled={!owner.trim() || loading}
            >
              {loading && NFTs.length === 0 ? 'Searching...' : 'Search'}
            </button>
          </div>

          {submittedOwner && (
            <div className="mt-4 break-words px-4">
              <span className="text-cyan-400 font-bold text-xl sm:text-2xl drop-shadow-[0_0_6px_rgba(0,255,255,0.7)]">
                {submittedOwner}
              </span>
            </div>
          )}

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
      </header>

      <main
        ref={containerRef}
        className="pt-[500px] pb-48 overflow-y-auto h-full max-w-6xl mx-auto px-4"
      >
        {NFTs.length === 0 && !loading && (
          <p className="text-center text-gray-500 mt-12 text-xl">
            Enter a wallet or contract address and click search to see the NFTs
          </p>
        )}

        {loading && NFTs.length === 0 && (
          <div className="text-center mt-16">
            <div className="w-10 h-10 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-400">Loading NFTs...</p>
          </div>
        )}

        {NFTs.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {NFTs.map((NFT) => (
              <NftCard
                key={NFT.id.tokenId + NFT.contract.address}
                image={NFT.media[0]?.gateway || ''}
                id={NFT.id.tokenId}
                title={safeString(NFT.title)}
                address={NFT.contract.address}
                description={safeString(NFT.description)}
                attributes={NFT.metadata?.attributes || []}
                className="bg-gray-800 shadow-md shadow-indigo-900/50"
              />
            ))}
          </section>
        )}

        {loading && NFTs.length > 0 && (
          <div className="text-center mt-6 mb-12">
            <div className="w-8 h-8 mx-auto border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-gray-400">Loading more NFTs...</p>
          </div>
        )}

        {NFTs.length === 0 && error && (
          <p className="text-center text-red-500 mt-12 text-xl">{error}</p>
        )}
      </main>

      <div className="fixed bottom-16 left-0 right-0 backdrop-blur-md shadow-inner text-cyan-400 font-mono text-xs max-w-6xl mx-auto px-4 py-3 z-50 overflow-x-auto whitespace-nowrap">
        <h2 className="text-center font-semibold font-monospace mb-2 text-sm text-indigo-400">
          Latest Blocks
        </h2>

        {blocksLoading ? (
          <p className="text-center text-gray-400">Loading blocks...</p>
        ) : blocksError ? (
          <p className="text-center text-red-500">{blocksError}</p>
        ) : (
          <div className="flex justify-center gap-6">
            {latestBlocks.map((block) => (
              <div
                key={block.hash}
                className="bg-gray-800 rounded-md px-3 py-2 border border-indigo-600 shadow-md shadow-indigo-700/40"
              >
                <p>
                  <span className="font-semibold">#</span> {block.number}
                </p>
                <p>Txns: {block.transactions.length}</p>
                <p>Time: {formatTimestamp(block.timestamp)}</p>
                <p className="break-all text-sm mt-1" title={block.hash}>
                  Hash: {block.hash.slice(0, 10)}...
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

     <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur-md shadow-inner text-center py-4 text-cyan-400 font-medium text-sm z-50">
        powered by Alchemy
      </footer>
    </div>
  );
};

export default Explore;






