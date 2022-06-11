//imports needed for this function

import axios from 'axios'
import fs from 'fs'
import FormData from 'form-data'

export const pinFileToIPFS = async (metadata) => {

 //You'll need to make sure that the metadata is in the form of a JSON object that's been convered to a string
  //metadata is optional
  const d = {}
  d.pinataMetadata = {
    name: 'FOMO BOMBS Devnet',
    keyvalues: {
      version: 'devnet v0.1'
    }
  }
  d.pinataOptions = {
    "cidVersion": 1
  }
  d.pinataContent = metadata
  let data = JSON.stringify(d)
  let config = {
    method: 'post',
    url: 'https://api.pinata.cloud/pinning/pinJSONToIPFS',
    headers: {
      'Content-Type': 'application/json',
      'pinata_api_key': process.env.API_KEY,
      'pinata_secret_api_key': process.env.API_SECRET
    },
    data : data
  };

  const res = await axios(config);

  return res
};