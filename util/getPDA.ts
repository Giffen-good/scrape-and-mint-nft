import {PublicKey} from "@solana/web3.js";

interface PdaParams {
    PREFIX: string
    programPK: PublicKey
    tokenPK: PublicKey
    EDITION: string
}

export const findProgramAddressPublicKey = async (
    seeds: Buffer[],
    programPK: PublicKey,
): Promise<PublicKey> => {
    const result = await PublicKey.findProgramAddress(seeds, programPK);
    return result[0];
};

export const getPDA = async (
    {
        PREFIX,
        programPK,
        tokenPK,
        EDITION,
    } : PdaParams
): Promise<string> => {
    const PDA = await findProgramAddressPublicKey([
        Buffer.from(PREFIX),
        programPK.toBuffer(),
        tokenPK.toBuffer(),
        Buffer.from(EDITION),
    ], programPK)
    return PDA.toString()
}