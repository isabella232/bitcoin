// BitCoin stream consumer
// mtgox channels: https://mtgox.com/api/2/stream/list_public?pretty
var pubnub = PUBNUB.init({
  subscribe_key: 'sub-c-50d56e1e-2fd9-11e3-a041-02ee2ddab7fe'
});

var startDate = ((Date.now() - 1000 * 60 * 60 * 24) * 10000);

// HistoryLoader
// This object loads the history in increments for a given channel
function HistoryLoader(pubnub, channel) {
  this.pubnub = pubnub;
  this.channel = channel;
};

HistoryLoader.prototype.loadHistory = function(startDate, increment, callback) {
  var data = [], that = this;

  function getHistory(history) {
    if (history.length === 1) {
      // Just push one value since we are only requesting one
      data.push(history[0]);
      
      // Increment our date
      startDate += increment
      
      // Request the next value
      that.getHistory(startDate, 1, getHistory);
    } else {
      // We have reached the end
      callback(data);
    }
  };
  
  // Start the recursion
  this.getHistory(startDate, 1, getHistory);
};

HistoryLoader.prototype.getHistory = function(date, count, callback) {
  // PubNub wants dates with greater precision
  date *= 10000
  
  pubnub.history({
    channel: this.channel,
    count: count,
    start: date,
    reverse: true,
    callback: function (history) {
      callback(history[0]);
    }
  });
};

var updatePrice,
    updateUsers;
document.addEventListener('DOMContentLoaded', function () {
  // Handle the current price value and update it regularly
  var priceEl = document.querySelector('#price');

  updatePrice = function (message) {
    priceEl.innerHTML = message.ticker.avg.display;
  };

  pubnub.history({
    channel: 'd5f06780-30a8-4a48-a2f8-7ed181b4a13f',
    count: 1,
    callback: function (history) {
      if (history[0].length > 0) {
        priceEl.innerHTML = history[0][0].ticker.avg.display;
      }
    }
  });

  // Handle the number of users online and update it regularly
  var usersEl = document.querySelector('#users');

  updateUsers = function (presence) {
    usersEl.innerHTML = presence.occupancy.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
});

// Create the main graph
var margin = {top: 10, right: 10, bottom: 100, left: 40},
    margin2 = {top: 430, right: 10, bottom: 20, left: 40},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom,
    height2 = 500 - margin2.top - margin2.bottom;

var parseDate = d3.time.format("%b %Y").parse;

var x = d3.time.scale().range([0, width]),
    x2 = d3.time.scale().range([0, width]),
    y = d3.scale.linear().range([height, 0]),
    y2 = d3.scale.linear().range([height2, 0]);

var xAxis = d3.svg.axis().scale(x).orient("bottom"),
    xAxis2 = d3.svg.axis().scale(x2).orient("bottom"),
    yAxis = d3.svg.axis().scale(y).orient("left");

var brush = d3.svg.brush()
    .x(x2)
    .on("brush", brushed);

var area = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x(d.ticker.now); })
    .y0(height)
    .y1(function(d) { return y(d.ticker.avg.value); });

var area2 = d3.svg.area()
    .interpolate("monotone")
    .x(function(d) { return x2(d.ticker.now); })
    .y0(height2)
    .y1(function(d) { return y2(d.ticker.avg.value); });

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);

svg.append("defs").append("clipPath")
    .attr("id", "clip")
  .append("rect")
    .attr("width", width)
    .attr("height", height);

var focus = svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var context = svg.append("g")
    .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

// Create a store for graph's data
var graphData = [];

var path1, gx1, gy1, path2, gx2, gy2;

// Initially load the graph with historical data and assign variables
function loadData(data) {
  data.forEach(function(d) {
    d.ticker.now = parseInt(d.ticker.now);
    d.ticker.avg.value = parseFloat(d.ticker.avg.value);
  });

  x.domain(d3.extent(data.map(function(d) { return d.ticker.now; })));
  var maximum = d3.max(data.map(function(d) { return d.ticker.avg.value; })),
      minimum = d3.min(data.map(function (d) { return d.ticker.avg.value; }));
  y.domain([minimum - 10, maximum + 10]);
  x2.domain(x.domain());
  y2.domain(y.domain());

  path1 = focus.append("path")
      .datum(data)
      .attr("clip-path", "url(#clip)")
      .attr("d", area);

  gx1 = focus.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

  gy1 = focus.append("g")
      .attr("class", "y axis")
      .call(yAxis);

  path2 = context.append("path")
      .datum(data)
      .attr("d", area2);

  gx2 = context.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height2 + ")")
      .call(xAxis2);

  gy2 = context.append("g")
      .attr("class", "x brush")
      .call(brush)
    .selectAll("rect")
      .attr("y", -6)
      .attr("height", height2 + 7);
};

// When we get a new value, update the graph with new data
function updateData(newValue, data) {
  newValue.ticker.now = parseInt(newValue.ticker.now);
  newValue.ticker.avg.value = parseFloat(newValue.ticker.avg.value);

  data.push(newValue);

  x.domain(d3.extent(data.map(function(d) { return d.ticker.now; })));
  var maximum = d3.max(data.map(function(d) { return d.ticker.avg.value; })),
      minimum = d3.min(data.map(function (d) { return d.ticker.avg.value; }));
  y.domain([minimum, maximum]);
  x2.domain(x.domain());
  y2.domain(y.domain());

  path1.datum(data);
  //  .attr("d", area);

  //gx1.call(xAxis);

  gy1.call(yAxis);

  path2.datum(data)
    .attr("d", area2);

  gx2.call(xAxis2);

  //gy2.call(brush);
  brushed();
};

// Callback for brushing on the minimap graph
function brushed() {
  x.domain(brush.empty() ? x2.domain() : brush.extent());
  focus.select("path").attr("d", area);
  focus.select(".x.axis").call(xAxis);
};

// Load the past 24 hours of history
var historyLoader = new HistoryLoader(pubnub, 'd5f06780-30a8-4a48-a2f8-7ed181b4a13f'),
    oneHour = 1000 * 60 * 60;
historyLoader.loadHistory((Date.now() - oneHour * 24), oneHour, function (data) {
  console.log("HISTORY DATA", data);

  graphData = data;
  loadData(graphData);

  // Subscribe for new data updates
  pubnub.subscribe({
    channel: 'd5f06780-30a8-4a48-a2f8-7ed181b4a13f',
    callback: function (message) {
      updateData(message, graphData);

      if (updatePrice != null) {
        updatePrice(message);
      }
    },
    presence: function (presence) {
      if (updateUsers != null) {
        updateUsers(presence);
      }
    }
  });
});

