import 'dotenv/config'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios'
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import sampleHashlist from './hashlist/devnet_sample_hash_list.json'  assert {type: "json"};
import { PublicKey } from "@solana/web3.js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import fs from 'fs'
import fsAsync from 'fs/promises'
import path from 'path'
import { argv } from 'node:process';
import {pinFileToIPFS} from './util/pinFileToIPFS.js'
import {mintNFT} from "./util/mintNFT.js";
import { getPrivateRpcUrl } from "./util/getPrivateRpcUrl.js";
import { actions, utils, programs, NodeWallet } from "@metaplex/js";
import {MintIX} from "./util/MintIx.js";
import {
  Connection,
  Keypair,
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
  sourceNftNetwork = process.env.HASHLIST_NETWORK;
  collectionName = 'fomo-bombs'
}
const realHashlist = await fsAsync.readFile(process.env.HASHLIST_PATH,{ encoding: 'utf8' });
const HASHLIST = sampleNetwork ? sampleHashlist : JSON.parse(realHashlist)
const NFT_SYMBOL = "FB v2"
const destDir = path.join(__dirname, 'nft-hashmap');
if (!fs.existsSync(destDir)){
  fs.mkdirSync(destDir);
}

const ipfsHashmapPath = `./ipfs-hashmap/ipfs_${sourceNftNetwork}_${collectionName}_${process.env.UPDATE_AUTHORITY_PUBLIC}.json`
const ipfsHashDir = path.join(__dirname, 'ipfs-hashmap');
if (!fs.existsSync(ipfsHashDir)) fs.mkdirSync(ipfsHashDir);
if (!fs.existsSync(ipfsHashmapPath)) fs.writeFileSync(ipfsHashmapPath, JSON.stringify({}, null, 4))

const nftHashDir = path.join(__dirname, 'nft-hashmap');
let nftHashmapPath = `./nft-hashmap/nft-hashmap_${sourceNftNetwork}_${collectionName}_${process.env.UPDATE_AUTHORITY_PUBLIC}.json`
if (!fs.existsSync(nftHashDir)) fs.mkdirSync(nftHashDir);
if (!fs.existsSync(nftHashmapPath)) fs.writeFileSync(nftHashmapPath, JSON.stringify({}, null, 4))

const connection = new Connection(getPrivateRpcUrl(process.env.UPLOAD_NETWORK), "confirmed");
const secret = new Uint8Array(process.env.USER_WALLET_PRIVATE.split(','));
const keypair = Keypair.fromSecretKey(secret)





//
// const decomposedMint = async (pin) => {
//   const ix = await MintIX({
//     connection,
//     wallet: keypair,
//     pin,
//     maxSupply: 0,
//   })
//   let signedTransactions = [];
//
//   try {
//     signedTransactions = await signAllTransactions(transactions);
//   } catch (err) {
//     console.log(`Failed to sign transaction: ${err.toString()}`);
//     return;
//   }
//
//   const inProgressTransactions = [];
//
//   for (const transaction of signedTransactions) {
//     inProgressTransactions.push(
//       sendAndConfirmTransaction(
//         transaction,
//         connection,
//       ),
//     );
//   }
// }
const mint = async (pin) => {

  const mintNFTResponse = await mintNFT({
    connection,
    wallet: new NodeWallet(keypair),
    pin,
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
    "creators":
      [
        {
          "address": process.env.UPDATE_AUTHORITY_PUBLIC,
          "share": 100
        },
        {
          "address": process.env.USER_WALLET_PUBLIC,
          "share": 0
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
  const c =  new Connection(getPrivateRpcUrl(sourceNftNetwork), "confirmed");
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
    const ipfsPin = ipfsHashmap[sourceMintAddress];

    if (targetMintAddress) {
      console.log("is Already minted:")
      console.log(`src address: ${sourceMintAddress}, target address: ${targetMintAddress}, ipfs pin ${ipfsPin}`)
      continue;
    }
    const m = await mint(ipfsPin);
    console.log(`Minted: , ${m.mint.toString()}, ipfs pin: ${ipfsPin}`)
    NftHashmap[sourceMintAddress] = m.mint.toString()
    fs.writeFileSync(nftHashmapPath, JSON.stringify(NftHashmap, null, 4))
    console.log(`\n`)
  }
}
const main = async () => {
  if (skipUpload && skipMint) {
    console.error("You can't skip the upload AND the mint. What exactly do you want this program to do for you?")
    testTS({tx: "this is a tx"})
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