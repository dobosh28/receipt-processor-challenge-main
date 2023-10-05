const express = require("express");
const { parse } = require("uuid");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

// In-memory storage for the receipts and their points
let receipts = {};

app.get("/", (req, res) => {
  res.send("Receipt Processor Service");
});

// POST endpoint for /receipts/process
app.post("/receipts/process", (req, res) => {
  const receipt = req.body;

  // Validate the receipt
  if (
    !receipt.retailer ||
    !receipt.purchaseDate ||
    !receipt.items ||
    !receipt.total
  ) {
    res.status(400).json({ error: "Invalid receipt data" });
    return;
  }

  // Generate a unique ID for the receipt
  const id = uuidv4();

  // Calculate the points
  const points = calculatePoints(receipt);

  // Store the receipt and its points
  receipts[id] = {
    data: receipt,
    points: points,
  };

  res.json({ id: id });
});

// GET endpoint for /receipts/{id}/points
app.get("/receipts/:id/points", (req, res) => {
  const id = req.params.id;

  // Validate the ID
  if (!receipts[id]) {
    return res.status(404).json({ error: "No receipt found for that id" });
  }

  res.json({ points: receipts[id].points });
});

function calculatePoints(receipt) {
  let points = 0;

  // One point for every alphanumeric character in the retailer name
  points += receipt.retailer.replace(/[^0-9a-z]/gi, "").length;

  // 50 points if the total is a round total amount with no cents
  if (parseFloat(receipt.total) === Math.floor(parseFloat(receipt.total))) {
    points += 50;
  }

  // 25 points if the total is a multiple of 0.25
  if (parseFloat(receipt.total) % 0.25 === 0) {
    points += 25;
  }

  // 5 points for every two items on the receipt
  points += Math.floor(receipt.items.length / 2) * 5;

  // If the trimmed length of the item description is a multiple of 3, multiply the price by `0.2` and round up to the nearest integer. The result is the number of points earned
  receipt.items.forEach((item) => {
    if (item.shortDescription.trim().length % 3 === 0) {
      points += Math.ceil(parseFloat(item.price) * 0.2);
    }
  });

  // 6 points if the day in the purchase date is odd
  const day = new Date(receipt.purchaseDate).getDate();
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

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
