const express = require("express");
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

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
