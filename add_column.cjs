require("dotenv").config();
const { Client } = require("pg");

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log("Connected to DB.");

  try {
    await client.query("ALTER TABLE public.orders ADD COLUMN daily_number INT DEFAULT 1;");
    console.log("Column daily_number added successfully.");
  } catch (err) {
    if (err.code === "42701") {
      console.log("Column already exists. Skipping.");
    } else {
      console.error("Error adding column:", err);
    }
  }

  await client.end();
}

main();
