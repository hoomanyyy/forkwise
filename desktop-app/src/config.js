const fs = require("fs")
const path = require("path")

const DEFAULTS = { token: "", server: "https://api.forkwiseai.com", confirm: false, always: [], autoStart: false, roots: [], deviceId: "" }

function create(folder) {
  const file = path.join(folder, "config.json")
  let data = Object.assign({}, DEFAULTS)
  try {
    data = Object.assign(data, JSON.parse(fs.readFileSync(file, "utf8")))
  } catch (problem) {}

  function save() {
    fs.mkdirSync(folder, { recursive: true })
    fs.writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 })
  }

  return {
    get: function (key) {
      return data[key]
    },
    set: function (key, value) {
      data[key] = value
      save()
    },
    all: function () {
      return Object.assign({}, data)
    }
  }
}

module.exports = { create }
