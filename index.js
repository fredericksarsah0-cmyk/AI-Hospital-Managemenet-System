// api/index.js
// Vercel Serverless Function entry point for the Hospital Management System API
const { handleRequest } = require('../src/server');

module.exports = async (req, res) => {
  return handleRequest(req, res);
};
