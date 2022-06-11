import 'dotenv/config'
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import axios from 'axios'
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// import HASHLIST from './data/devnet_sample_hash_list.json'  assert {type: "json"};
import HASHLIST from './data/hash_list_BkWwABDdotSoFLh3s4oiHbGWAZDmFUoZRNDgZPodSkFJ.json'  assert {type: "json"};
import { PublicKey } from "@solana/web3.js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata"
import fs from 'fs'
import fsAsync from 'fs/promises'
import path from 'path'
import * as ipfsClient from "ipfs-http-client";
import {pinFileToIPFS} from './pinFileToIPFS.js'
import { actions, utils, programs, NodeWallet } from "@metaplex/js";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";


const destDir = path.join(__dirname, 'nft-hashmap');
if (!fs.existsSync(destDir)){
  fs.mkdirSync(destDir);
}

const ipfsHashmap = `./ipfs-hashmap/ipfs_${process.env.NETWORK}_${process.env.WALLET}.json`
const ipfsHashDir = path.join(__dirname, 'ipfs-hashmap');
if (!fs.existsSync(ipfsHashDir)) fs.mkdirSync(ipfsHashDir);
if (!fs.existsSync(ipfsHashmap)) fs.writeFileSync(ipfsHashmap, JSON.stringify({}, null, 4))

const connection = new Connection(clusterApiUrl(process.env.NETWORK), "confirmed");
const secret = new Uint8Array(process.env.SECRET.split(','));
const keypair = Keypair.fromSecretKey(secret)

const mint = async (metadata) => {

  const mintNFTResponse = await actions.mintNFT({
    connection,
    wallet: new NodeWallet(keypair),
    uri: metadata,
    maxSupply: 1,
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
          "address": process.env.WALLET,
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
  const c =  new Connection(clusterApiUrl('mainnet-beta'), "confirmed");
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
        p = ${json[sourceMintAddress]}
        console.log(`File Already Uploaded ${p}`)
    }
    const url = `${process.env.IPFS_GATEWAY_URL}/${p}`;

    bombs.push({
      sourceMintAddress,
      uploadedMetadataURL: url
    })
  }
  for (let j = 0; j < bombs.length;j++) {
    const { sourceMintAddress, uploadedMetadataURL } = bombs[j]
    const m = await mint(uploadedMetadataURL);
    console.log("Minted:" , m.mint.toString())
    console.log('\n')
    if (m.mint) hashmap[sourceMintAddress] = m.mint.toString()
  }
  let filename = `./nft-hashmap/hashmap_${process.env.NETWORK}_${process.env.WALLET}`
  let j = 0;
  while (fs.existsSync(`${filename}_v${j}.json`)) {
    j++;
  }
  filename = `${filename}_v${j}.json`

  fs.writeFileSync(filename, JSON.stringify(hashmap, null, 4))
  return 0
}

main()