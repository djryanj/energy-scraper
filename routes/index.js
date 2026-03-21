const express = require("express");
const router = express.Router();
const vars = require("../components/vars");

router.get("/", async function (req, res, next) {
  try {
    res.render("index", {
      title: "Energy Scraper",
      version: vars.vers,
      hostname: vars.hostname,
      gitSha: vars.gitSha,
      gitRef: vars.gitRef,
      releaseVersion: vars.releaseVersion,
      buildNumber: vars.buildNumber,
      mqttTopic: vars.mqttTopic,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
