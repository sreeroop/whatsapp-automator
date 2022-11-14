const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const csv = require("csv-parser");

/*
1) Give group name in GROUP_NAME.
2) put the numbers in contacts.csv in data folder.
3) Run the command "node scripts/BatchAdd.js"
4) Sit back and enjoy
*/


//group name
const GROUP_NAME = "HELLO"
//file which has contacts of users
const INPUT_FILE_PATH = "data/contacts.csv"
//file for writing numbers of users who doesnt have WA account
const ERROR_FILE_PATH = "outputs/error.csv"
//file for writing numbers of users who were failed to add into the group
//Invitation sent to individual users for joining
const FAILED_FILE_PATH = "outputs/failed.csv"

//stores registered numbers
let contacts = [];
//stores numbers failed to add in the group
let failed = [];
//store non registered numbers
let errNos = []
const client = new Client({ authStrategy: new LocalAuth() });


client.on("qr", (qr) => {
    qrcode.generate(qr, { small: true });
});
const isRegistered = async (number) => {
    number_details = await client.getNumberId(number); // get mobile number details
    console.log(number_details);
    if (number_details) {
        contacts.push(number_details?._serialized)
    } else {
        console.log(number, "Mobile number is not registered");
        errNos.push(number)
    }

}
client.on("authenticated", async () => {
    console.log("authed");
    fs.createReadStream(INPUT_FILE_PATH)
        .pipe(csv())
        .on("data", async (data) => {
            const { phone } = data
            const sanitized_number = phone.toString().replace(/[^0-9]/g, ""); // remove unnecessary chars from the number
            let final_number;
            if (sanitized_number.length == 10) {
                final_number = `91${sanitized_number}`; // add 91 before the number here 91 is country code of India
                await isRegistered(final_number)

            } else {
                final_number = `${sanitized_number}`;
                await isRegistered(final_number)
            }
        })

})
client.on("ready", () => {
    client.getChats()
        .then(async (chats) => {
            const group = chats.find((chat) => chat?.name == GROUP_NAME)
            let res = await group.addParticipants(contacts)
            if (res) {
                contacts.forEach(contact => {
                    if (res[contact] == 200) {
                        console.log(`Added ${contact}`);
                    } else {
                        console.log(`Unable to add ${contact}\n`);
                        failed.push(contact)
                    }
                })
            }
        })
        .catch((e) => {
            console.log(e);
        })
        .finally(() => {
            //write not registered numbers to  csv
            fs.writeFile(ERROR_FILE_PATH, 'phone\n', err => { })
            const errorAdding = fs.createWriteStream(ERROR_FILE_PATH, { flags: 'a' })
            errNos.forEach(user => {
                errorAdding.write(`${user}\n`)
            })

            //write failed numbers to  csv
            fs.writeFile(FAILED_FILE_PATH, 'phone\n', err => { })
            const failedAdding = fs.createWriteStream(FAILED_FILE_PATH, { flags: 'a' })
            failed.forEach(user => {
                failedAdding.write(`${user}\n`)
            })
        })
})


client.initialize();

