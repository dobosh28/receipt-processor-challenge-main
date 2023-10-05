// 1. Imports
const express = require("express");
const { v4: uuidv4 } = require("uuid");

// 2. App Initialization and Constants
const app = express();
const PORT = 8080;
const receipts = {}; // In-memory storage for the receipts and their points

app.use(express.json());

// 3. Middleware Definitions
function ensureJsonContentType(req, res, next) {
  const contentType = req.headers["content-type"];
  if (contentType && contentType.includes("application/json")) {
    next();
  } else {
    res
      .status(400)
      .json({ error: "Expected application/json content-type in header." });
  }
}

// 4. Helper Functions

// Validates the receipt object
function isValidReceipt(receipt) {
  if (!receipt.retailer || !/^\S(.*\S)?$/g.test(receipt.retailer))
    return "Invalid retailer";
  if (
    !receipt.purchaseDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(receipt.purchaseDate)
  )
    return "Invalid purchase date";
  if (!receipt.purchaseTime || !/^\d{2}:\d{2}$/.test(receipt.purchaseTime))
    return "Invalid purchase time";
  if (!Array.isArray(receipt.items) || receipt.items.length < 1)
    return "Invalid items";
  for (let item of receipt.items) {
    if (!item.shortDescription || !/^[\w\s\-]+$/.test(item.shortDescription))
      return "Invalid item description";
    if (!item.price || !/^\d+\.\d{2}$/.test(item.price))
      return "Invalid item price";
  }
  if (!receipt.total || !/^\d+\.\d{2}$/.test(receipt.total))
    return "Invalid total";

  return true;
}

// Calculates the points for a receipt
function calculatePoints(receipt) {
  let points = 0;

  // One point for every alphanumeric character in the retailer name
  points += receipt.retailer.replace(/[^0-9a-z]/gi, "").length;

  // 50 points if the total is a round total amount with no cents
  if (parseFloat(receipt.total) === Math.floor(parseFloat(receipt.total))) {
    points += 50;
  }

  // 25 points if the total is a multiple of 0.25
  if ((parseFloat(receipt.total) * 100) % 25 === 0) {
    points += 25;
  }

  // 5 points for every two items on the receipt
  points += Math.floor(receipt.items.length / 2) * 5;

  // If the trimmed length of the item description is a multiple of 3
  receipt.items.forEach((item) => {
    if (item.shortDescription.trim().length % 3 === 0) {
      points += Math.ceil(parseFloat(item.price) * 0.2);
    }
  });

  // 6 points if the day in the purchase date is odd
  const day = new Date(receipt.purchaseDate).getUTCDate();
  if (day % 2 === 1) {
    points += 6;
  }

  // 10 points if the the time of purchase is after 2:00pm and before 4:00pm
  const purchaseTime = receipt.purchaseTime.split(":");
  const hours = parseInt(purchaseTime[0]);
  if (hours >= 14 && hours < 16) {
    points += 10;
  }

  return points;
}

// 5. Routes
app.get("/", (req, res) => {
  res.send("Receipt Processor Service");
});

// POST endpoint for /receipts/process
app.post("/receipts/process", ensureJsonContentType, (req, res) => {
  const { body: receipt } = req;
  const validationResult = isValidReceipt(receipt);
  if (validationResult !== true) {
    return res.status(400).json({ error: validationResult });
  }

  const id = uuidv4();
  const points = calculatePoints(receipt);
  receipts[id] = { data: receipt, points };

  res.json({ id });
});

// GET endpoint for /receipts/{id}/points
app.get("/receipts/:id/points", (req, res) => {
  const { id } = req.params;
  if (!receipts[id]) {
    return res.status(404).json({ error: "No receipt found for that id" });
  }
  res.json({ points: receipts[id].points });
});

// 6. Server Start
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
