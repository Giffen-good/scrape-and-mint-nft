import 'dotenv/config'
import IPFS_HASHLIST from '../ipfs-hashmap/ipfs_mainnet_fomo-bombs_4Uh6Agkewj4JJUKSensrKHXuvgpLrnTDBMWrhWkGioUy.json' assert {type: "json"};
import HASHLIST from '../nft-hashmap/nft-hashmap_mainnet_fomo-bombs_4Uh6Agkewj4JJUKSensrKHXuvgpLrnTDBMWrhWkGioUy.json' assert {type: "json"};
import fs from "fs";
export const createFakeHashlist = () => {
    const fakeMintList = {};
    for (let i = 0; i < Object.keys(HASHLIST).length;i++) {
        const key = Object.keys(HASHLIST)[i]
        IPFS_HASHLIST
        fakeMintList[HASHLIST[key]] = IPFS_HASHLIST[key]
    }
    return fakeMintList;
}
const writeHashlistToFile = () => {
    let nftHashmapPath = process.env.FAKE_NFT_HASHMAP;
    const fakeMintList = createFakeHashlist()

    fs.writeFileSync(nftHashmapPath, JSON.stringify(fakeMintList, null, 4))
}
writeHashlistToFile()