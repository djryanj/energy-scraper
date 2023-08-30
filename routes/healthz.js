const express = require("express");
const router = express.Router();
const gracefulShutdown = require("@neurocode.io/k8s-graceful-shutdown");

const healthy = (req, res) => {
  res.send("ok");
};

const notHealthy = (req, res) => {
  res.status(503).send("failed");
};

const healthCheck = gracefulShutdown.getHealthHandler({
  healthy,
  notHealthy,
});

/* GET healthz */
router.get("/", healthCheck);

module.exports = router;
