const { init } = require("@heyputer/puter.js/src/init.cjs");

function read_input() {
  return new Promise(function (resolve) {
    let raw = "";
    process.stdin.on("data", function (piece) {
      raw += piece;
    });
    process.stdin.on("end", function () {
      resolve(raw);
    });
  });
}

async function main() {
  const raw = await read_input();
  const job = JSON.parse(raw);
  const puter = init(process.env.PUTER_AUTH_TOKEN);
  const image = await puter.ai.txt2img(job.prompt, { model: job.model });
  const src = String(image.src);
  if (src.startsWith("data:")) {
    process.stdout.write(JSON.stringify({ b64: src.split(",")[1] }));
    return;
  }
  process.stdout.write(JSON.stringify({ url: src }));
}

main().catch(function (problem) {
  process.stdout.write(JSON.stringify({ error: JSON.stringify(problem).slice(0, 300) }));
  process.exit(1);
});
