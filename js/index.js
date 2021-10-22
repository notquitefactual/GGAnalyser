const readable_character_names = ['sol', 'ky', 'may', 'axl', 'chipp', 'potemkin', 'faust', 'millia', 'zato', 'ramlethal', 'leo', 'nagoriyuki', 'giovanna', 'anji', 'i-no', 'goldlewis', 'jack-o']
const charColors = [
    'rgb(253, 122, 97)',
    'rgb(0, 176, 244)',
    'rgb(255, 179, 76)',
    'rgb(95, 80, 80)',
    'rgb(207, 201, 210)',
    'rgb(160, 171, 135)',
    'rgb(80, 34, 19)',
    'rgb(255, 217, 187)',
    'rgb(36, 46, 50)',
    'rgb(0, 158, 115)',
    'rgb(255, 242, 175)',
    'rgb(95, 61, 52)',
    'rgb(0, 249, 177)',
    'rgb(0, 154, 234)',
    'rgb(247, 89, 80)',
    'rgb(150, 125, 105)',
    'rgb(99, 224, 165)',
]

var globalMatchesArr = null;
var rankFilteredGames = null;
var charUsagePieChart = null;
var charWinrateChart = null;


window.onload = async function () {
    Papa.parsePromise = function (file, config) {
        return new Promise(function (complete, error) {
            Papa.parse(file, config);
        });
    };
    const form = document.getElementById('form');
    form.addEventListener("submit", applySelectedFloors);
    document.getElementById('floor99').checked = true;

    let gistRevisions = await fetch('https://api.github.com/gists/3c6a1d310025803d5ccdc2786e60ede8/commits');
    gistRevisions = (await gistRevisions.json()).map((x) => x.url);
    const numRevisions = 3;
    globalMatchesArr = [];
    const papaConfig = {
        download: true,
        dynamicTyping: true,
        complete: function (results) {
            csvdata = results.data;
            csvdata.shift();
            // console.log(csvdata);
            globalMatchesArr = globalMatchesArr.concat(csvdata);
            lock += 1;
            if (lock >= numRevisions) {
                console.log("Dataset contains", globalMatchesArr.length, "samples");
                processStats(globalMatchesArr, getSelectedFloors())
            }
        }
    };

    let lock = 0;
    for (let i = 0; i < numRevisions; i++) {
        const gist = await fetch(gistRevisions[i]);
        const gistBody = await (gist.json())
        const csvString = gistBody.files["GGST_replays.csv"].raw_url;
        Papa.parsePromise(csvString, papaConfig)
    }

};

