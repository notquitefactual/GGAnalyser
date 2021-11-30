const readable_character_names = ['sol', 'ky', 'may', 'axl', 'chipp', 'potemkin', 'faust', 'millia', 'zato', 'ramlethal', 'leo', 'nagoriyuki', 'giovanna', 'anji', 'i-no', 'goldlewis', 'jack-o', 'happy chaos']
var floorStats

window.onload = async function () {

    const form = document.getElementById('form');
    form.addEventListener("submit", applySelectedFloors);
    document.getElementById('floor99').checked = true;

    const response = await fetch('https://gist.githubusercontent.com/notquitefactual/3c6a1d310025803d5ccdc2786e60ede8/raw/GGST_STATS.json');
    floorStats = await response.json()
    console.log(floorStats[99])
    processStats(99)
};

function processStats(rank) {
    console.log('selected rank', rank);
    const fineprint = document.getElementById('fineprint');
    if (!rank in floorStats) {
        alert("Looks like we don't have any data for that selection.\nSorry :(")
    }
    const rankFilteredStats = floorStats[rank]
    const maxDate = rankFilteredStats.maxDate;
    const minDate = rankFilteredStats.minDate;
    const numberOfGames = rankFilteredStats.numberOfGames;

    console.log(maxDate, minDate)
    fineprint.innerText = `Data compiled from ${numberOfGames} matches gathered between ${minDate} and ${maxDate}`
    let parent_width = document.getElementById('charUsagePie').parentElement.width;
    let parent_height = document.getElementById('charUsagePie').parentElement.height;
    const characterPlayRates = rankFilteredStats.playRateArray;
    const characterWinRates = rankFilteredStats.winRateArray;
    const characterWinRateErrors = rankFilteredStats.winrateErrorsArray;
    const matchupTable = rankFilteredStats.matchupTable;
    const matchupCounts = rankFilteredStats.matchupTableCounts;
    const matchupCertainties = rankFilteredStats.matchupTableCertainties;

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
        title: 'Matchup Table (read left to right)',
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
                confidence: (+matchupCertainties[i][j]).toFixed(2),
                winrate: (+matchupTable[i][j]).toFixed(4),
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
            colorscale: piYG,
            type: 'heatmap'
        }
    ];

    Plotly.newPlot('heatmapChart', heatmapData, heatmapLayout);

}

function getSelectedFloor() {
    let selectedFloor = 0;
    for (let i = 1; i < 11; i++) {
        const checkboxID = 'floor' + i;
        if (document.getElementById(checkboxID).checked) {
            selectedFloor = i
        }
    }
    if (document.getElementById('floor99').checked) {
        selectedFloor = 99
    }
    return selectedFloor;
}

function applySelectedFloors(event) {
    event.preventDefault();
    processStats(getSelectedFloor())
    return false
}
