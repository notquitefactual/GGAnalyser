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

window.onload = function () {
    const form = document.getElementById('form');
    form.addEventListener("submit", applySelectedFloors);
    document.getElementById('floor99').checked = true;


    const csvString = 'https://raw.githubusercontent.com/notquitefactual/totsugeki/dev/GGST_Replays.csv'
    const papaConfig = {
        download: true,
        dynamicTyping: true,
        complete: function (results) {
            globalMatchesArr = results.data;
            globalMatchesArr.shift()
            console.log("Dataset contains", globalMatchesArr.length, "samples");
            processStats(globalMatchesArr, getSelectedFloors())
        }
    };

    Papa.parse(csvString, papaConfig);
};

function processStats(matchesArr, ranks) {
    const rankFilter = makeRankFilter(ranks);
    rankFilteredGames = matchesArr.filter(rankFilter);
    const fineprint = document.getElementById('fineprint')
    let maxDate = rankFilteredGames.reduce((a, b) => { return a > b ? a : b });
    let minDate = rankFilteredGames.reduce((a, b) => { return a < b ? a : b });
    
    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
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
        }]
    }];
    const barLayout = {
        title: 'Character Winrates',
        xaxis: { range: [0.4, 0.6] },
        width: parent_width,
        height: parent_height,
    };
    Plotly.newPlot('charWinrateBar', barData, barLayout, config);

}

function getCharacterPlayAndWinRates(matchesArr) {
    let playRateArray = [];
    let winRateArray = [];
    let characterFilteredGamesArray = [];

    for (let charCode = 0; charCode < 17; charCode++) {
        const characterFilter = makeCharacterFilter(charCode);
        const characterFilteredGames = matchesArr.filter(characterFilter);
        const characterPlayRate = characterFilteredGames.length;
        const characterWinRate = getCharacterWinRate(characterFilteredGames, charCode);
        characterFilteredGamesArray.push(characterFilteredGames)
        playRateArray.push(characterPlayRate)
        winRateArray.push(characterWinRate)
    }

    const average = (array) => array.reduce((a, b) => a + b) / array.length;
    console.log('WINRATE MEAN', average(winRateArray));

    return { playRateArray, winRateArray };
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
    return (currentValue) => currentValue.slice(2, 4).includes(charCode);
}

function makeCharacterWinFilter(charCode) {
    // return (currentValue) => currentValue[5] == charCode;
    return (currentValue) => {
        const winner = currentValue[4];
        const winnerCode = winner == 1 ? currentValue[2] : currentValue[3];
        return winnerCode == charCode
    };
}
function makeCharacterLossFilter(charCode) {
    return (currentValue) => {
        const winner = currentValue[4];
        const loserCode = winner == 1 ? currentValue[3] : currentValue[2];
        return loserCode == charCode
    };
}

function makeMirrorMatchFilter(charCode) {
    return (currentValue) => currentValue[2] == charCode && currentValue[3] == charCode;
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
