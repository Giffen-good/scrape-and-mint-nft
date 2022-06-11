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
PINATA_SECRET= // Pinata Secret
PINATA_KEY= // Pinata key
PUBLIC_IPFS_GATEWAY_URL=https://ipfs.infura.io
PRIVATE_IPFS_GATEWAY_URL=https://[custom].mypinata.cloud

USER_WALLET_PUBLIC= // Public Address
USER_WALLET_PRIVATE= // Private Key ..eg. 23,15,55,...,24

HASHLIST_PATH=./hashlist/devnet_sample_hash_list.json
HASHLIST_NETWORK=devnet
UPLOAD_NETWORK=devnet



UPDATE_AUTHORITY_PUBLIC=437T5rcFnTguJcU8iWpothVkbre5Cw2hqYDeEn8tyuL3
UPDATE_AUTHORITY_PRIVATE= // Private Key ..eg. 23,15,55,...,24
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


