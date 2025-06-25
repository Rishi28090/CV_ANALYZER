const express =require("express");
const multer = require('multer');
const dotenv = require('dotenv');
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const PdfParse = require("pdf-parse");
const { default: axios } = require("axios");

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads/" });

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/",(req,res)=>{
    return res.render("index");

})

app.post("/upload", upload.single("resume"), async (req, res) => {
  const filePath = path.join(__dirname, req.file.path);

  try {
    // ✅ Read and parse PDF
    const pdfBuffer = fs.readFileSync(filePath);
    const parsed = await pdfParse(pdfBuffer);
    const resumeText = parsed.text;

    if (!resumeText || resumeText.trim() === "") {
      throw new Error("Failed to extract text from PDF.");
    }

    // ✅ Prepare Prompt
    const prompt = `
You are a professional resume reviewer.
Please analyze the following resume and respond with:

1. Top Skills
2. Career Strengths
3. Weaknesses or areas to improve
4. Suggestions for improvement

Resume:
${resumeText}
`;
console.log("Extracted Resume Text:", resumeText);


    // ✅ Send to Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ]
      }
    );

    const analysis = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    res.render("result", { analysis });

  } catch (err) {
    console.error("Error:", err.message);
    res.status(500).send("Error analyzing resume: " + err.message);
  } finally {
    // ✅ Clean up temp file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
});

app.listen(process.env.PORT,()=>{
    console.log("server started");
})