function processStats(matchesArr, ranks) {
    const rankFilter = makeRankFilter(ranks);
    rankFilteredGames = matchesArr.filter(rankFilter);
    console.log("Head:", rankFilteredGames.slice(0, 10));
    const fineprint = document.getElementById('fineprint');
    if (rankFilteredGames.length <= 0) {
        alert("Looks like we don't have any data for that selection.\nSorry :(")
    }
    let maxDate = rankFilteredGames.reduce((a, b) => { return a > b ? a : b });
    let minDate = rankFilteredGames.reduce((a, b) => { return a < b ? a : b });

    const dateOptions = { month: 'short', day: 'numeric' };
    maxDate = new Date(maxDate[0]).toLocaleDateString("en-US", dateOptions);
    minDate = new Date(minDate[0]).toLocaleDateString("en-US", dateOptions);
    console.log(maxDate, minDate)
    fineprint.innerText = `Data compiled from ${rankFilteredGames.length} matches gathered between ${minDate} and ${maxDate}`
    console.log("Data computed from", rankFilteredGames.length, "samples");
    let parent_width = document.getElementById('charUsagePie').parentElement.width;
    let parent_height = document.getElementById('charUsagePie').parentElement.height;
    const values = getCharacterPlayAndWinRates(rankFilteredGames);
    const characterPlayRates = values.playRateArray;
    const characterWinRates = values.winRateArray;
    const characterWinRateErrors = values.winrateErrorsArray;
    const matchupTable = values.matchupTable;
    const matchupCounts = values.matchupTableCounts;
    const matchupCertainties = values.matchupTableCertainties;

    const config = { responsive: true }
    const pieData = [{
        type: 'pie',
        values: characterPlayRates,
        labels: readable_character_names,
        textinfo: "label+percent",
        textposition: "outside",
    }];

    const pieLayout = {
        title: 'Character Usage',
        padding: { "t": 1, "b": 1, "l": 0, "r": 0 },
        showlegend: false,
        width: parent_width,
        height: parent_height,
    };

    Plotly.newPlot('charUsagePie', pieData, pieLayout, config);

    parent_width = document.getElementById('charWinrateBar').parentElement.width;

    const barData = [{
        type: 'bar',
        x: characterWinRates,
        y: readable_character_names,
        orientation: 'h',
        transforms: [{
            type: 'sort',
            target: 'x',
            order: 'ascending'
        }],
        error_x: {
            type: 'data',
            array: characterWinRateErrors,
            visible: true
        },
    }];
    const barLayout = {
        title: 'Character Winrates',
        xaxis: { range: [0.4, 0.6] },
        width: parent_width,
        height: parent_height,
    };
    Plotly.newPlot('charWinrateBar', barData, barLayout, config);

    const piYG = [
        [0, '#d01c8b'],
        [0.25, '#f1b6da'],
        [0.5, '#ffffff'],
        [0.75, '#b8e186'],
        [1, '#4dac26']
    ];

    const heatmapLayout = {
        title: 'Matchup Table (read left to right) <br>(this is still a WIP pls report any inconsistencies to my reddit account <a href="https://www.reddit.com/message/compose/?to=NotQuiteFactual">/u/notquitefactual</a>)</br>',
        width: parent_width,
        height: parent_height,
        annotations: [],
    };
    const hoverText = []
    for (var i = 0; i < readable_character_names.length; i++) {
        const temp = [];
        for (var j = 0; j < readable_character_names.length; j++) {
            var currentValue = matchupTable[i][j];
            if (currentValue >= 0.8 || currentValue <= 0.2) {
                var textColor = 'white';
            } else {
                var textColor = 'black';
            }
            var result = {
                xref: 'x1',
                yref: 'y1',
                x: readable_character_names[j],
                y: readable_character_names[i],
                confidence: matchupCertainties[i][j].toFixed(2),
                winrate: matchupTable[i][j].toFixed(4),
                gamecount: matchupCounts[i][j],

                text: Math.round(matchupTable[i][j] * 10),
                font: {
                    family: 'Arial',
                    size: 12,
                    color: 'rgb(50, 171, 96)'
                },
                showarrow: false,
                font: {
                    color: textColor
                }
            };
            heatmapLayout.annotations.push(result);
            temp.push(`${result.y} vs ${result.x} = ${result.winrate} ± ${result.confidence}<br>with 95% confidence<br>based on ${result.gamecount} games</br></br>`)
        }
        hoverText.push(temp)
    }
    const heatmapData = [
        {
            z: matchupTable,
            x: readable_character_names,
            y: readable_character_names,
            text: hoverText,
            hoverinfo: 'text',
            // hovertemplate: '%{y} vs %{x} = %{z:0.4f} with confidence %{t:0.4f}',
            colorscale: piYG,
            type: 'heatmap'
        }
    ];

    Plotly.newPlot('heatmapChart', heatmapData, heatmapLayout);

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
            // console.log(readable_character_names[charCode], 'vs', readable_character_names[i], matchupWinRate, 'with confidence:', confidence, 'based on', matchupFilteredGames.length, 'games')
            matchupWinrates.push(matchupWinRate);
            matchupCounts.push(matchupFilteredGames.length)
            matchupCertainties.push(confidence);

        }
        matchupTable.push(matchupWinrates);
        matchupTableCounts.push(matchupCounts);
        matchupTableCertainties.push(matchupCertainties)
    }

    const average = (array) => array.reduce((a, b) => a + b) / array.length;
    console.log('WINRATE MEAN', average(winRateArray));
    console.log('CONFIDENCE MEAN', average(matchupTableCertainties.map((x) => average(x))));

    return { playRateArray, winRateArray, matchupTable, matchupTableCounts, matchupTableCertainties, winrateErrorsArray };
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
    return (currentValue) => ranks.includes(currentValue[1]);
}

function makeCharacterFilter(charCode) {
    return (currentValue) => currentValue.slice(-2).includes(charCode);
}

function makeCharacterWinFilter(charCode) {
    return (currentValue) => currentValue[5] == charCode;
}
function makeCharacterLossFilter(charCode) {
    return (currentValue) => currentValue[6] == charCode;
}

function makeMirrorMatchFilter(charCode) {
    return (currentValue) => currentValue[3] == charCode && currentValue[4] == charCode;
}

function getSelectedFloors() {
    const selectedFloors = [];
    for (let i = 1; i < 11; i++) {
        const checkboxID = 'floor' + i;
        if (document.getElementById(checkboxID).checked) {
            selectedFloors.push(i)
        }
    }
    if (document.getElementById('floor99').checked) {
        selectedFloors.push(99)
    }
    return selectedFloors;
}

function applySelectedFloors(event) {
    event.preventDefault();
    processStats(globalMatchesArr, getSelectedFloors())
    return false
}

function updateDataset(chart, labels, dataset) {
    chart.data.labels = labels;
    chart.data.datasets = dataset
    chart.update();
}
