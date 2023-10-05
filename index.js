const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

// In-memory storage for the receipts and their points
let receipts = {};

app.get("/", (req, res) => {
  res.send("Receipt Processor Service");
});

// Middleware to ensure content type is application/json
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

// POST endpoint for /receipts/process
app.post("/receipts/process", ensureJsonContentType, (req, res) => {
  const receipt = req.body;

  // Validate the receipt
  const validationResult = isValidReceipt(receipt);
  if (validationResult !== true) {
    res.status(400).json({ error: validationResult });
    return;
  }

  const id = uuidv4();
  const points = calculatePoints(receipt);
  receipts[id] = { data: receipt, points: points };

  res.json({ id: id });
});

// GET endpoint for /receipts/{id}/points
app.get("/receipts/:id/points", (req, res) => {
  const id = req.params.id;
  if (!receipts[id]) {
    return res.status(404).json({ error: "No receipt found for that id" });
  }
  res.json({ points: receipts[id].points });
});

// Validation function to check if a receipt is valid
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

function calculatePoints(receipt) {
  let points = 0;

  // One point for every alphanumeric character in the retailer name
  points += receipt.retailer.replace(/[^0-9a-z]/gi, "").length;
  // console.log("Points after retailer:", points);

  // 50 points if the total is a round total amount with no cents
  if (parseFloat(receipt.total) === Math.floor(parseFloat(receipt.total))) {
    points += 50;
  }
  // console.log("Points after round total check:", points);

  // 25 points if the total is a multiple of 0.25
  if ((parseFloat(receipt.total) * 100) % 25 === 0) {
    points += 25;
  }
  // console.log("Points after 0.25 multiple check:", points);

  // 5 points for every two items on the receipt
  points += Math.floor(receipt.items.length / 2) * 5;
  // console.log("Points after items count:", points);

  // If the trimmed length of the item description is a multiple of 3
  receipt.items.forEach((item) => {
    if (item.shortDescription.trim().length % 3 === 0) {
      points += Math.ceil(parseFloat(item.price) * 0.2);
    }
  });
  // console.log("Points after item description check:", points);

  // 6 points if the day in the purchase date is odd
  const day = new Date(receipt.purchaseDate).getUTCDate();
  if (day % 2 === 1) {
    points += 6;
  }
  // console.log("Points after date check:", points);

  // 10 points if the the time of purchase is after 2:00pm and before 4:00pm
  const purchaseTime = receipt.purchaseTime.split(":");
  const hours = parseInt(purchaseTime[0]);
  if (hours >= 14 && hours < 16) {
    points += 10;
  }
  // console.log("Points after time check:", points);
  return points;
}

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
