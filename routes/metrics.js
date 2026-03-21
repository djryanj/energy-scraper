const express = require("express");
const router = express.Router();
const metricsRuntime = require("../components/metrics-runtime");

router.get("/", async function (req, res, next) {
  try {
    metricsRuntime.setInfoMetric();
    res.set("Content-Type", metricsRuntime.contentType);
    res.send(await metricsRuntime.metrics());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
