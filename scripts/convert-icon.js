const { promises: fs } = require("fs");
const { Resvg } = require("@resvg/resvg-js");
const path = require("path");

async function convert() {
  const svgPath = path.join(__dirname, "..", "assets", "icon.svg");
  const pngPath = path.join(__dirname, "..", "assets", "icon.png");

  const svgBuffer = await fs.readFile(svgPath);
  const resvg = new Resvg(svgBuffer, {
    fitTo: { mode: "width", value: 1024 },
  });
  const image = resvg.render();
  const pngBuffer = image.asPng();
  await fs.writeFile(pngPath, pngBuffer);
  console.log("icon.png created (1024x1024)");
}

convert().catch((err) => console.error("Error:", err));
