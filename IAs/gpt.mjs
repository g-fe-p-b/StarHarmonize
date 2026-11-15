import OpenAI from "openai";
const client = new OpenAI();

const response = await client.responses.create({
  model: "gpt-6-luna",
  input: "What is your name?",
});

console.log(response.output_text);