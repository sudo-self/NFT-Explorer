// src/components/nftcard.jsx

const NftCard = ({ image, address }) => {
  return (
    <div
      className="
        w-full max-w-xs
        bg-gradient-to-br from-gray-50 to-gray-200
        rounded-xl shadow-lg overflow-hidden border border-gray-300
        transform transition duration-300 ease-in-out
        hover:scale-150 hover:z-50
        hover:drop-shadow-[0_0_15px_rgba(14,165,233,0.8)]
        mx-auto relative z-0
        will-change-transform
      "
    >
      <img
        src={image || '/placeholder.png'}
        alt="NFT Image"
        className="w-full h-52 object-cover object-center"
      />
      <div className="p-4 flex justify-center">
        <a
          href={`https://etherscan.io/token/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 text-sm hover:underline break-all"
          title={address}
        >
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'No Address'}
        </a>
      </div>
    </div>
  );
};

export default NftCard;
