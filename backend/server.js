import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration for Yahoo Finance symbols
const SYMBOLS = {
  nifty50: "%5ENSEI",    // ^NSEI
  banknifty: "%5ENSEBANK", // ^NSEBANK
  sensex: "%5EBSESN",     // ^BSESN
  reliance: "RELIANCE.NS",
  hdfc: "HDFCBANK.NS"
};

// Base URL for Yahoo Finance API
const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/";

// Common options for all requests
const DEFAULT_OPTIONS = {
  interval: "1d",
  range: "3y"
};

// Generic fetch function
const fetchChartData = async (symbol) => {
  try {
    const response = await axios.get(`${BASE_URL}${symbol}`, {
      params: DEFAULT_OPTIONS,
      timeout: 5000 // 5 second timeout
    });
    
    if (!response.data?.chart?.result) {
      throw new Error("Invalid response format from Yahoo Finance");
    }
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Routes
app.get("/nifty50", async (req, res) => {
  try {
    const data = await fetchChartData(SYMBOLS.nifty50);
    res.json(data);
  } catch (error) {
    console.error("Nifty50 Error:", error.message);
    res.status(500).json({ 
      error: "Error fetching Nifty50 data",
      message: error.message 
    });
  }
});

app.get("/banknifty", async (req, res) => {
  try {
    const data = await fetchChartData(SYMBOLS.banknifty);
    res.json(data);
  } catch (error) {
    console.error("BankNifty Error:", error.message);
    res.status(500).json({ 
      error: "Error fetching BankNifty data",
      message: error.message 
    });
  }
});

app.get("/sensex", async (req, res) => {
  try {
    const data = await fetchChartData(SYMBOLS.sensex);
    res.json(data);
  } catch (error) {
    console.error("Sensex Error:", error.message);
    res.status(500).json({ 
      error: "Error fetching Sensex data",
      message: error.message 
    });
  }
});

app.get("/reliance", async (req, res) => {
  try {
    const data = await fetchChartData(SYMBOLS.reliance);
    res.json(data);
  } catch (error) {
    console.error("Reliance Error:", error.message);
    res.status(500).json({ 
      error: "Error fetching Reliance data",
      message: error.message 
    });
  }
});

app.get("/hdfc", async (req, res) => {
  try {
    const data = await fetchChartData(SYMBOLS.hdfc);
    res.json(data);
  } catch (error) {
    console.error("HDFC Error:", error.message);
    res.status(500).json({ 
      error: "Error fetching HDFC Bank data",
      message: error.message 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unexpected error:", err.stack);
  res.status(500).json({ 
    error: "Internal server error",
    message: "An unexpected error occurred"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Available endpoints:");
  console.log("- /nifty50");
  console.log("- /banknifty");
  console.log("- /sensex");
  console.log("- /reliance");
  console.log("- /hdfc");
  console.log("- /health");
});