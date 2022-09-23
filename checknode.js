const { GoogleSpreadsheet } = require('google-spreadsheet');
const fetch = require("node-fetch");
const ethers = require('ethers');
require('dotenv').config()
const ABI = require('./abi/oof.json')
const {Contract, BigNumber} = require("ethers");
const { parseBytes32String } = require('ethers/lib/utils');
const { parse } = require('@ethersproject/transactions');

                var bigInt = require("big-integer");
// config go to file later
const rpc = process.env.RPC
const pk= process.env.PK
const oofAddress= process.env.OOFAddress
const sheetapi= process.env.SHEETAPI
const sheetid= process.env.SHEETID
const sheettitle= process.env.SHEETTITLE

// 100 gwei
const GAS_PRICE_MAX = BigNumber.from("100000000000");

const provider = new ethers.providers.JsonRpcProvider(rpc);
const walletWithProvider = new ethers.Wallet(pk, provider);

const oofContract =  !!ABI && !!walletWithProvider
        ? new Contract(oofAddress, ABI, walletWithProvider)
        : undefined;

// store the feed inventory
let feedInventory = [];

// storage for last update timestamp
let lastUpdate = {};

// start building inventory
async function startNode() {
    // Initialize the sheet
    const doc = new GoogleSpreadsheet(sheetid);
    await doc.useApiKey(sheetapi);

    await doc.loadInfo(); // loads document properties and worksheets
    const sheet = doc.sheetsByTitle["Workshop"];

    const rows = await sheet.getRows(); // can pass in { limit, offset }

    let i;
    for (i=0; i < rows.length; i++) {
        let feedname = rows[i]["_rawData"][0]
        let feedid= rows[i]["_rawData"][1]
        let endpoint = rows[i]["_rawData"][2]
        let freq = rows[i]["_rawData"][3]
        let decimals = rows[i]["_rawData"][4]
        let parser = rows[i]["_rawData"][5]
        let parsingargs = []

        if (feedname === "Oracle Address" ) continue;
        if (feedname === "Feed Name") continue;

        try {
            parsingargs = parser.split(",");
        } catch {}

        let tempInv = {
            "feedName": feedname,
            "feedId": feedid,
            "endpoint": endpoint,
            "frequency": freq,
            "decimals": decimals,
            "parsingargs": parsingargs
        }

        // process into global feed array
        feedInventory.push(tempInv)
        lastUpdate[feedid] = 0;
    }

    // process first time then every hour
    await processFeeds(feedInventory)
    setInterval(processFeeds, 3600 * 1000, feedInventory);
}


async function wait(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

async function processFeeds(feedInput) {

    let feedIdArray = []
    let feedValueArray = []

    let i;
    console.log("checking feed APIs")

    for (i=0; i < feedInput.length;i++) {

        // only update when needed
        if (lastUpdate[feedInput[i]["feedId"]] + parseInt(feedInput[i]["frequency"]) * 1000 <= Date.now() + 600 * 1000) {
            try {
                console.log("Feed ID: " + i)
                console.log(feedInput[i]["endpoint"])
                const res = await fetch(feedInput[i]["endpoint"]);
                const body = await res.json();

                let j;
                let toParse = body;
                for (j=0; j < feedInput[i]["parsingargs"].length; j++) {
                    toParse = toParse[feedInput[i]["parsingargs"][j]]
                }
                console.log("hash " + toParse)
                
if (feedInput[i]["feedName"] == "ETHHASH"){
                toParse=toParse.substring(2)
               console.log(toParse)
               console.log(feedInput[i]["feedName"])
              toParse= new bigInt(toParse, 16).toLocaleString('fullwide', {useGrouping:false}); 
              console.log(toParse);
            feedValueArray.push(toParse)
}
else {
                toParse = parseFloat(toParse) * (10 ** feedInput[i]["decimals"])
                console.log("out " + Math.round(toParse).toLocaleString('fullwide', {useGrouping:false}))
feedValueArray.push(Math.round(toParse).toLocaleString('fullwide', {useGrouping:false}))
               }
                // push values
                feedIdArray.push(feedInput[i]["feedId"])

                // set new update timestamp
                lastUpdate[feedInput[i]["feedId"]] = Date.now()

            } catch(e) {
                console.log(e)
            }
        }


    }
}

// starts the node script
startNode()

