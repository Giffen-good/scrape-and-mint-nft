import 'dotenv/config'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios'
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import sampleHashlist from './hashlist/devnet_sample_hash_list.json'  assert {type: "json"};
import { PublicKey } from "@solana/web3.js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata"
import fs from 'fs'
import fsAsync from 'fs/promises'
import path from 'path'
import { argv } from 'node:process';
import {pinFileToIPFS} from './pinFileToIPFS.js'
import { actions, utils, programs, NodeWallet } from "@metaplex/js";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";


let sourceNftNetwork, collectionName;
let sampleNetwork = false;
let skipUpload = false;
let skipMint = false;
for (let i = 0; i < process.argv.length;i++) {
  if (process.argv[i] == '-s') sampleNetwork = true
  if (process.argv[i] == '--skip-upload') skipUpload = true
  if (process.argv[i] == '--skip-mint') skipMint = true
}

if (sampleNetwork) { // sample
  sourceNftNetwork = 'devnet'
  collectionName = 'sample-collection'
} else {
  sourceNftNetwork = 'mainnet-beta'
  collectionName = 'fomo-bombs'
}
const HASHLIST = sampleNetwork ? sampleHashlist : JSON.parse(await fsAsync.readFile(process.env.HASHLIST_PATH,{ encoding: 'utf8' }))
const NFT_SYMBOL = "FB v2"
const destDir = path.join(__dirname, 'nft-hashmap');
if (!fs.existsSync(destDir)){
  fs.mkdirSync(destDir);
}

const ipfsHashmapPath = `./ipfs-hashmap/ipfs_${sourceNftNetwork}_${collectionName}_${process.env.WALLET_PUBLIC}.json`
const ipfsHashDir = path.join(__dirname, 'ipfs-hashmap');
if (!fs.existsSync(ipfsHashDir)) fs.mkdirSync(ipfsHashDir);
if (!fs.existsSync(ipfsHashmapPath)) fs.writeFileSync(ipfsHashmapPath, JSON.stringify({}, null, 4))

const nftHashDir = path.join(__dirname, 'nft-hashmap');
let nftHashmapPath = `./nft-hashmap/nft-hashmap_${sourceNftNetwork}_${collectionName}_${process.env.WALLET_PUBLIC}`
if (!fs.existsSync(nftHashDir)) fs.mkdirSync(nftHashDir);
if (!fs.existsSync(nftHashmapPath)) fs.writeFileSync(nftHashmapPath, JSON.stringify({}, null, 4))

const connection = new Connection(process.env.SOL_RPC_URL, "confirmed");
const secret = new Uint8Array(process.env.WALLET_PRIVATE.split(','));
const keypair = Keypair.fromSecretKey(secret)







const mint = async (metadata) => {

  const mintNFTResponse = await actions.mintNFT({
    connection,
    wallet: new NodeWallet(keypair),
    uri: metadata,
    maxSupply: 0,
  });
  return mintNFTResponse
}


const uploadMetadataToIpfs = async (metadata) => {
  metadata.properties = {
    "files":
      [
        {
          "uri": metadata.image,
          "type": "image/jpg"
        }
      ],
    "category": "image",
    "creators":
      [
        {
          "address": process.env.WALLET_PUBLIC,
          "share": 100
        }
      ]
  }

  const uploadedMetadata = await pinFileToIPFS(metadata);
  if (uploadedMetadata == null) {
    return null;
  } else {
    return {pin: uploadedMetadata.data.IpfsHash};
  }
};




const initUpload = async () => {
  const c =  new Connection(clusterApiUrl(sourceNftNetwork), "confirmed");
  const b = []
  const hashmap = {}
  for (let i = 0; i < HASHLIST.length;i++) {
    const tokenMint = HASHLIST[i];
    const key = new PublicKey(
      tokenMint
    )

    const metadataPDA = await Metadata.getPDA(key);
    const tokenMetadata = await Metadata.load(c, metadataPDA);
    let metadata = await axios.get(tokenMetadata.data.data.uri);
    const sourceMintAddress = tokenMetadata.data.mint;
    const map = await fsAsync.readFile(ipfsHashmapPath,{ encoding: 'utf8' })
    const json = JSON.parse(map);
    let p;
    metadata.data.symbol = NFT_SYMBOL;
    if (!json[sourceMintAddress]) {
      const {pin} = await uploadMetadataToIpfs( metadata.data, sourceMintAddress )
      json[sourceMintAddress] = pin
      fs.writeFileSync(ipfsHashmapPath, JSON.stringify(json, null, 4))
      console.log(`File Uploaded ${pin} (${i})`)
      p = pin
    } else {
      p = json[sourceMintAddress]
      console.log(`File Already Uploaded ${p} skipping.. (${i})`)
    }
    const url = `${process.env.IPFS_GATEWAY_URL}/${p}`;

    b.push({
      sourceMintAddress,
      uploadedMetadataURL: url
    })
  }
  return 0
}


const initMint = async () => {
  console.log('initMint')
  const nftMap = await fsAsync.readFile(nftHashmapPath,{ encoding: 'utf8' })
  const NftHashmap = JSON.parse(nftMap);
  const ipfsmap = await fsAsync.readFile(ipfsHashmapPath,{ encoding: 'utf8' })
  const ipfsHashmap = JSON.parse(ipfsmap);
  for (let j = 0; j < Object.keys(ipfsHashmap).length;j++) {
    const sourceMintAddress = Object.keys(ipfsHashmap)[j]
    const targetMintAddress = NftHashmap[sourceMintAddress];
    if (targetMintAddress) {
      console.log("is Already minted:")
      console.log(`\n`)

      console.log(`src address: ${Object.keys(ipfsHashmap)[j]}, target address: ${targetMintAddress}, ipfs address ${ipfsHashmap[Object.keys(ipfsHashmap)[j]]}`)
      continue;
    }

    const uploadedMetadataURL = `https://project89.mypinata.cloud/ipfs/${ipfsHashmap[sourceMintAddress]}`;
    const m = await mint(uploadedMetadataURL);
    console.log(`Minted: , ${m.mint.toString()}, uploadedMetadataURL: ${uploadedMetadataURL}`)
    NftHashmap[sourceMintAddress] = m.mint.toString()
    fs.writeFileSync(nftHashmapPath, JSON.stringify(NftHashmap, null, 4))
    console.log(`\n`)
  }
}
const main = async () => {
  if (skipUpload && skipMint) {
    console.error("You can't skip the upload AND the mint. What exactly do you want this program to do for you?")
    return
  } else if (skipUpload) {
    await initMint();
  } else if (skipMint) {
    await initUpload();
  } else {
    await initUpload();
    await initMint();
  }

  console.log('\n')

  return 0
}

main()