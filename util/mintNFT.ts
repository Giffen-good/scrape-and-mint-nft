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
import type { Wallet } from '@metaplex/js';
import { actions, utils } from "@metaplex/js";
import type {
    CreateMasterEditionParams
} from "@metaplex-foundation/mpl-token-metadata/dist/src/transactions/CreateMasterEdition";

export interface MintNFTParams {
    connection: Connection;
    wallet: Wallet;
    pin: string;
    maxSupply?: number;
}

export interface MintNFTResponse {
    txId: string;
    mint: PublicKey;
    metadata: PublicKey;
    edition: PublicKey;
}

export const mintNFT = async ({
                                  connection,
                                  wallet,
                                  pin,
                                  maxSupply,
                              }: MintNFTParams): Promise<MintNFTResponse> => {
    const { mint, createMintTx, createAssociatedTokenAccountTx, mintToTx } =
        await actions.prepareTokenAccountAndMintTxs(connection, wallet.publicKey);

    const metadataPDA = await Metadata.getPDA(mint.publicKey);
    const editionPDA = await MasterEdition.getPDA(mint.publicKey);
    const privateGatewayUri : string = `${process.env.PRIVATE_IPFS_GATEWAY_URL}/ipfs/${pin}`;
    const publicGatewayUri : string = `${process.env.PUBLIC_IPFS_GATEWAY_URL}/ipfs/${pin}`;

    const {
        name,
        symbol,
        seller_fee_basis_points,
        properties: { creators },
    } = await utils.metadata.lookup(privateGatewayUri);
    // const updateAuthority : PublicKey = process.env.WALLET_UPDATE_AUTHORITY ?  new PublicKey(process.env.WALLET_UPDATE_AUTHORITY) : wallet.publicKey;
    const updateAuthority : PublicKey = wallet.publicKey;

    const creatorsData = creators.reduce<Creator[]>((memo, { address, share }) => {
        const verified = address === updateAuthority.toString();

        const creator = new Creator({
            address,
            share,
            verified,
        });

        memo = [...memo, creator];

        return memo;
    }, []);

    const metadataData = new MetadataDataData({
        name,
        symbol,
        uri: publicGatewayUri,
        sellerFeeBasisPoints: seller_fee_basis_points,
        creators: creatorsData,
    });
    const createMetadataTx = new CreateMetadata(
        {
            feePayer: wallet.publicKey,
        },
        {
            metadata: metadataPDA,
            metadataData,
            updateAuthority,
            mint: mint.publicKey,
            mintAuthority: wallet.publicKey,
        },
    );

    let cmeParams : CreateMasterEditionParams = {
            edition: editionPDA,
            metadata: metadataPDA,
            updateAuthority,
            mint: mint.publicKey,
            mintAuthority: wallet.publicKey,
    }
    if (maxSupply || maxSupply === 0) {
        cmeParams["maxSupply"] = new BN(maxSupply)
    }

    const masterEditionTx = new CreateMasterEdition(
        { feePayer: wallet.publicKey },
        cmeParams
    );
    const txId = await actions.sendTransaction({
        connection,
        signers: [mint],
        txs: [
            createMintTx,
            createMetadataTx,
            createAssociatedTokenAccountTx,
            mintToTx,
            masterEditionTx,
        ],
        wallet,
    });

    return {
        txId,
        mint: mint.publicKey,
        metadata: metadataPDA,
        edition: editionPDA,
    };
};
