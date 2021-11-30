const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const { default: axios } = require('axios');

function processStats(matchesArr, ranks) {
    const rankFilter = makeRankFilter(ranks);
    rankFilteredGames = matchesArr.filter(rankFilter);
    const gamesSortedByTime = rankFilteredGames.sort((a, b) => { return a.time > b.time ? 1 : -1 });

    const dateOptions = { month: 'short', day: 'numeric' };
    const minDate = new Date(gamesSortedByTime[0].time).toLocaleDateString("en-GB", dateOptions);
    const maxDate = new Date(gamesSortedByTime[gamesSortedByTime.length - 1].time).toLocaleDateString("en-GB", dateOptions);
    const values = getCharacterPlayAndWinRates(rankFilteredGames);

    return { ...values, ranks, maxDate, minDate }
}

function getCharacterPlayAndWinRates(matchesArr) {
    let playRateArray = [];
    let winRateArray = [];
    let winrateErrorsArray = []
    let characterFilteredGamesArray = [];
    const matchupTable = []
    const matchupTableCounts = []
    const matchupTableCertainties = []
    for (let charCode = 0; charCode < 17; charCode++) {
        const characterFilter = makeCharacterFilter(charCode);
        const characterFilteredGames = matchesArr.filter(characterFilter);
        const characterPlayRate = characterFilteredGames.length;
        const characterWinRate = getCharacterWinRate(characterFilteredGames, charCode);
        const characterWinRateError = 2.58 * Math.sqrt((characterPlayRate / characterPlayRate * (1 - characterWinRate / characterPlayRate)) / characterFilteredGames.length)
        characterFilteredGamesArray.push(characterFilteredGames);
        playRateArray.push(characterPlayRate);
        winRateArray.push(characterWinRate);
        winrateErrorsArray.push(characterWinRateError)
        const matchupWinrates = []
        const matchupCounts = []
        const matchupCertainties = []
        for (let i = 0; i < 17; i++) {
            const matchupCharacterFilter = i === charCode ? makeMirrorMatchFilter(charCode) : makeCharacterFilter(i);
            const matchupFilteredGames = characterFilteredGames.filter(matchupCharacterFilter);

            const matchupWinRate = getCharacterWinRate(matchupFilteredGames, charCode);
            const confidence = 2.58 * Math.sqrt((matchupWinRate * (1 - matchupWinRate)) / matchupFilteredGames.length)
            matchupWinrates.push(matchupWinRate);
            matchupCounts.push(matchupFilteredGames.length)
            matchupCertainties.push(confidence);

        }
        matchupTable.push(matchupWinrates);
        matchupTableCounts.push(matchupCounts);
        matchupTableCertainties.push(matchupCertainties)
    }

    const numberOfGames = matchesArr.length

    return { playRateArray, winRateArray, matchupTable, matchupTableCounts, matchupTableCertainties, winrateErrorsArray, numberOfGames };
}

function getCharacterWinRate(characterFilteredGames, charCode) {
    const characterWinFilter = makeCharacterWinFilter(charCode);
    const characterLossFilter = makeCharacterLossFilter(charCode);
    const characterWinFilteredGamesArray = characterFilteredGames.filter(characterWinFilter);
    const characterLossFilteredGamesArray = characterFilteredGames.filter(characterLossFilter);

    const total_games = characterWinFilteredGamesArray.length + characterLossFilteredGamesArray.length;
    return (characterWinFilteredGamesArray.length) / (total_games);

}

function makeRankFilter(ranks) {
    return (currentValue) => ranks.includes(currentValue.floor);
}

function makeCharacterFilter(charCode) {
    return (currentValue) => {
        const charCodes = [currentValue.playerACharCode, currentValue.playerBCharCode];
        result = charCodes.includes(charCode.toString())
        return result
    };
}

function makeCharacterWinFilter(charCode) {
    return (currentValue) => currentValue.winnerCharCode == charCode;
}
function makeCharacterLossFilter(charCode) {
    return (currentValue) => currentValue.loserCharCode == charCode;
}

function makeMirrorMatchFilter(charCode) {
    return (currentValue) => currentValue.playerACharCode == charCode && currentValue.playerBCharCode == charCode;
}


async function getAllStats(filename) {
    if (!filename) {
        filename = 'GGST_REPLAYS_' + new Date().toJSON().slice(0, 10) + '.csv'
    }
    let combinedRecords = []
    let gistRevisions = await axios.get('https://api.github.com/gists/3c6a1d310025803d5ccdc2786e60ede8/commits');
    gistRevisions = gistRevisions.data.map((x) => x.url);
    const numRevisions = 3;
    for (let i = 0; i < numRevisions; i++) {
        console.log('Fetching revison', i + 1, 'of', numRevisions);
        const gist = await axios.get(gistRevisions[i]);
        const gistBody = gist.data;
        const gistFile = await axios.get(gistBody.files["GGST_replays.csv"].raw_url);
        const fileText = await gistFile.data;
        const records = parse(fileText, {
            columns: true,
            skip_empty_lines: true
        })

        if (gistBody.history[i].committed_at > '2021-11-30')
        {
            combinedRecords = combinedRecords.concat(records);
        }
        else {
            console.log('old patch')
        }
        
    }


    input = fs.readFileSync(filename)
    const records = parse(input, {
        columns: true,
        skip_empty_lines: true
    })
    combinedRecords = combinedRecords.concat(records);

    const floorStats = {}
    for (let i = 1; i < 12; i++) {
        i = i === 11 ? 99 : i;
        try {
            floorStats[i] = processStats(combinedRecords, [i.toString()])
        } catch (error) {
            console.error('error getting stats for floor', i);
        }

    }
    console.log('Writing results to file')
    fs.writeFileSync('GGST_STATS_' + new Date().toJSON().slice(0, 10) + '.json', JSON.stringify(floorStats), 'utf-8');
    return floorStats;
}

exports.getAllStats = getAllStats;