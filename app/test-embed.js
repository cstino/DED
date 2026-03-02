const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
async function test() {
  try {
    const list = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + process.env.GOOGLE_GENERATIVE_AI_API_KEY).then(res => res.json());
    console.log(list.models.filter(m => m.name.includes("embedding")).map(m => m.name + " -> " + m.supportedGenerationMethods.join(", ")));
  } catch(e) { console.error(e.message); }
}
test();
