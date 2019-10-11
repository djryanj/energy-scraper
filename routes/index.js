const express = require("express");
const router = express.Router();
const vars = require("../components/vars");

/* GET home page. */
router.get("/", async function(req, res, next) {
    try {
        result.version = vars.vers;
        result.hostname = vars.hostname;
        result.azureBuildNumber = vars.azureBuildNumber;
        
        res.render("index", result);
    } catch (e) {
        next(e);
    }
});

module.exports = router;