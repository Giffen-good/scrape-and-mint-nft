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
let sampleNetwork = false
for (let i = 0; i < process.argv.length;i++) {
  if (process.argv[i] == '-s') sampleNetwork = true
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

const ipfsHashmap = `./ipfs-hashmap/ipfs_${sourceNftNetwork}_${collectionName}_${process.env.WALLET_PUBLIC}.json`
const ipfsHashDir = path.join(__dirname, 'ipfs-hashmap');
if (!fs.existsSync(ipfsHashDir)) fs.mkdirSync(ipfsHashDir);
if (!fs.existsSync(ipfsHashmap)) fs.writeFileSync(ipfsHashmap, JSON.stringify({}, null, 4))

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






const main = async () => {
  const c =  new Connection(clusterApiUrl(sourceNftNetwork), "confirmed");
  const hashmap = {}

  let bombs = []
  for (let i = 0; i < HASHLIST.length;i++) {
    const tokenMint = HASHLIST[i];
    const key = new PublicKey(
      tokenMint
    )

    const metadataPDA = await Metadata.getPDA(key);
    const tokenMetadata = await Metadata.load(c, metadataPDA);
    let metadata = await axios.get(tokenMetadata.data.data.uri);
    const sourceMintAddress = tokenMetadata.data.mint;
    const map = await fsAsync.readFile(ipfsHashmap,{ encoding: 'utf8' })
    const json = JSON.parse(map);
    let p;
    if (!json[sourceMintAddress]) {
      const {pin} = await uploadMetadataToIpfs( metadata.data, sourceMintAddress )
      json[sourceMintAddress] = pin
      fs.writeFileSync(ipfsHashmap, JSON.stringify(json, null, 4))
      console.log(`File Uploaded ${pin}`)
      p = pin
    } else {
        p = json[sourceMintAddress]
        console.log(`File Already Uploaded ${p} skipping..`)
    }
    const url = `${process.env.IPFS_GATEWAY_URL}/${p}`;

    bombs.push({
      sourceMintAddress,
      uploadedMetadataURL: url
    })
  }
  console.log('\n')
  for (let j = 0; j < bombs.length;j++) {
    const { sourceMintAddress, uploadedMetadataURL } = bombs[j]
    const m = await mint(uploadedMetadataURL);
    console.log("Minted:" , m.mint.toString())
    if (m.mint) hashmap[sourceMintAddress] = m.mint.toString()
  }
  let filename = `./nft-hashmap/nft-hashmap_${sourceNftNetwork}_${collectionName}_${process.env.WALLET_PUBLIC}`
  let j = 0;
  while (fs.existsSync(`${filename}_v${j}.json`)) {
    j++;
  }
  filename = `${filename}_v${j}.json`

  fs.writeFileSync(filename, JSON.stringify(hashmap, null, 4))
  return 0
}

main()