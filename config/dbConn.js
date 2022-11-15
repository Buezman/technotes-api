const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    mongoose.connect(process.env.DATABASE_URI);
  } catch (e) {
    console.log(e);
  }
};

module.exports = connectDB;
