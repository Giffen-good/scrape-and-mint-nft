# Scrape Hashlist and Clone NFT



## Description
Scrapes metadata from hashlist and reuploads into IPFS using Pinata. 

After, it mints a duplicate of the collection.

Creates a hashtable between:
- source Mint hash => IPFS pin ID
- source Mint hash => New Mint Hash
- 

## Setup

### set .env variables:
```.env
SOL_RPC_URL= https://api.devnet.solana.com 
API_SECRET= // Pinata Secret
API_KEY= // Pinata key
IPFS_GATEWAY_URL=https://ipfs.infura.io/ipfs

WALLET_PUBLIC= // Public Address
SECRET= // Private Key ..eg. [23,15,55, ..., 24]
HASHLIST_PATH=./hashlist/devnet_sample_hash_list.json
```


### Install
```
yarn install
```

### Usage

to run a sample hashlist using a small collection on Dev net
```
node --experimental-modules index -s
```

to run using the hashlist defined in .env
```
node --experimental-modules index
```


