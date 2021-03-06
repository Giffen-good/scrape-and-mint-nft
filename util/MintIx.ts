import type { PublicKey, Connection } from '@solana/web3.js';
import BN from 'bn.js';
import {
    CreateMasterEdition,
    CreateMetadata,
    Creator,
    MasterEdition,
    Metadata,
    MetadataDataData
} from '@metaplex-foundation/mpl-token-metadata';
import { actions, utils } from "@metaplex/js";
import type {
    CreateMasterEditionParams
} from "@metaplex-foundation/mpl-token-metadata/dist/src/transactions/CreateMasterEdition";
import type {Transaction} from "@solana/web3.js";

export interface MintNFTParams {
    connection: Connection;
    publicKey: PublicKey;
    pin: string | undefined;
    maxSupply?: number;
}

// export interface MintNFTResponse {
//     txId: string;
//     mint: PublicKey;
//     metadata: PublicKey;
//     edition: PublicKey;
// }

export const MintIX = async ({
                                  connection,
                                  publicKey,
                                  pin,
                                  maxSupply,
                              }: MintNFTParams): Promise<[Transaction, CreateMetadata, Transaction, Transaction, CreateMasterEdition]> => {
    const { mint, createMintTx, createAssociatedTokenAccountTx, mintToTx } =
        await actions.prepareTokenAccountAndMintTxs(connection, publicKey);
    console.log({pin})
    const metadataPDA = await Metadata.getPDA(mint.publicKey);
    const editionPDA = await MasterEdition.getPDA(mint.publicKey);
    const publicGatewayUri : string = `https://ipfs.infura.io/ipfs/${pin}`;

    const {
        name,
        symbol,
        seller_fee_basis_points,
        properties: { creators },
    } = await utils.metadata.lookup(publicGatewayUri);
    // const updateAuthority : PublicKey = process.env.WALLET_UPDATE_AUTHORITY ?  new PublicKey(process.env.WALLET_UPDATE_AUTHORITY) : publicKey;
    const updateAuthority : PublicKey = publicKey;

    const creatorsData = creators.reduce<Creator[]>((memo, { address, share }) => {
        // const verified = address === updateAuthority.toString();
        const verified = false

        const creator = new Creator({
            address,
            share,
            verified,
        });

        memo = [...memo, creator];

        return memo;
    }, []);
    const userCreator = new Creator({
        address: publicKey.toString(),
        share:0,
        verified: false,
    });
    creatorsData.push(userCreator)
    const metadataData = new MetadataDataData({
        name,
        symbol,
        uri: publicGatewayUri,
        sellerFeeBasisPoints: seller_fee_basis_points,
        creators: creatorsData,
    });
    const createMetadataTx = new CreateMetadata(
        {
            feePayer: publicKey,
        },
        {
            metadata: metadataPDA,
            metadataData,
            updateAuthority,
            mint: mint.publicKey,
            mintAuthority: publicKey,
        },
    );

    let cmeParams : CreateMasterEditionParams = {
        edition: editionPDA,
        metadata: metadataPDA,
        updateAuthority,
        mint: mint.publicKey,
        mintAuthority: publicKey,
    }
    if (maxSupply || maxSupply === 0) {
        cmeParams["maxSupply"] = new BN(maxSupply)
    }

    const masterEditionTx = new CreateMasterEdition(
        { feePayer: publicKey },
        cmeParams
    );
    return [
        createMintTx,
        createMetadataTx,
        createAssociatedTokenAccountTx,
        mintToTx,
        masterEditionTx,
    ]

};
