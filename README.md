# project_asuka
A simple nodeJS script to fetch Guilty Gear Strive replays Autonomously

## Instructions
  1. run npm install
  2. (optional) setup GIST_AUTH_KEY and GIST_ID environment variables
  3. run node index.js -p 1000
  
 the -p parameter specifies how many pages of data to fetch. A page should have 8 matches.
 
 ## How to use the data
 Ther script generates 2 files: GGST_REPLAYS_YYYY-MM-DD.bin and GGST_REPLAYS_YYYY-MM-DD.csv
 
 The .bin file contains the raw responses from the API and can mostly be ignored
 The .csv file contains the processed data which can be used for analysis
 
 ## Uploading to a github gist
 If a gist auth token and gist id are provided then the script will attempt to update the given gist id and upload the csv file under the name GGST_replays.csv
 
 ## Time to run the script
 The script sends a request every 100ms (10 times a second) and thus scales linearly with the number of pages requested. There is also some overhead related with processing the data.
 In my experience it takes around 35 minutes to download 20 000 pages.
