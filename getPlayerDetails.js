const axios = require('axios');
const fs = require('fs');
const qs = require('qs');
const parse = require('csv-parse/lib/sync')

function hexEncode(string) {
    var hex, i;

    var result = "";
    for (i = 0; i < string.length; i++) {
        hex = string.charCodeAt(i).toString(16);
        result += ("000" + hex).slice(-2);
    }

    return result
}
async function getPlayerDetails(playerID) {
    const requestDataStringPrefix = '9295b2323131303237313133313233303038333834ad3631376432303534643537633802a5302e302e370396b2'
    const requestDataStringSuffix = '07ffffffff'

    const requestDataString = requestDataStringPrefix + hexEncode(playerID) + requestDataStringSuffix;
    const config = {
        method: 'post',
        url: 'https://ggst-game.guiltygear.com/api/statistics/get',
        headers: {
            'User-Agent': 'Steam',
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
    };
    config.data = qs.stringify({ 'data': requestDataString });
    return axios(config).then((result) => {
        const playerData = result.data.slice(62);

        let playerDataJSON;
        try {
            playerDataJSON = JSON.parse(playerData)
        } catch (error) {
            console.log('ERROR', playerData, result.data);
        }
        return playerDataJSON
    })
}

async function getAllPlayerData(uniquePlayerSet) {
    const allPlayerData = {};
    let index = 0;
    requests = []
    for (const playerID of uniquePlayerSet) {
        // process.stdout.clearLine();
        process.stdout.cursorTo(0);
        process.stdout.write('REQUEST ' + (index + 1) + '/' + uniquePlayerSet.size)
        
        index += 1;

        requests.push(getPlayerDetails(playerID).then((result) => {
            allPlayerData[playerID] = result;
        }))
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        await delay(10);
    }
    await Promise.allSettled(requests);
    return allPlayerData
}

function getUniquePlayerSet(filename) {
    input = fs.readFileSync(filename)
    const records = parse(input, {
        columns: true,
        skip_empty_lines: true
    })

    const uniquePlayerSet = new Set()

    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        uniquePlayerSet.add(record.playerAID)
        uniquePlayerSet.add(record.playerBID)
    }

    return uniquePlayerSet
}


function getAllUniquePlayerData(filename) {
    if (!filename) {
        let today = new Date();
        let date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
        filename = 'GGST_REPLAYS_' + date + '.csv'
    }

    const uniquePlayerSet = getUniquePlayerSet(filename)
    console.log(uniquePlayerSet.size, 'unique IDs observed');

    getAllPlayerData(uniquePlayerSet).then((allPlayerData) => {
        console.log('Writing results to file')
        fs.writeFileSync('playerData.json', JSON.stringify(allPlayerData), 'utf-8');
    })
}

module.exports = { getAllUniquePlayerData, getAllPlayerData }