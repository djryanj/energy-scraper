#!/usr/bin/env node

/**
 * Module dependencies.
 */

if (process.env.NODE_ENV === "dev") {
  require("dotenv").config();
}
var app = require("./components/app");
var gracefulShutdown = require("@neurocode.io/k8s-graceful-shutdown");
var debug = require("debug")("energy-scraper:server");
var http = require("http");
const vars = require("./components/vars");

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || "3000");
app.set("port", port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);
// Patch NodeJS server close function with a proper close that works as you might expect closing keep-alive connections for you!
// Read here for more info https://github.com/nodejs/node/issues/2642
server.close = gracefulShutdown.shutdown(server);
/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on("error", onError);
server.on("listening", onListening);

const sleep = (time) => new Promise((resolve) => setTimeout(resolve, time));

const asyncOperation = async () =>
  sleep(3000).then(() => console.log("Async op done"));

const closeServers = async () => {
  await asyncOperation(); // can be any async operation such as mongo db close, or send a slack message ;)
  server.close();
};

const gracePeriodSec = 5 * 1000;
gracefulShutdown.addGracefulShutdownHook(gracePeriodSec, closeServers);

server.addListener("close", () =>
  console.log("shutdown after graceful period")
);
/**
 * Export current config data to the log
 */

logConfigData();

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== "listen") {
    throw error;
  }

  var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case "EACCES":
      console.error(bind + " requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
  debug("Listening on " + bind);
  console.log("Listening on " + bind);
}

function logConfigData() {
  console.log("Staring solar-scraper environent: " + process.env.NODE_ENV);
  console.log(
    "Current configuration data (see documentation for how to set these with environment variables): "
  );
  console.log(JSON.stringify(vars, undefined, 2));
}
