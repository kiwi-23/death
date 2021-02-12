// 1. configure bot
// 2. prepare initial data
// 3. scrape wikipedia articles
// 4. translate into artwork
// 5. deploy to heroku & firebase

const axios = require("axios");

var interests = ["bts"];
var pages = [];
crawl();

async function crawl() {
  let keyword = interests[0];
  let url = "https://en.wikipedia.org/w/api.php";
  let params = {
    action: "query",
    list: "search",
    srsearch: keyword,
    format: "json"
  };
  url = url + "?origin=*";
  Object.keys(params).forEach(function (key) {
    url += "&" + key + "=" + params[key];
  });
  let promise = await new Promise((resolve, reject) => {
    axios.get(url)
    .then((response) => {
      for (let i = 0; i < response.data.query.search.length; i++) {
        let title = response.data.query.search[i].title.replace(/ /g, "_");
        pages.push(title);
        console.log(title);
        // extract(title);
      }
    })
    .catch((error) => console.error(error));
  });
}

async function extract(title) {
  let url = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exintro=&titles=" + title;
  let promise = await new Promise((resolve, reject) => {
    axios.get(url)
    .then((response) => {
      let arr = Object.keys(response.data.query.pages);
      let data = response.data.query.pages[arr[0]].extract.replace(/<\/?[^>]+(>|$)/g, "");
      console.log(data);
    })
    .catch((error) => console.error(error));
  });
}
