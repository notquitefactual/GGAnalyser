const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const { default: axios } = require('axios');
const { getAllPlayerData } = require('./getPlayerDetails');

const characterShortNames = ['SOL', 'KYK', 'MAY', 'AXL', 'CHP', 'POT', 'FAU', 'MLL', 'ZAT', 'RAM', 'LEO', 'NAG', 'GIO', 'ANJ', 'INO', 'GLD', 'JKO'];

async function getReplays() {
    let combinedRecords = []
    let gistRevisions = await axios.get('https://api.github.com/gists/3c6a1d310025803d5ccdc2786e60ede8/commits');
    gistRevisions = gistRevisions.data.map((x) => x.url);
    const numRevisions = 7;
    for (let i = 0; i < numRevisions; i++) {
        const gist = await axios.get(gistRevisions[i]);
        const gistBody = gist.data
        const gistFile = await axios.get(gistBody.files["GGST_replays.csv"].raw_url);
        const fileText = await gistFile.data;
        const records = parse(fileText, {
            columns: true,
            skip_empty_lines: true
        })
        combinedRecords = combinedRecords.concat(records);
    }

    return combinedRecords;
}

function getPlayers(records, floorNum) {
    if (floorNum == 11) {
        floorNum = 99
    }

    const uniquePlayerSet = new Set()

    const floorMatches = records.filter((match) => floorNum == match.floor);
    for (let i = 0; i < floorMatches.length; i++) {
        const record = records[i];
        uniquePlayerSet.add(record.playerAID)
        uniquePlayerSet.add(record.playerBID)
    }

    return uniquePlayerSet
}

function getPlayerMain(playerObj) {
    let highestLevelCharacter = '';
    let highestCharacterLevel = 0;
    for (let i = 0; i < characterShortNames.length; i++) {
        const character = characterShortNames[i];
        const characterLevel = playerObj[character + '_Lv']
        if (characterLevel > highestCharacterLevel) {
            highestLevelCharacter = character;
            highestCharacterLevel = characterLevel;
        }
    }

    return highestLevelCharacter;
}

async function main() {
    const records = await getReplays();
    const floors = []
    floors.length = 11;
    console.log('Looking at', records.length, 'records');

    for (let i = 0; i < floors.length; i++) {
        const floorObject = { name: (i + 1).toString() };

        const uniquePlayerSet = getPlayers(records, i + 1);
        const playerData = await getAllPlayerData(uniquePlayerSet);
        console.log('playerData size', Object.keys(playerData).length);
        floorObject.numPlayers = uniquePlayerSet.size;
        // floorObject.playerData = playerData;
        // floorObject.uniquePlayerSet = playerData;

        const mainCounts = {};
        for (const player in playerData) {
            if (Object.hasOwnProperty.call(playerData, player)) {
                const main = getPlayerMain(playerData[player]);

                if (main in mainCounts) {
                    mainCounts[main] += 1;
                }
                else {
                    mainCounts[main] = 1;
                }

            }
        }
        floorObject.OnlineCheatPtAverage = getAverageOfProperty(playerData, 'OnlineCheatPt');
        floorObject.TotalRankMatchAverage = getAverageOfProperty(playerData, 'TotalRankMatch');
        floorObject.MaxVipStatusAverage = getAverageOfProperty(playerData, 'MaxVipStatus');
        floorObject.WorldDollarTotalAverage = getAverageOfProperty(playerData, 'WorldDollarTotal');
        floorObject.RankCheckPtAverage = getAverageOfProperty(playerData, 'RankCheckPt');
        floorObject.TotalPlayTimeAverage = getAverageOfProperty(playerData, 'TotalPlayTime');
        floorObject.NotBeginnerAverage = getAverageOfProperty(playerData, 'NotBeginner');
        floorObject.mainCounts = mainCounts
        console.log(floorObject);
        floors[i] = floorObject;
    }
    
}

function getAverageOfProperty(playerObject,propertyName) {
    const getAverage = arr => {
        let reducer = (total, currentValue) => total + currentValue;
        let sum = arr.reduce(reducer)
        return sum / arr.length;
    }

    const properties = Object.keys(playerObject).map(item => playerObject[item][propertyName]);
    return getAverage(properties)
}

main()