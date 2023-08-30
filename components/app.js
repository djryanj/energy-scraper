var createError = require("http-errors");
var gracefulShutdown = require("@neurocode.io/k8s-graceful-shutdown");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

var indexRouter = require("../routes/index");
var metricsRouter = require("../routes/metrics");

var app = express();
app.disable("x-powered-by");
// view engine setup
app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "pug");

app.use(logger("combined"));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  })
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/", indexRouter);
app.use("/metrics", metricsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

const healthy = (req, res) => {
  res.send("ok");
};

const notHealthy = (req, res) => {
  res.status(503).send("failed");
};

const healthCheck = gracefulShutdown.getHealthHandler({
  healthy,
  notHealthy,
  test: gracefulShutdown.healthTest,
});
app.get("/healthz", healthCheck);

module.exports = app;
