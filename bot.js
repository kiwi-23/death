const { JSDOM } = require( "jsdom" );
const { window } = new JSDOM( "" );
const $ = require( "jquery" )( window );

var twit = require("twit");
var config = require("./config");
var bot = new twit(config);

var user = {};

var users = {};
var users_list = [];
var interests = [];

var neighbors = {};
var predictions = [];

$.getJSON("https://spreadsheets.google.com/feeds/list/1Be5_SSEhSyMLSabDbckaYpltSSxlyK8fEOA1Ti-k4NQ/1/public/values?alt=json", function(data) {
  for (let i = 0; i < data.feed.entry.length; i++) {
    let name = data.feed.entry[i]["gsx$name"]["$t"];
    name = name.trim();
    let space = name.indexOf(' ');
    if (space != -1)
      name = name.substring(0, space);
    name = name.toLowerCase();
    users[name] = {};
    users[name].name = name;
    users[name].interests = {};
    let content = data.feed.entry[i].content["$t"];
    interests = content.split(",");
    interests.splice(0, 1);
    for (let j = 0; j < interests.length; j++) {
      let interest = interests[j].trim();
      let colon = interest.indexOf(":");
      interest = interest.substring(0, colon);
      interests[j] = interest;
      users[name].interests[interest] = parseInt(data.feed.entry[i]["gsx$" + interest]["$t"]);
    }
    users_list.push(users[name]);
  }
  user = users_list[0];
  users_list.splice(0, 1);
  for (let i = 0; i < interests.length; i++) {
      user.interests[interests[i]] = null;
  }
  calculate();
  crawl();
});

function calculate() {
  for (let i = 0; i < users_list.length; i++) {
    let other = users_list[i];
    let score = euclidean(user, other);
    neighbors[other.name] = score;
  }
  users_list.sort(compare);
  for (let i = 0; i < interests.length; i++) {
    let interest = interests[i];
    if (user.interests[interest] == null) {
      let prediction = {};
      prediction.keyword = interest;
      let ssum = 0;
      let wsum = 0;
      let sum = 0;
      let k = 3;
      for (let j = 0; j < k; j++) {
        let name = users_list[j].name;
        let rating = users[name].interests[interest];
        let weight = neighbors[name];
        wsum += rating * weight;
        ssum += weight;
      }
      sum = wsum / ssum;
      let rating = sum.toString();
      let decimal = rating.indexOf(".");
      if (decimal != -1)
        rating = rating.substring(0, decimal + 3);
      prediction.rating = parseFloat(rating);
      predictions.push(prediction);
    }
  }
  // console.log(predictions);
}

function euclidean(user1, user2) {
  let sum = 0;
  for (let i = 0; i < interests.length; i++) {
    let interest = interests[i];
    let rating1 = user1.interests[interest];
    if (rating1 == null)
      continue;
    let rating2 = user2.interests[interest];
    let diff = rating1 - rating2;
    sum += diff * diff;
  }
  let distance = Math.sqrt(sum);
  distance = 1 / (distance + 1);
  return distance;
}

function compare(a, b) {
  let score1 = neighbors[a.name];
  let score2 = neighbors[b.name];
  return score1 - score2;
}

async function crawl() {
  let keyword = predictions[0].keyword;
  console.log(keyword);
  let url = "https://en.wikipedia.org/w/api.php";
  let params = {
    action: "query",
    list: "search",
    srsearch: keyword,
    format: "json"
  };
  url = url + "?origin=*";
  Object.keys(params).forEach(function(key) {
    url += "&" + key + "=" + params[key];
  });
  console.log(url);
  fetch(url)
    .then(function(response) {
      return response.json();
    })
    .then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.log(error);
    });
}

var stream = bot.stream("statuses/filter", { track: "@taegificbot recommend" });

stream.on("tweet", function (data) {
  let name = data.user.screen_name;
  // tweet();
});

function tweet(text) {
  bot.post("statuses/update", { status: text }, function(error, data, response) {
    if (error)
      console.log("something went wrong!");
    else
      console.log("tweet sent!")
  });
}
