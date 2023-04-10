const ethers = require('ethers');
require('dotenv').config()
const rpc = process.env.RPC
const fetch = require('node-fetch');
const keccak256 = require('keccak256')
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
console.log('New'); const walletWithProvider = new ethers.Wallet(pk, provider); const oofContract = !!ABI && !!walletWithProvider
  ? new Contract(contractAddress, ABI, walletWithProvider)
  : undefined; let i;
async function vrfHash(value, feedID, fl) {
  let hash = keccak256(pk.toString + contractAddress).toString('hex');//ethers.utils.keccak256(pk.toString);
  console.log('seed ', hash);
  let hash2
  if (fl == 1) {
    feedID -= 1;
  }
  for (let i = 0; i < 100000 - feedID; i++) {
    hash = ethers.utils.keccak256(hash);
  }
  hash2 = keccak256(hash + value + feedID).toString('hex')
  console.log('VRF seed ', hash);
  let hashBN = ethers.BigNumber.from(hash);
  let uint256 = hashBN
  hash = uint256.toString();
  console.log('seed uint ', hash);
  hashBN = ethers.BigNumber.from('0x' + hash2);
  uint256 = hashBN
  hash2 = uint256.toString()
  console.log('val ', hash2);
  if (fl == 1) {
    submit(feedID + 1, hash);
  } else {
    submit(feedID, hash2);
  }
}
contract.on('feedRequested', (endpoint, endpointp, dc, c, feedId,) => {
  console.log('New feed requested:');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Endpointp: ${endpointp}`);
  console.log(`Decimal: ${c}`);
  console.log(`Feed ID: ${feedId}`);
  if (endpoint == 'vrf' || endpoint == 'VRF') {
    if (endpointp == 'proof') {
      vrfHash(endpointp, feedId, 1)// code to execute if endpoint is 'vrf' or 'VRF'
    } else {
      vrfHash(endpointp, feedId, 0)// code to execute if endpoint is 'vrf' or 'VRF'
    }
  } else {
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
  }
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
  // console.log('Gas fee:', ethers.utils.formatEther(gasF.toString()), 'ETH ', ethers.utils.formatUnits(gasPrice, "gwei") + " gwei");
  // console.log('Bounty ', ethers.utils.formatEther(await oofContract.feedSupport(feedId)).toString())

  const gF = (await oofContract.feedSupport(feedId) - gasF).toString()
  //  console.log('ETH Profit', ethers.utils.formatEther(gF))
  if (ethers.utils.formatEther(gF) > 0) {
    submit(feedId, toParse, 0)
  }
  else {
    console.log('not profitable')
  }
}

contract.on('feedSupported', (feedd) => {

  console.log('New feed Support:')
  let feedId = []; feedId[0] = feedd;
  const oofAddress = process.env.OOFAddress

  const walletWithProvider = new ethers.Wallet(pk, provider);
  const oofContract = !!ABI && !!walletWithProvider
    ? new Contract(oofAddress, ABI, walletWithProvider)
    : undefined;

  let tempInv = {
    "feedId": feedId,
    //    "endpoint": endpoint,
    //    "dc": dc,
    //    "c": c,
    //    "parsingargs": parsingargs
  }

  // process into global feed array
  feedInventory.push(tempInv)
  processFds(feedId)
});
async function processFds(feedId) {
  const provider = new ethers.providers.JsonRpcProvider(rpc);
  const oofAddress = process.env.OOFAddress
  let feedIdArray = []
  let feedValueArray = []
  const d = await oofContract.getFeeds(feedId)
  let c
  let endpoint
  let endpointp
  // for (i = 0; i < d.length; i++) {
  c = d[2][0]
  endpoint = d[3][0]
  endpointp = d[4][0]
  //}
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Endpointp: ${endpointp}`);
  console.log(`Decimal: ${c}`);
  console.log(`Feed ID: ${feedId}`);
  if (endpoint === 'vrf' || endpoint === 'VRF') {
    if (endpointp == 'proof') {
      vrfHash(endpointp, feedId, 1)// code to execute if endpoint is 'vrf' or 'VRF'
    } else {
      vrfHash(endpointp, feedId, 0)// code to execute if endpoint is 'vrf' or 'VRF'
    }
  } else {
    let parsingargs = []
    try {
      parsingargs = endpointp.split(",");
    } catch { }
    console.log("checking feed APIs")
    //for (i = 0; i < feedInventory.length; i++) {
    const res = await fetch(endpoint);
    const body = await res.json();

    console.log(body)
    let j;
    let toParse = body;
    console.log(toParse)
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
    feedId = Number(feedId)
    feedIdArray.push(feedId)
    feedValueArray.push(toParse)

    // set new update timestamp
    lastUpdate[feedId] = Date.now()

    let gasPrice = await provider.getGasPrice()
    let tx_obk = {

      gasPrice: gasPrice
    }
    const gasL = await oofContract.estimateGas.submitFeed(feedIdArray, feedValueArray, tx_obk);

    const gasF = gasL * gasPrice;

    // console.log('Gas fee:', ethers.utils.formatEther(gasF.toString()), 'ETH ', ethers.utils.formatUnits(gasPrice, "gwei") + " gwei");
    //console.log('Bounty ', ethers.utils.formatEther(await oofContract.feedSupport(feedId)).toString())
    //console.log('ETH Profit', ethers.utils.formatEther(ethProfit.toString()));

    const gF = (await oofContract.feedSupport(feedId) - gasF).toString()
    // console.log('ETH Profit ', gF);

    if (ethers.utils.formatEther(gF) > 0) {
      submit(feedId, toParse, 0)
    }
    else {
      console.log('not profitable')
    }
  }
}
let txa = []
async function submit(feedId, value, fl) {

  if (txa.length == 0 || fl == 1) {
    // If not, add the new feedId and value to the queue
    txa.unshift({ feedId: feedId, value: value });
    const gasPrice = await provider.getGasPrice();
    const tx_obk = { gasPrice };
    const gasLimit = await oofContract.estimateGas.submitFeed(
      [feedId],
      [value],
      tx_obk
    );
    const gasFee = gasLimit.mul(gasPrice);
    let sup = await oofContract.feedSupport(feedId)
    const ethProfit = sup - gasFee;

    console.log('Gas fee:', ethers.utils.formatEther(gasFee.toString()), 'ETH ', ethers.utils.formatUnits(gasPrice, "gwei") + " gwei");
    console.log('Bounty ', ethers.utils.formatEther(sup))
    console.log('ETH Profit', ethers.utils.formatEther(ethProfit.toString()));


    if (ethProfit > 0) {
      console.log(
        "submitting with gas price: " +
        ethers.utils.formatUnits(gasPrice, "gwei") +
        " gwei"
      );
      console.log("submitting feeds...");
      const tx = await oofContract.submitFeed([feedId], [value], tx_obk);
      console.log(
        `submitted feed id ${feedId} with value ${value} at ${Date.now()}`
      );
      console.log("Transaction hash: " + tx.hash);
      await tx.wait();
      console.log(`Transaction confirmed at ${Date.now()}`);

      // Remove the processed value from the queue
      txa.shift();
      // Check if there are any values left in the queue
      if (txa.length > 0) {

        // Submit the next value in the queue
        const nextVal = txa[0]; txa.shift();


        submit(nextVal.feedId, nextVal.value, 1);

      }
    } else {
      console.log("not profitable");

      // Remove the processed value from the queue
      txa.shift();
      // Check if there are any values left in the queue
      if (txa.length > 0) {
        // Submit the next value in the queue
        const nextVal = txa[0]; txa.shift();
        await submit(nextVal.feedId, nextVal.value, 1);
      }
    }
  } else {
    // If not, add the new feedId and value to the queue
    if (txa.some((item) => item.feedId === feedId && item.value === value)) {
      console.log(`Feed id ${feedId} with value ${value} already in queue`);
    } else {
      txa.push({ feedId: feedId, value: value });
    }
    console.log(`Added feed id ${feedId} with value ${value} to queue`);
  }
}
