const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");
const fs = require("fs");
const csv = require("csv-parser");

//file which has contacts of users
const INPUT_FILE_PATH = "data/contacts.csv"

//stores registered numbers
let contacts = [];


//Client with local auth
const client = new Client({ authStrategy: new LocalAuth() });

//image to be sent
const image = MessageMedia.fromFilePath("data/img.jpg")

//generate qr for authentication
client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});

//function for checking whether the user is registered or not.
const isRegistered = async (number, name) => {
    number_details = await client.getNumberId(number); // get mobile number details
    if (number_details) {
        contacts.push({
            name: name,
            number: number_details?._serialized
        })
    } else {
        console.log(number, "Mobile number is not registered");
        errNos.push({
            name: name,
            number: number
        })
    }
}

client.on("authenticated", async () => {
    console.log("Authed!");
    fs.createReadStream(INPUT_FILE_PATH)
        .pipe(csv())
        .on("data", async (data) => {
            const { phone, name } = data
            const sanitized_number = phone.toString().replace(/[^0-9]/g, ""); // remove unnecessary chars from the number
            let final_number;
            if (sanitized_number.length == 10) {
                final_number = `91${sanitized_number}`; // add 91 before the number here 91 is country code of India
                await isRegistered(final_number, name)

            } else {
                final_number = `${sanitized_number}`;
                await isRegistered(final_number, name)
            }
        })

});

client.on("ready", async () => {
    console.log("Client is ready!");
    contacts.forEach(contact => {
        const message = `Hello ${contact.name}`
        client.sendMessage(contact.number, message)
        client.sendMessage(contact.number, image)
            .then(() => {
                console.log(`message sent to : ${contact.number}-${contact.name}`);
            })
            .catch(e => { console.log(e); })
    })
});

client.initialize();