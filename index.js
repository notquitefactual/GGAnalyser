const { getAllStats } = require('./processStats')
const GIST_AUTH_KEY = process.env.GIST_AUTH_KEY;
const GIST_ID = process.env.GIST_ID;
let uploadGist = true;
if (!GIST_AUTH_KEY || !GIST_ID) {
	console.log("GIST_AUTH_KEY or GIST_ID environment variable undefined. Results will not be uploaded to a gist")
	uploadGist = false;
}

console.log({ GIST_AUTH_KEY, GIST_ID })
const axios = require('axios');
const { Octokit } = require("@octokit/core");
const octokit = new Octokit({ auth: GIST_AUTH_KEY });
const fs = require('fs');
const qs = require('qs');
const yargs = require('yargs');

const argv = yargs
	.option('pagecount', {
		alias: 'p',
		description: 'specify the number of pages to fetch, default is 10',
		type: 'int',
	})
	.help()
	.alias('help', 'h')
	.argv;

let totalPages = 5;
if (argv.pagecount) {
	totalPages = argv.pagecount;
}
const recordsPerPage = 10;

function toHexString(byteArray) {
	return Array.from(byteArray, function (byte) {
		return ('0' + (byte & 0xFF).toString(16)).slice(-2);
	}).join('')
}

// Convert a hex string to a byte array
function hexToBytes(hex) {
	for (var bytes = [], c = 0; c < hex.length; c += 2)
		bytes.push(parseInt(hex.substr(c, 2), 16));
	return bytes;
}

function JSONToCSV(jsonArr) {
	const replacer = (key, value) => value === null ? '' : value
	const header = Object.keys(jsonArr[0])
	const csv = [
		header.join(','), // header row first
		...jsonArr.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
	].join('\r\n')

	return (csv)
}

// some of these might be wrong, still need to test
const charCodeAIndex = 54;
const charCodeBIndex = 55;
const numRecordsIndex = 47;
const pageIndex = 46;
const superPageIndex = 45;
const categoryIndex = 51; // 0-all, 1-self, 2-follow??, 3-rival, 4-favorite??
const hexTimeIndex = 22; // next 8 maybe 10 bytes?
// const floorAIndex = 44;
// const floorbIndex = 45;
// version has to be updated every update
// TODO: dothis automatically based on error messages
const versionIndex = 37; // next 5 bytes (not sure this is actually the version)
const requestData = [
	// Offset 0x00000000 to 0x00000057
	0x92, 0x95, 0xB2, 0x32, 0x31, 0x31, 0x30, 0x32, 0x37, 0x31, 0x31, 0x33,
	0x31, 0x32, 0x33, 0x30, 0x30, 0x38, 0x33, 0x38, 0x34, 0xAD, 0x36, 0x31,
	0x61, 0x35, 0x65, 0x64, 0x34, 0x66, 0x34, 0x36, 0x31, 0x63, 0x32, 0x02,
	0xA5, 0x30, 0x2E, 0x30, 0x2E, 0x38, 0x03, 0x94, 0x01, 0xCC, 0x00, 0x0A, 0x9A,
	0xFF, 0x00, 0x01, 0x63, 0x90, 0xFF, 0xFF, 0x00, 0x00, 0x01
];

// requestData[pageIndex-1] = 1;
requestData[numRecordsIndex] = recordsPerPage;
requestData[pageIndex] = 0;
const secondsSinceEpoch = Math.round(Date.now() / 1000).toString(16);
const hexTime = hexToBytes(secondsSinceEpoch);
for (let i = 0; i < hexTime.length; i++) {
	requestData[hexTimeIndex + i] = hexTime[i];
}

const config = {
	method: 'post',
	url: 'https://ggst-game.guiltygear.com/api/catalog/get_replay',
	headers: {
		'User-Agent': 'Steam',
		'Cache-Control': 'no-cache',
		'Content-Type': 'application/x-www-form-urlencoded'
	},
};

