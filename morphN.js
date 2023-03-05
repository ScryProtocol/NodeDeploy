const ethers = require('ethers');
require('dotenv').config()
const rpc = process.env.RPC
const fetch = require('node-fetch');
const contractAddress = process.env.OOFAddress; // replace with your contract address
const ABI = require('./abi/morph.json')
const { Contract, BigNumber } = require("ethers");
var bigInt = require("big-integer");// store the feed inventory
let feedInventory = [];
// storage for last update timestamp
let lastUpdate = {};
const pk = process.env.PK
const provider = new ethers.providers.JsonRpcProvider(rpc);
const contract = new ethers.Contract(contractAddress, ABI, provider);
console.log('New');
contract.on('feedRequested', (endpoint, endpointp, dc, c, feedId,) => {
    console.log('New feed requested:');
    console.log(`Endpoint: ${endpoint}`);
    console.log(`Endpointp: ${endpointp}`);
    console.log(`Decimal: ${c}`);
    console.log(`Feed ID: ${feedId}`);
    const oofAddress = process.env.OOFAddress

    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const walletWithProvider = new ethers.Wallet(pk, provider);

    const oofContract = !!ABI && !!walletWithProvider
        ? new Contract(oofAddress, ABI, walletWithProvider)
        : undefined;

    let parsingargs = []

    try {
        parsingargs = endpointp.split(",");
    } catch { }

    let tempInv = {
        "feedId": feedId,
        "endpoint": endpoint,
        "dc": dc,
        "c": c,
        "parsingargs": parsingargs
    }

    // process into global feed array
    feedInventory.push(tempInv)
    processFeeds(endpoint, endpointp, parsingargs, feedId, c)
});
async function processFeeds(endpoint, endpointp, parsingargs, feedId, c) {
    let i; let feedIdArray = []
    let feedValueArray = []
    console.log("checking feed APIs")
    //for (i = 0; i < feedInventory.length; i++) {
    const res = await fetch(endpoint);
    const body = await res.json();

    console.log(body)
    let j;
    let toParse = body;
    for (j = 0; j < parsingargs.length; j++) {
        toParse = toParse[parsingargs[j]]
    }
    console.log(toParse)
    if (toParse != "") {
        toParse = parseFloat(toParse) * (10 ** c)
        console.log(Math.round(toParse).toLocaleString('fullwide', { useGrouping: false }))
        toParse = Math.round(toParse).toLocaleString('fullwide', { useGrouping: false })
    }
    console.log("Submitting " + toParse)

    // push values
    feedIdArray.push(feedId)
    feedValueArray.push(toParse)

    // set new update timestamp
    lastUpdate[feedId] = Date.now()


    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const oofAddress = process.env.OOFAddress
    const walletWithProvider = new ethers.Wallet(pk, provider); const oofContract = !!ABI && !!walletWithProvider
        ? new Contract(oofAddress, ABI, walletWithProvider)
        : undefined;
    let nonce = await walletWithProvider.getTransactionCount();
    let gasPrice = await provider.getGasPrice()
    let tx_obk = {

        gasPrice: gasPrice
    }
    async function wait(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    } const gasL = await oofContract.estimateGas.submitFeed(feedIdArray, feedValueArray, tx_obk);
    const gasF = gasL * gasPrice;
    console.log('Gas fee:', ethers.utils.formatEther(gasF.toString()), 'ETH ', ethers.utils.formatUnits(gasPrice, "gwei") + " gwei");
    console.log('Bounty ', ethers.utils.formatEther(await oofContract.feedSupport(feedId)).toString())

    const gF = (await oofContract.feedSupport(feedId) - gasF).toString()
    console.log('ETH Profit', ethers.utils.formatEther(gF))
    if (ethers.utils.formatEther(gF) > 0) {
        //start web 3 call
        console.log("submitting with gas price: " + ethers.utils.formatUnits(gasPrice, "gwei") + " gwei")
        console.log('submitting feeds...')
        let tx;
        try {
            // submit transaction first time
            tx = await oofContract.submitFeed(feedIdArray, feedValueArray, tx_obk)
            console.log("submitted feed ids: " + feedIdArray + "with values: " + feedValueArray + " at " + Date.now())
            console.log("Transaction hash: " + tx.hash)
            tx.wait()
            // check if still pending after 5 minutes
            while (true) {
                await wait(5 * 60 * 1000);
                let txi = await provider.getTransaction(tx.hash)

                console.log("Checking tx after 5 minutes at " + Date.now())

                // if the tx is not confirmed
                if (txi.confirmations === 0) {
                    let newGasPrice = await provider.getGasPrice()
                    console.log("Current gas price: " + ethers.utils.formatUnits(newGasPrice, "gwei") + " gwei")

                    // check if new gas price smaller than old one
                    if (newGasPrice.lte(gasPrice)) {
                        console.log("Old gas price higher than current increasing new one")
                        newGasPrice = gasPrice.add(ethers.utils.parseUnits("1", "gwei"))
                    }

                    let tx_obi = {
                        nonce: nonce,
                        gasPrice: newGasPrice
                    }

                    gasPrice = newGasPrice;

                    try {
                        tx = await oofContract.submitFeed(feedIdArray, feedValueArray, tx_obi)
                        console.log("resend transaction")
                        console.log("Resending with gas price: " + ethers.utils.formatUnits(newGasPrice, "gwei") + " gwei")
                        console.log("submitted feed ids: " + feedIdArray + "with values: " + feedValueArray + " at " + Date.now())
                    } catch (e) {
                        console.log("Error while resending:")
                        console.log(e)
                        break;
                    }
                }
                else {
                    console.log("Transaction mined!")
                    break;
                }
            }

            console.log("Transaction loop for tx: " + tx.hash + " exited")

        } catch (e) {
            console.log(e)
        }
    }
    else {
        console.log('not profitable')
    }
}
