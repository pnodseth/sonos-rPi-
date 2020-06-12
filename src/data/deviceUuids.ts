const fs = require("fs")
const fileName = "uuids.json"
const fullpath = __dirname + "/" + fileName;


export const data: Array<deviceUuids> = JSON.parse(fs.readFileSync(fullpath, "utf8"))


export const updateUuidList = (newList: Array<deviceUuids>) => {

  return new Promise((res, rej) => {
    fs.writeFile(fullpath, JSON.stringify(newList), (err) => {
      if (err) {
        rej(err)
      } else {
        res()
      }
    })

  })
}


type deviceUuids = {
  deviceId: String,
  assignedUserId: String | null
}


