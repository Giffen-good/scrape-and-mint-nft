type Network = 'devnet' | 'mainnet' | 'testnet';

export const getPrivateRpcUrl = (network: Network): string => {
    return `https://late-snowy-cherry.solana-${network}.quiknode.pro/223eb8cd5ee2c52058b1366d401dca25e6fd5ce1/`
}