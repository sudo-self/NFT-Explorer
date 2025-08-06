const apiKey = "fIYnOgt3AYXKWnd62G3pu4trdY0fN2iQ";
const endpoint = `https://eth-mainnet.alchemyapi.io/v2/${apiKey}`;

/**
 * Fetch NFTs for an owner with optional contract address and pagination.
 * @param {string} owner - Wallet address.
 * @param {string} contractAddress - Optional contract address to filter NFTs.
 * @param {string|null} pageKey - Optional pagination key for next page.
 * @param {number} retryAttempt - Used internally for retry logic.
 * @returns {Promise<{nfts: any[], pageKey: string|null}>} - NFTs and next pageKey.
 */

export const fetchNFTs = async (owner, contractAddress = '', pageKey = null, retryAttempt = 0) => {
  if (retryAttempt >= 5) {
    throw new Error('Max retry attempts reached');
  }
  if (!owner) {
    return { nfts: [], pageKey: null };
  }

  try {
    let url = `${endpoint}/getNFTs?owner=${owner}`;
    if (contractAddress) {
      url += `&contractAddresses%5B%5D=${contractAddress}`;
    }
    if (pageKey) {
      url += `&pageKey=${pageKey}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    return {
      nfts: data.ownedNfts || [],
      pageKey: data.pageKey || null,
    };
  } catch (e) {
    // Retry
    return fetchNFTs(owner, contractAddress, pageKey, retryAttempt + 1);
  }
};
