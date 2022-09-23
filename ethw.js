const fetch = require("node-fetch");
const ethers = require('ethers');
require('dotenv').config()
const ABI = require('./abi/oof.json')
const {Contract} = require("ethers");
const { formatUnits } = require("ethers/lib/utils");
 
// config go to file later
const rpc = process.env.RPC
const pk= process.env.PK
const oofAddress= process.env.OOFAddress
 
const provider = new ethers.providers.JsonRpcProvider(rpc);
const walletWithProvider = new ethers.Wallet(pk, provider);
 
const oofContract =  !!ABI && !!walletWithProvider
    ? new Contract(oofAddress, ABI, walletWithProvider)
    : undefined;
 
async function getData() {
    let length = await oofContract.getFeedLength()
 console.log("Contract address")
 console.log(oofAddress)
    console.log("Found Feeds:" + (formatUnits(length) * 10 ** 18))
    console.log("########################################")
let n = [];
for (var i = 0; i < length.toNumber(); i++){
n.push(i);
}let feedData = await oofContract.getFeedList(n)
let feedInfo = await oofContract.getFeeds(n)
    for (var i = 0; i < length.toNumber() && i < 70; i++) {
        var d = new Date(0);
        d.setUTCSeconds(feedInfo[1][i]);
 console.log("Feed ID "+ i)
        console.log("Feed Name: " + feedData[0][i])
       console.log("Feed Price Value: " + feedInfo[0][i] / (10 ** feedData[1][i]))
        console.log("Feed Price Value RAW: " + feedInfo[0][i])
        console.log("Feed Last Update: " + d)
        console.log("Feed Decimals: " + feedData[1][i])
        console.log("Feed Update Interval (s): " + feedData[2][i])
        console.log("Feed Revenue Mode: " + feedData[3][i])
        console.log("Feed Cost: " + feedData[4][i])
        console.log("########################################")
    }
 
 
 
}
 
getData()