var twit = require("twit");
var config = require("./config");
var bot = new twit(config);

const firebase = require("firebase/app");
require('firebase/database');
var config2 = require("./config2");
firebase.initializeApp(config2);
var database = firebase.database();
var ref = database.ref();

const axios = require("axios");
const fs = require("fs");

const puppeteer = require("puppeteer");
run().then(() => console.log("done!")).catch(error => console.log(error));

async function run() {
  // ./node_modules/serve/bin/serve.js ./browser/
  var data = {};
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:5000");

  ref.once("value", function (data) {
    let all = data.val();
    let ids = Object.keys(all);
    data.vectors = all[ids[0]];
  },
  function (error) {
    console.log(error);
  });

  await page.evaluate(function(data) {
    const wordVectors = ml5.word2vec(data, function() {
      console.log("model loaded!");
    });
    // code to execute the word2vec model
  }, data);
  page.on("console", message => console.log(">", message.text()));

  await page._client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: "./"
  });
  await page.waitForSelector("#done", { visible: true, timeout: 0 });
  browser.close();
}

var read = bot.stream("statuses/filter", { track: "@soumya_dead read about" });

read.on("tweet", function (tweetdata) {
  let name = tweetdata.user.screen_name;
  let tweetid = tweetdata.id_str;
  let topics;
  let quote = false;
  if (tweetdata.quoted_status) {
    if (tweetdata.text.search(/@soumya_dead read about/i) == -1)
      quote = true;
  }
  if (!quote && !tweetdata.retweeted_status) {
    let valid = true;
    let text = tweetdata.text;
    let start = text.indexOf("(");
    let end = text.indexOf(")");
    if (start != -1 && end != -1)
      topic = text.substring(start + 1, end).trim().toLowerCase();
    else
      valid = false;
    if (valid == true) {
      interests.push(topic);
      tweet("@" + name + " thank you!! it looks very interesting, i will check it out! :>", tweetid);
      crawl(topic);
      store();
    }
    else
      tweet("@" + name + " i'm sorry i don't understand :<", tweetid);
  }
});

var hello = bot.stream("statuses/filter", { track: "@soumya_dead hello" });

hello.on("tweet", function (tweetdata) {
  let name = tweetdata.user.screen_name;
  let tweetid = tweetdata.id_str;
  let quote = false;
  if (tweetdata.quoted_status) {
    if (tweetdata.text.search(/@soumya_dead hello/i) == -1)
      quote = true;
  }
  if (!quote && !tweetdata.retweeted_status)
    tweet("@" + name + " this feature hasn't been deployed yet :/", tweetid);
});

async function crawl(keyword) {
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
        console.log(title);
        extract(title);
      }
    })
    .catch((error) => console.error(error));
  });
}

async function extract(title) {
  let words = [];
  let url = "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exintro=&titles=" + title;
  let promise = await new Promise((resolve, reject) => {
    axios.get(url)
    .then((response) => {
      let arr = Object.keys(response.data.query.pages);
      let text = response.data.query.pages[arr[0]].extract.replace(/<\/?[^>]+(>|$)/g, "").trim();
      text = text.replace(/[-—]/g, " ").replace(/[-,"'\/#!$%\^&\*;:{}=_`~()]/g, "");
      text = text.replace(/\s{2,}/g, " ").trim().toLowerCase();
      words = words.concat(text.split(" "));
      for (let i = 0; i < words.length; i++) {
        if (/^[a-zA-Z.]+$/.test(words[i]) == false)
          words.splice(i, 1);
      }
      text = words.join(" ");
      fs.appendFile("model/data/others.txt", text, function (err) {
        if (err) throw err;
      });
    })
    .catch((error) => console.error(error));
  });
}

function tweet(text) {
  bot.post("statuses/update", {status: text}, function (error, data, response) {
    if (error)
      console.log("something went wrong D:");
    else
      console.log("tweet sent! :D")
  });
}

function store() {
  var data = fs.readFileSync("model/vector.json");
  data = JSON.parse(data);
  var vectors = data.vectors;
  let keys = Object.keys(vectors);
  for (let i = 1; i < keys.length; i++) {
    if (keys[i].search(/[.#$/[\]]/) != -1)
      delete vectors[keys[i]];
  }
  ref.push(vectors);
}