const fetchData = async () => {
	const data = []
	const requests = [];
	for (let i = 0; i < totalPages; i++) {
		requestData[superPageIndex] = 0xCC;
		//TODO: extend this to infinity
		// i.e find the math formula for this
		if (i > 127) {
			requestData[superPageIndex] = 0xCD
		}
		if (i > Math.floor(i / 256) > 256) {
			requestData[superPageIndex] = 0xCE
		}
		let pageSubArray = []
		if (Math.floor(i / 256) > 1) {
			pageSubArray.push(Math.floor(i / 256))
		}
		pageSubArray.push(i % 256)
		const amendedRequestData = requestData.slice(0, pageIndex).concat(pageSubArray).concat(requestData.slice(pageIndex + 1))
		const requestDataString = toHexString(amendedRequestData);
		config.data = qs.stringify({ 'data': requestDataString });
		try {
			requests.push(axios(config).then((response) => {
				data.push(response.data);
				fs.appendFile('GGST_REPLAYS_' + new Date().toJSON().slice(0, 10) + '.bin', response.data, "binary", (err) => {
					console.log('REQUEST', i + 1, '/', totalPages);
					if (err) {
						console.log(err)
					}
				})
			}));
			const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
			await delay(35)
		} catch (error) {
			console.log(error);
		}
	}
	await Promise.allSettled(requests).
		then((results) => console.log('fulfilled requests:', results.filter(x => x.status === 'fulfilled').length, 'unfulfilled requests:', results.filter(x => x.status !== 'fulfilled').length));
	return data;
}

const parsePlayerData = (playerData) => {
	const infoSep = /�/
	const numUsefulRows = 10;
	playerData = playerData.split(infoSep).filter((x) => x !== '');
	if (playerData.length < numUsefulRows) {
		throw new Error('Invalid Game String')
	}
	const length = playerData.length;
	playerData = playerData.slice(length - numUsefulRows, length);
	const [floor, playerACharCode, playerBCharCode] = [...Buffer.from(playerData[0].slice(-3))]
	const playerAID = playerData[1];
	const playerBID = playerData[5];
	const playerAOnlineID = playerData[4].slice(0, 15);
	const playerBOnlineID = playerData[8].slice(0, 15);
	const playerAName = playerData[2];
	const playerBName = playerData[6];
	const time = playerData[9].slice(0, playerData[9].length - 4)
	const winner = Buffer.from(playerData[8][playerData[8].length - 1]).slice(-1)[0]
	const winnerCharCode = winner === 1 ? playerACharCode : playerBCharCode;
	const loserCharCode = winner === 2 ? playerACharCode : playerBCharCode;

	const gameObject = {
		time,
		floor,
		winner,
		playerAID,
		playerBID,
		playerAOnlineID,
		playerBOnlineID,
		playerAName,
		playerBName,
		playerACharCode,
		playerBCharCode,
		winnerCharCode,
		loserCharCode
	}
	return gameObject;
}
fetchData().then(async (data) => {
	const gameSep = /\uFFFD\uFFFD\u0002\uFFFD/;
	let processedData = []
	for (let page = 0; page < data.length; page++) {
		const sections = data[page].split(gameSep);
		const header = sections[0];
		let processedPayload = sections.slice(1, sections.length);

		const validData = [];
		for (let i = 0; i < processedPayload.length; i++) {
			try {
				validData.push(parsePlayerData(processedPayload[i]))
			} catch (error) {
				console.error(error);
			}
		}
		processedData = processedData.concat(validData);
	}
	const csvData = JSONToCSV(processedData) + '\n'
	fs.writeFileSync('GGST_REPLAYS_' + new Date().toJSON().slice(0, 10) + '.csv', csvData, (err) => {
		if (err) {
			console.log(err)
		}
	});
	if (uploadGist) {
		console.log('Updating gist');
		await updateGist(csvData, true)
		console.log('Done updating gist')
	}
}).catch((err) => console.error(err));


async function updateGist(content, uploadStats) {
	let gist;
	try {
		gist = await octokit.request(`GET /gists/${GIST_ID}`, {
			gist_id: `${GIST_ID}`
		})
	} catch (error) {
		console.error(`Unable to get gist\n${error}`);
	}

	const filename = Object.keys(gist.data.files)[0];

	const files = {
		[filename]: {
			content: content
		}
	}
	if (uploadStats) {
		const statsFilename = 'GGST_STATS.json'
		
		files[statsFilename] = {content:JSON.stringify(await getAllStats())};
	}

	try {
		await octokit.request(`PATCH /gists/${GIST_ID}`, {
			gist_id: `${GIST_ID}`,
			description: `Guilty Gear Strive Data`,
			files: files
		});
	} catch (error) {
		console.error(`Unable to update gist\n${error}`);
	}
}