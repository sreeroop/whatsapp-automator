const qrcode = require("qrcode-terminal");
const { Client } = require("whatsapp-web.js");
const fs = require("fs");
const csv = require("csv-parser");
const { exit } = require("process");

const OUTPUT_FILE_PATH = "../outputs/output.csv"
const GROUP_NAME = "Chumma";

const client = new Client();

client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on("ready", async () => {
    console.log("Client is ready!");
});

client.on("ready", () => {
    fs.writeFile(OUTPUT_FILE_PATH, 'phone\n', err => { })
    const outstream = fs.createWriteStream(OUTPUT_FILE_PATH, { flags: 'a' })
    client.getChats().then((chats) => {
        const group = chats.find((chat) => chat.name == GROUP_NAME);
        const participants = group.participants;
        participants.forEach((participant) => {

            console.log(participant.id.user, "\n")
            outstream.write(`${participant.id.user}\n`)
        })
    });
});

client.initialize();